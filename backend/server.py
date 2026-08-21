from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import Body, FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api_models import (
    ApplyChangeRequest,
    CatalogUpdate,
    ChangeProposalRequest,
    CreateChildVersionRequest,
    GenerateRequest,
    SaveVersionRequest,
    SettingsUpdate,
)
from base_solver import GenerationError, generate_base_timetable
from change_agent import propose_changes
from domain import (
    AppState,
    AppliedChange,
    ChangeEventStatus,
    DateException,
    LessonCell,
    TimetableVersion,
)
from repository import DataFileError, JsonRepository, RevisionConflict
from schedule_service import NoActiveTimetable, create_child_version, resolve_day
from validation import (
    ScheduleValidationError,
    ValidationIssue,
    ValidationReport,
    assert_valid_version,
    rebuild_resource_indexes,
    validate_catalog,
)


DEFAULT_DATA_PATH = Path(__file__).resolve().parent / "data" / "timetable-data.json"
CATALOG_FIELDS = (
    "teachers",
    "classes",
    "subjects",
    "rooms",
    "course_requirements",
    "split_course_blocks",
)


def _encode(value: Any) -> Any:
    return jsonable_encoder(value, by_alias=False)


def _repository(request: Request) -> JsonRepository:
    return request.app.state.repository


def configure_cors(app: FastAPI) -> None:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    frontend_url = os.getenv("FRONTEND_URL")
    if frontend_url and frontend_url not in origins:
        origins.append(frontend_url)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def _raise_if_invalid_catalog(state: AppState) -> None:
    report = validate_catalog(state)
    if not report.valid:
        raise ScheduleValidationError(report)


def _cell_reference_ids(
    cell: Optional[LessonCell],
) -> tuple[Optional[str], Optional[str]]:
    if cell is None:
        return None, None
    if cell.kind == "lesson":
        return cell.requirement_id, None
    return None, cell.split_block_id


def _history_reference_report(state: AppState) -> ValidationReport:
    report = ValidationReport()
    teacher_ids = {item.id for item in state.teachers}
    class_ids = {item.id for item in state.classes}
    requirement_ids = {item.id for item in state.course_requirements}
    block_ids = {item.id for item in state.split_course_blocks}
    split_group_ids = {
        group.id
        for block in state.split_course_blocks
        for group in block.groups
    }
    version_ids = {item.id for item in state.timetable_versions}

    def missing(message: str, *entity_ids: Optional[str]) -> None:
        report.errors.append(
            ValidationIssue(
                code="missing_reference",
                message=message,
                entity_ids=[item for item in entity_ids if item is not None],
            )
        )

    for version in state.timetable_versions:
        if version.parent_version_id and version.parent_version_id not in version_ids:
            missing(
                "Timetable parent references an unknown version",
                version.id,
                version.parent_version_id,
            )

    for change in state.applied_changes:
        if change.event.teacher_id not in teacher_ids:
            missing(
                "Applied change event references an unknown teacher",
                change.id,
                change.event.teacher_id,
            )
        if change.base_version_id not in version_ids:
            missing(
                "Applied change references an unknown base version",
                change.id,
                change.base_version_id,
            )
        if change.new_version_id and change.new_version_id not in version_ids:
            missing(
                "Applied change references an unknown new version",
                change.id,
                change.new_version_id,
            )
        for operation in change.operations:
            for class_id in operation.class_ids:
                if class_id not in class_ids:
                    missing(
                        "Applied change operation references an unknown class",
                        change.id,
                        class_id,
                    )
        for exception in change.date_exceptions:
            for override in exception.cell_overrides:
                if override.class_id not in class_ids:
                    missing(
                        "Applied change override references an unknown class",
                        change.id,
                        override.class_id,
                    )
                for cell in (override.before, override.after):
                    requirement_id, block_id = _cell_reference_ids(cell)
                    if requirement_id and requirement_id not in requirement_ids:
                        missing(
                            "Applied change override references an unknown requirement",
                            change.id,
                            requirement_id,
                        )
                    if block_id and block_id not in block_ids:
                        missing(
                            "Applied change override references an unknown split block",
                            change.id,
                            block_id,
                        )
            for substitution in exception.teacher_substitutions:
                for teacher_id in (
                    substitution.original_teacher_id,
                    substitution.substitute_teacher_id,
                ):
                    if teacher_id not in teacher_ids:
                        missing(
                            "Applied substitution references an unknown teacher",
                            change.id,
                            teacher_id,
                        )
                targets = (
                    requirement_ids
                    if substitution.target_kind == "requirement"
                    else split_group_ids
                )
                if substitution.target_id not in targets:
                    missing(
                        "Applied substitution references an unknown target",
                        change.id,
                        substitution.target_id,
                    )
    return report


def _assert_valid_persisted_state(state: AppState) -> None:
    _raise_if_invalid_catalog(state)
    for version in state.timetable_versions:
        assert_valid_version(state, version)
    history_report = _history_reference_report(state)
    if not history_report.valid:
        raise ScheduleValidationError(history_report)


def _find_version(state: AppState, version_id: str) -> TimetableVersion:
    for version in state.timetable_versions:
        if version.id == version_id:
            return version
    raise HTTPException(status_code=404, detail="timetable version not found")


def _summary(version: TimetableVersion) -> Dict[str, Any]:
    return _encode(
        {
            "id": version.id,
            "name": version.name,
            "effective_from": version.effective_from,
            "parent_version_id": version.parent_version_id,
            "created_at": version.created_at,
            "source_change_event_id": version.source_change_event_id,
        }
    )


def register_routes(app: FastAPI) -> None:
    @app.get("/api/state")
    def get_state(request: Request):
        return _encode(_repository(request).load())

    @app.put("/api/catalog")
    def update_catalog(payload: CatalogUpdate, request: Request):
        def mutation(state: AppState) -> AppState:
            for field in CATALOG_FIELDS:
                setattr(state, field, getattr(payload, field))
            _assert_valid_persisted_state(state)
            return state

        saved = _repository(request).mutate(payload.base_revision, mutation)
        return _encode(saved)

    @app.put("/api/settings")
    def update_settings(payload: SettingsUpdate, request: Request):
        def mutation(state: AppState) -> AppState:
            state.settings = payload.settings
            _assert_valid_persisted_state(state)
            return state

        repository = _repository(request)
        saved = repository.mutate(payload.base_revision, mutation)
        repository.backup_limit = saved.settings.backup_limit
        return _encode(saved)

    @app.post("/api/timetables/generate")
    def generate_timetable(payload: GenerateRequest, request: Request):
        state = _repository(request).load()
        _raise_if_invalid_catalog(state)
        version = generate_base_timetable(
            state,
            name=payload.name,
            effective_from=payload.effective_from,
        )
        return _encode(version)

    @app.post("/api/timetables")
    def save_timetable(payload: SaveVersionRequest, request: Request):
        def mutation(state: AppState) -> AppState:
            if any(item.id == payload.version.id for item in state.timetable_versions):
                raise HTTPException(
                    status_code=409,
                    detail="timetable version id already exists",
                )
            if payload.version.parent_version_id:
                _find_version(state, payload.version.parent_version_id)
            version = rebuild_resource_indexes(state, payload.version)
            assert_valid_version(state, version)
            state.timetable_versions.append(version)
            return state

        saved = _repository(request).mutate(payload.base_revision, mutation)
        return _encode(saved)

    @app.get("/api/timetables")
    def list_timetables(request: Request):
        state = _repository(request).load()
        versions = sorted(
            state.timetable_versions,
            key=lambda item: (item.effective_from, item.created_at, item.id),
            reverse=True,
        )
        return [_summary(version) for version in versions]

    @app.get("/api/timetables/{version_id}")
    def get_timetable(version_id: str, request: Request):
        version = _find_version(_repository(request).load(), version_id)
        return _encode(version)

    @app.post("/api/timetables/{version_id}/versions")
    def create_version(
        version_id: str,
        payload: CreateChildVersionRequest,
        request: Request,
    ):
        def mutation(state: AppState) -> AppState:
            parent = _find_version(state, version_id)
            child = create_child_version(
                state,
                parent,
                name=payload.name,
                effective_from=payload.effective_from,
                class_schedules=payload.class_schedules,
            )
            assert_valid_version(state, child)
            state.timetable_versions.append(child)
            return state

        saved = _repository(request).mutate(payload.base_revision, mutation)
        return _encode(saved)

    @app.delete("/api/timetables/{version_id}")
    def delete_timetable(version_id: str, request: Request):
        repository = _repository(request)
        base_revision = repository.load().revision

        def mutation(state: AppState) -> AppState:
            _find_version(state, version_id)
            referenced = any(
                item.id != version_id and item.parent_version_id == version_id
                for item in state.timetable_versions
            ) or any(
                change.base_version_id == version_id
                or change.new_version_id == version_id
                for change in state.applied_changes
            )
            if referenced:
                raise HTTPException(
                    status_code=409,
                    detail="timetable version is referenced and cannot be deleted",
                )
            state.timetable_versions = [
                item for item in state.timetable_versions if item.id != version_id
            ]
            return state

        saved = repository.mutate(base_revision, mutation)
        return _encode(saved)

    @app.get("/api/backups")
    def list_backups(request: Request):
        backups = []
        for path in _repository(request).list_backups():
            stat = path.stat()
            backups.append(
                {
                    "name": path.name,
                    "size": stat.st_size,
                    "modified_at": datetime.fromtimestamp(
                        stat.st_mtime
                    ).astimezone(),
                }
            )
        return _encode(backups)

    @app.post("/api/backups/{name}/restore")
    def restore_backup(
        name: str,
        request: Request,
        payload: Optional[Dict[str, Any]] = Body(default=None),
    ):
        if not payload or payload.get("confirmed") is not True:
            raise HTTPException(
                status_code=400,
                detail="backup restore requires explicit confirmation",
            )
        repository = _repository(request)
        if name not in {path.name for path in repository.list_backups()}:
            raise HTTPException(status_code=404, detail="backup not found")
        restored = repository.restore_backup(name)
        repository.backup_limit = restored.settings.backup_limit
        return _encode(restored)

    @app.post("/api/change-proposals")
    def create_change_proposals(payload: ChangeProposalRequest, request: Request):
        state = _repository(request).load()
        _raise_if_invalid_catalog(state)
        proposals = propose_changes(state, payload.event)
        if not proposals:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "no_complete_change_plan",
                    "message": "could not find a complete resolution for the change event",
                },
            )
        return {
            "base_revision": state.revision,
            "proposals": [_encode(p) for p in proposals],
        }

    @app.post("/api/changes/apply")
    def apply_change(payload: ApplyChangeRequest, request: Request):
        proposal = payload.proposal
        base_revision = proposal.base_revision

        def mutation(state: AppState) -> AppState:
            _find_version(state, proposal.base_version_id)
            live_proposals = propose_changes(state, proposal.event)
            if not live_proposals:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "code": "proposal_no_longer_valid",
                        "message": "the proposed change is no longer valid against current state",
                    },
                )
            matching = [p for p in live_proposals if p.id == proposal.id or (p.strategy == proposal.strategy and p.explanation == proposal.explanation)]
            if not matching:
                matching = [p for p in live_proposals if len(p.operations) == len(proposal.operations) and len(p.date_exceptions) == len(proposal.date_exceptions)]
            if not matching:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "code": "proposal_tampered_or_invalid",
                        "message": "the proposal does not match any valid plan for the current state",
                    },
                )
            valid_proposal = matching[0]
            new_version_id = None
            if valid_proposal.version_candidate:
                v = rebuild_resource_indexes(state, valid_proposal.version_candidate)
                assert_valid_version(state, v)
                state.timetable_versions.append(v)
                new_version_id = v.id
            event = proposal.event.copy(update={"status": ChangeEventStatus.APPLIED})
            state.change_events.append(event)
            applied = AppliedChange(
                event=event,
                proposal_id=valid_proposal.id,
                base_version_id=proposal.base_version_id,
                strategy=valid_proposal.strategy,
                score=valid_proposal.score,
                new_version_id=new_version_id,
                operations=valid_proposal.operations,
                date_exceptions=valid_proposal.date_exceptions,
            )
            state.applied_changes.append(applied)
            _assert_valid_persisted_state(state)
            return state

        saved = _repository(request).mutate(base_revision, mutation)
        return _encode(saved)

    @app.get("/api/changes")
    def list_applied_changes(request: Request):
        state = _repository(request).load()
        changes = sorted(
            state.applied_changes,
            key=lambda c: c.applied_at,
            reverse=True,
        )
        return _encode(changes)

    @app.get("/api/calendar/day")
    def get_calendar_day(date: str, request: Request):
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=422, detail="invalid date format, expected YYYY-MM-DD")
        state = _repository(request).load()
        try:
            resolved = resolve_day(state, target_date)
        except NoActiveTimetable:
            raise HTTPException(status_code=404, detail="no active timetable for the given date")
        if resolved.version_id is None:
            raise HTTPException(status_code=404, detail="no active timetable for the given date")
        return _encode(resolved)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RevisionConflict)
    async def revision_conflict_handler(
        _request: Request,
        exc: RevisionConflict,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={
                "detail": {
                    "code": "revision_conflict",
                    "base_revision": exc.base_revision,
                    "current_revision": exc.current_revision,
                }
            },
        )

    @app.exception_handler(ScheduleValidationError)
    async def schedule_validation_handler(
        _request: Request,
        exc: ScheduleValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "detail": {
                    "code": "schedule_validation_failed",
                    **_encode(exc.report),
                }
            },
        )

    @app.exception_handler(GenerationError)
    async def generation_error_handler(
        _request: Request,
        exc: GenerationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "detail": {
                    "code": "generation_failed",
                    "diagnostics": _encode(exc.diagnostics),
                }
            },
        )

    @app.exception_handler(DataFileError)
    async def data_file_error_handler(
        _request: Request,
        _exc: DataFileError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=503,
            content={
                "detail": {
                    "code": "data_file_unavailable",
                    "message": "local timetable data is unavailable",
                }
            },
        )

    @app.exception_handler(Exception)
    async def unexpected_error_handler(
        _request: Request,
        _exc: Exception,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={
                "detail": {
                    "code": "internal_server_error",
                    "message": "an unexpected server error occurred",
                }
            },
        )


def create_app(data_path: Optional[Path] = None) -> FastAPI:
    app = FastAPI(title="Local Timetable API")
    app.state.repository = JsonRepository(data_path or DEFAULT_DATA_PATH)
    configure_cors(app)
    register_routes(app)
    register_error_handlers(app)
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

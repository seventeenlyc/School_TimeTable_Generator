import json
from collections import Counter
from datetime import date
from pathlib import Path

from domain import AppState, Slot
from repository import JsonRepository
from sample_15_classes import (
    build_15_class_demo_state,
    install_sample,
    write_sample,
)
from validation import validate_catalog, validate_timetable_version


def test_demo_catalog_shape_and_combinations():
    state = build_15_class_demo_state()
    assert len(state.classes) == 15
    assert len(state.rooms) == 17
    assert len(state.split_course_blocks) == 1

    # Exact combination mapping from spec:
    # 1-4: physics, chemistry, biology
    # 5-6: physics, chemistry, geography
    # 7-8: physics, chemistry, politics
    # 9: physics, politics, geography
    # 10: physics, biology, politics
    # 11-12: history, politics, geography
    # 13: history, geography, biology
    # 14-15: physics, chemistry fixed, geography/politics split block
    class_subject_map = {}
    for req in state.course_requirements:
        class_subject_map.setdefault(req.class_id, set()).add(req.subject_id)

    # All classes must have chinese, math, english, pe, meeting
    common_subjects = {
        "subject-chinese",
        "subject-math",
        "subject-english",
        "subject-pe",
        "subject-meeting",
    }

    expected_academic_electives = {
        "class-1": {"subject-physics", "subject-chemistry", "subject-biology"},
        "class-2": {"subject-physics", "subject-chemistry", "subject-biology"},
        "class-3": {"subject-physics", "subject-chemistry", "subject-biology"},
        "class-4": {"subject-physics", "subject-chemistry", "subject-biology"},
        "class-5": {"subject-physics", "subject-chemistry", "subject-geography"},
        "class-6": {"subject-physics", "subject-chemistry", "subject-geography"},
        "class-7": {"subject-physics", "subject-chemistry", "subject-politics"},
        "class-8": {"subject-physics", "subject-chemistry", "subject-politics"},
        "class-9": {"subject-physics", "subject-politics", "subject-geography"},
        "class-10": {"subject-physics", "subject-biology", "subject-politics"},
        "class-11": {"subject-history", "subject-politics", "subject-geography"},
        "class-12": {"subject-history", "subject-politics", "subject-geography"},
        "class-13": {"subject-history", "subject-geography", "subject-biology"},
        "class-14": {"subject-physics", "subject-chemistry"},
        "class-15": {"subject-physics", "subject-chemistry"},
    }

    for class_id, electives in expected_academic_electives.items():
        assert class_subject_map[class_id] == common_subjects | electives

    # Check split block for class-14 and class-15 with geography in 301 and politics in 302
    split_block = state.split_course_blocks[0]
    assert split_block.source_class_ids == ["class-14", "class-15"]
    assert split_block.periods_per_week == 5
    assert len(split_block.groups) == 2

    geo_group = next(g for g in split_block.groups if g.subject_id == "subject-geography")
    pol_group = next(g for g in split_block.groups if g.subject_id == "subject-politics")

    assert geo_group.room_id == "room-301"
    assert pol_group.room_id == "room-302"


def test_demo_teacher_loads_and_homerooms():
    state = build_15_class_demo_state()
    pe_subject_id = "subject-pe"
    pe_requirements = [
        r for r in state.course_requirements if r.subject_id == pe_subject_id
    ]
    pe_loads = Counter(r.teacher_id for r in pe_requirements)
    assert sorted(pe_loads.values()) == [5, 5, 5]
    assert len(pe_loads) == 3

    # 15 distinct homeroom teachers
    homeroom_teachers = [t for t in state.teachers if t.homeroom_class_id]
    assert len(homeroom_teachers) == 15
    homeroom_classes = {t.homeroom_class_id for t in homeroom_teachers}
    assert len(homeroom_classes) == 15
    assert len({t.id for t in homeroom_teachers}) == 15

    # Each homeroom teacher teaches meeting for their homeroom class
    meeting_reqs = [
        r for r in state.course_requirements if r.subject_id == "subject-meeting"
    ]
    assert len(meeting_reqs) == 15
    teacher_by_id = {t.id: t for t in state.teachers}
    for req in meeting_reqs:
        teacher = teacher_by_id[req.teacher_id]
        assert teacher.homeroom_class_id == req.class_id
        assert req.fixed_slots == [Slot(weekday=0, period=7)]


def test_demo_schedule_invariants_and_validation():
    state = build_15_class_demo_state()
    teacher_by_id = {teacher.id: teacher for teacher in state.teachers}
    assert len(state.timetable_versions) == 1
    version = state.timetable_versions[0]
    assert version.effective_from == date(2026, 9, 1)

    catalog_report = validate_catalog(state)
    assert catalog_report.valid, [e.dict() for e in catalog_report.errors]

    version_report = validate_timetable_version(state, version)
    assert version_report.valid, [e.dict() for e in version_report.errors]

    # Check deterministic legal teacher unavailability
    teachers_with_unavail = [
        t for t in state.teachers if t.weekly_unavailable_slots
    ]
    assert len(teachers_with_unavail) > 0
    # Fixed Monday period index 7 class meeting (period 8 in 1-based) is never blocked
    for t in teachers_with_unavail:
        if t.homeroom_class_id:
            unavail_slots = {(s.weekday, s.period) for s in t.weekly_unavailable_slots}
            assert (0, 7) not in unavail_slots

    split_block_id = state.split_course_blocks[0].id

    for class_obj in state.classes:
        class_id = class_obj.id
        schedule = version.class_schedules[class_id]
        assert len(schedule) == 5  # 5 days

        null_cell_count = 0
        pe_count = 0
        meeting_count = 0

        for weekday_idx, day_schedule in enumerate(schedule):
            assert len(day_schedule) == 8  # 8 periods
            academic_subjects_today = []

            for period_idx, cell in enumerate(day_schedule):
                if cell is None:
                    null_cell_count += 1
                    continue
                if cell.kind == "lesson":
                    req = next(
                        r for r in state.course_requirements if r.id == cell.requirement_id
                    )
                    if req.subject_id == "subject-pe":
                        pe_count += 1
                    elif req.subject_id == "subject-meeting":
                        meeting_count += 1
                        assert weekday_idx == 0 and period_idx == 7
                        teacher = teacher_by_id[req.teacher_id]
                        assert teacher.homeroom_class_id == class_id
                    else:
                        academic_subjects_today.append(req.subject_id)
                elif cell.kind == "split":
                    assert cell.split_block_id == split_block_id
                    academic_subjects_today.append("split-geography-politics")

            # Each class has all six academic subjects every weekday. Math has
            # one extra weekly period, so one day contains a second math lesson.
            assert len(academic_subjects_today) in {6, 7}
            assert len(set(academic_subjects_today)) == 6
            if len(academic_subjects_today) == 7:
                assert academic_subjects_today.count("subject-math") == 2

        # PE exactly twice/week
        assert pe_count == 2
        # Fixed Monday period index 7 meeting exactly once
        assert meeting_count == 1
        # Exactly 6 null cells per five-day week
        assert null_cell_count == 6

    # Split synchronized once/day between class-14 and class-15
    c14_sched = version.class_schedules["class-14"]
    c15_sched = version.class_schedules["class-15"]
    for day in range(5):
        c14_split_periods = [
            p
            for p, cell in enumerate(c14_sched[day])
            if cell and cell.split_block_id == split_block_id
        ]
        c15_split_periods = [
            p
            for p, cell in enumerate(c15_sched[day])
            if cell and cell.split_block_id == split_block_id
        ]
        assert len(c14_split_periods) == 1
        assert len(c15_split_periods) == 1
        assert c14_split_periods == c15_split_periods


def test_builder_serialization_determinism():
    state1 = build_15_class_demo_state()
    state2 = build_15_class_demo_state()

    def neutralize_version_timestamps(state: AppState) -> dict:
        data = json.loads(state.json(by_alias=True))
        for v in data.get("timetableVersions", []):
            v["createdAt"] = "2026-09-01T00:00:00+00:00"
        return data

    assert neutralize_version_timestamps(state1) == neutralize_version_timestamps(state2)


def test_write_sample_utf8_file(tmp_path: Path):
    state = build_15_class_demo_state()
    out_file = tmp_path / "15-class-demo.json"
    write_sample(state, out_file)

    assert out_file.exists()
    content = out_file.read_text(encoding="utf-8")
    loaded = AppState.parse_raw(content)
    assert len(loaded.classes) == 15
    assert len(loaded.rooms) == 17
    assert len(loaded.timetable_versions) == 1


def test_install_sample_increments_revision_and_creates_backup(tmp_path: Path):
    data_path = tmp_path / "timetable-data.json"
    repo = JsonRepository(path=data_path)
    initial_state = repo.load()
    assert initial_state.revision == 0

    state = build_15_class_demo_state()
    installed = install_sample(state, repo)

    assert installed.revision == 1
    assert len(repo.list_backups()) >= 1
    loaded = repo.load()
    assert loaded.revision == 1
    assert len(loaded.classes) == 15
    assert len(loaded.rooms) == 17
    assert len(loaded.timetable_versions) == 1

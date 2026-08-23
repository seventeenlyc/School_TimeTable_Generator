from __future__ import annotations

import argparse
import json
import random
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from base_solver import generate_base_timetable
from domain import (
    AppState,
    CourseRequirement,
    Room,
    SchoolClass,
    Settings,
    Slot,
    SplitCourseBlock,
    SplitCourseGroup,
    Subject,
    Teacher,
)
from repository import JsonRepository
from validation import validate_catalog, validate_timetable_version

DEMO_SEED = 20260822
EFFECTIVE_DATE = date(2026, 9, 1)
TIMETABLE_NAME = "15班测试课表"

_CACHED_DEMO_STATE: Optional[AppState] = None


def _create_raw_demo_state() -> AppState:
    settings = Settings(
        periods_per_day=8,
        working_days=5,
        max_daily_subject_periods=2,
    )

    # 1. Subjects
    subjects = [
        Subject(id="subject-chinese", name="语文"),
        Subject(id="subject-math", name="数学"),
        Subject(id="subject-english", name="英语"),
        Subject(id="subject-physics", name="物理"),
        Subject(id="subject-chemistry", name="化学"),
        Subject(id="subject-biology", name="生物"),
        Subject(id="subject-history", name="历史"),
        Subject(id="subject-geography", name="地理"),
        Subject(id="subject-politics", name="政治"),
        Subject(id="subject-pe", name="体育"),
        Subject(id="subject-meeting", name="班会"),
    ]

    # 2. Rooms: 15 homeroom classrooms + 301, 302
    rooms: List[Room] = []
    for i in range(1, 16):
        rooms.append(
            Room(
                id=f"room-class-{i:02d}",
                name=f"{i}班教室",
            )
        )
    rooms.append(
        Room(
            id="room-301",
            name="301教室",
        )
    )
    rooms.append(
        Room(
            id="room-302",
            name="302教室",
        )
    )

    # 3. Classes: class-1 through class-15
    classes: List[SchoolClass] = []
    for i in range(1, 16):
        classes.append(
            SchoolClass(
                id=f"class-{i}",
                name=f"高一({i})班",
            )
        )

    # 4. Class elective combinations definition
    class_combinations: Dict[str, Tuple[str, ...]] = {
        "class-1": ("physics", "chemistry", "biology"),
        "class-2": ("physics", "chemistry", "biology"),
        "class-3": ("physics", "chemistry", "biology"),
        "class-4": ("physics", "chemistry", "biology"),
        "class-5": ("physics", "chemistry", "geography"),
        "class-6": ("physics", "chemistry", "geography"),
        "class-7": ("physics", "chemistry", "politics"),
        "class-8": ("physics", "chemistry", "politics"),
        "class-9": ("physics", "politics", "geography"),
        "class-10": ("physics", "biology", "politics"),
        "class-11": ("history", "politics", "geography"),
        "class-12": ("history", "politics", "geography"),
        "class-13": ("history", "geography", "biology"),
        "class-14": ("physics", "chemistry"),
        "class-15": ("physics", "chemistry"),
    }

    # Helper: which classes take each subject (excluding split geography/politics for 14-15)
    subject_to_classes: Dict[str, List[str]] = {
        "chinese": [f"class-{i}" for i in range(1, 16)],
        "math": [f"class-{i}" for i in range(1, 16)],
        "english": [f"class-{i}" for i in range(1, 16)],
        "physics": [
            cid for cid, electives in class_combinations.items() if "physics" in electives
        ],
        "chemistry": [
            cid for cid, electives in class_combinations.items() if "chemistry" in electives
        ],
        "biology": [
            cid for cid, electives in class_combinations.items() if "biology" in electives
        ],
        "history": [
            cid for cid, electives in class_combinations.items() if "history" in electives
        ],
        "geography": [
            cid for cid, electives in class_combinations.items() if "geography" in electives
        ],
        "politics": [
            cid for cid, electives in class_combinations.items() if "politics" in electives
        ],
    }

    subj_cn = {
        "chinese": "语文",
        "math": "数学",
        "english": "英语",
        "physics": "物理",
        "chemistry": "化学",
        "biology": "生物",
        "history": "历史",
        "geography": "地理",
        "politics": "政治",
        "pe": "体育",
        "meeting": "班会",
    }

    teachers: List[Teacher] = []
    course_requirements: List[CourseRequirement] = []

    # Map (class_id, subject_id) -> teacher_id
    assigned_teacher_map: Dict[Tuple[str, str], str] = {}
    teacher_assignments_map: Dict[str, List[str]] = {}

    # 4a. Create academic teachers by adjacent-class groups for stable, readable
    # sample data. This grouping is not a product restriction.
    for subj_key, class_list in subject_to_classes.items():
        subject_id = f"subject-{subj_key}"
        # Group adjacent classes to keep the generated sample deterministic.
        for idx in range(0, len(class_list), 2):
            pair = class_list[idx : idx + 2]
            teacher_idx = (idx // 2) + 1
            teacher_id = f"teacher-{subj_key}-{teacher_idx:02d}"
            teacher_name = f"{subj_cn[subj_key]}老师{teacher_idx:02d}"

            teacher = Teacher(
                id=teacher_id,
                name=teacher_name,
                qualified_subject_ids=[subject_id],
                weekly_unavailable_slots=[],
                teaching_assignment_ids=[],
                homeroom_class_id=None,
                main_subject_id=None,
            )
            teachers.append(teacher)
            teacher_assignments_map[teacher_id] = []

            for cid in pair:
                req_id = f"req-{subj_key}-{cid}"
                assigned_teacher_map[(cid, subject_id)] = teacher_id
                teacher_assignments_map[teacher_id].append(req_id)
                course_requirements.append(
                    CourseRequirement(
                        id=req_id,
                        class_id=cid,
                        subject_id=subject_id,
                        teacher_id=teacher_id,
                        periods_per_week=(6 if subj_key == "math" else 5),
                        room_id=f"room-class-{int(cid.split('-')[1]):02d}",
                        consecutive_periods=1,
                        fixed_slots=[],
                    )
                )

    # 4b. Create split block teachers for geography and politics (classes 14 & 15)
    split_geo_teacher_id = "teacher-split-geography"
    split_geo_teacher = Teacher(
        id=split_geo_teacher_id,
        name="走班地理老师",
        qualified_subject_ids=["subject-geography"],
        weekly_unavailable_slots=[],
        teaching_assignment_ids=[],
        homeroom_class_id=None,
        main_subject_id=None,
    )
    teachers.append(split_geo_teacher)
    teacher_assignments_map[split_geo_teacher_id] = []

    split_pol_teacher_id = "teacher-split-politics"
    split_pol_teacher = Teacher(
        id=split_pol_teacher_id,
        name="走班政治老师",
        qualified_subject_ids=["subject-politics"],
        weekly_unavailable_slots=[],
        teaching_assignment_ids=[],
        homeroom_class_id=None,
        main_subject_id=None,
    )
    teachers.append(split_pol_teacher)
    teacher_assignments_map[split_pol_teacher_id] = []

    split_block = SplitCourseBlock(
        id="split-geo-pol-14-15",
        name="14-15班地理政治走班",
        source_class_ids=["class-14", "class-15"],
        periods_per_week=5,
        groups=[
            SplitCourseGroup(
                id="group-geography",
                subject_id="subject-geography",
                teacher_id=split_geo_teacher_id,
                room_id="room-301",
            ),
            SplitCourseGroup(
                id="group-politics",
                subject_id="subject-politics",
                teacher_id=split_pol_teacher_id,
                room_id="room-302",
            ),
        ],
    )

    # 4c. Create 3 PE teachers serving 5 classes each
    pe_classes_distribution = [
        [f"class-{i}" for i in range(1, 6)],
        [f"class-{i}" for i in range(6, 11)],
        [f"class-{i}" for i in range(11, 16)],
    ]
    for idx, pe_classes in enumerate(pe_classes_distribution, start=1):
        teacher_id = f"teacher-pe-{idx:02d}"
        teacher_name = f"体育老师{idx:02d}"
        teacher = Teacher(
            id=teacher_id,
            name=teacher_name,
            qualified_subject_ids=["subject-pe"],
            weekly_unavailable_slots=[],
            teaching_assignment_ids=[],
            homeroom_class_id=None,
            main_subject_id=None,
        )
        teachers.append(teacher)
        teacher_assignments_map[teacher_id] = []

        for cid in pe_classes:
            req_id = f"req-pe-{cid}"
            teacher_assignments_map[teacher_id].append(req_id)
            course_requirements.append(
                CourseRequirement(
                    id=req_id,
                    class_id=cid,
                    subject_id="subject-pe",
                    teacher_id=teacher_id,
                    periods_per_week=2,
                    room_id=None,  # PE does not bind room
                    consecutive_periods=1,
                    fixed_slots=[],
                )
            )

    # 4d. Choose 15 distinct homeroom teachers from academic teachers
    homeroom_assignments = [
        ("class-1", "subject-chinese"),
        ("class-2", "subject-math"),
        ("class-3", "subject-english"),
        ("class-4", "subject-physics"),
        ("class-5", "subject-chemistry"),
        ("class-6", "subject-geography"),
        ("class-7", "subject-chinese"),
        ("class-8", "subject-math"),
        ("class-9", "subject-english"),
        ("class-10", "subject-biology"),
        ("class-11", "subject-history"),
        ("class-12", "subject-politics"),
        ("class-13", "subject-chinese"),
        ("class-14", "subject-math"),
        ("class-15", "subject-english"),
    ]

    teacher_by_id = {t.id: t for t in teachers}
    selected_homeroom_teacher_ids = set()

    for cid, subj_id in homeroom_assignments:
        tid = assigned_teacher_map[(cid, subj_id)]
        assert tid not in selected_homeroom_teacher_ids, f"Duplicate homeroom teacher: {tid}"
        selected_homeroom_teacher_ids.add(tid)

        t = teacher_by_id[tid]
        t.homeroom_class_id = cid
        t.main_subject_id = subj_id
        if "subject-meeting" not in t.qualified_subject_ids:
            t.qualified_subject_ids.append("subject-meeting")

        meeting_req_id = f"req-meeting-{cid}"
        teacher_assignments_map[tid].append(meeting_req_id)
        course_requirements.append(
            CourseRequirement(
                id=meeting_req_id,
                class_id=cid,
                subject_id="subject-meeting",
                teacher_id=tid,
                periods_per_week=1,
                room_id=f"room-class-{int(cid.split('-')[1]):02d}",
                consecutive_periods=1,
                fixed_slots=[Slot(weekday=0, period=7)],
            )
        )

    # Update teaching_assignment_ids on all teachers
    for t in teachers:
        t.teaching_assignment_ids = teacher_assignments_map.get(t.id, [])

    # 4e. Add deterministic teacher unavailability using seed 20260822
    # Select ~1/3 of teachers, 1-3 unavailable slots each, avoiding (0, 7) for homeroom teachers
    rng = random.Random(DEMO_SEED)
    all_possible_slots = [
        (day, period)
        for day in range(settings.working_days)
        for period in range(settings.periods_per_day)
    ]

    teacher_candidates = list(teachers)
    # Sort for absolute determinism
    teacher_candidates.sort(key=lambda x: x.id)

    num_unavail = len(teacher_candidates) // 3
    selected_unavail_teachers = rng.sample(teacher_candidates, num_unavail)

    for t in selected_unavail_teachers:
        count = rng.randint(1, 3)
        available_slots = list(all_possible_slots)
        if t.homeroom_class_id:
            if (0, 7) in available_slots:
                available_slots.remove((0, 7))
        chosen_slots = rng.sample(available_slots, count)
        chosen_slots.sort()
        t.weekly_unavailable_slots = [
            Slot(weekday=day, period=period) for day, period in chosen_slots
        ]

    state = AppState(
        schema_version=1,
        revision=0,
        settings=settings,
        subjects=subjects,
        rooms=rooms,
        teachers=teachers,
        classes=classes,
        course_requirements=course_requirements,
        split_course_blocks=[split_block],
        timetable_versions=[],
    )

    # 5. Validate catalog
    cat_report = validate_catalog(state)
    if not cat_report.valid:
        raise ValueError(
            f"Demo catalog validation failed: {[e.dict() for e in cat_report.errors]}"
        )

    # 6. Generate base timetable
    version = generate_base_timetable(state, TIMETABLE_NAME, EFFECTIVE_DATE)

    # 7. Validate generated timetable version
    ver_report = validate_timetable_version(state, version)
    if not ver_report.valid:
        raise ValueError(
            f"Demo timetable version validation failed: {[e.dict() for e in ver_report.errors]}"
        )

    state.timetable_versions.append(version)
    return state


def build_15_class_demo_state() -> AppState:
    global _CACHED_DEMO_STATE
    if _CACHED_DEMO_STATE is None:
        _CACHED_DEMO_STATE = _create_raw_demo_state()
    return _CACHED_DEMO_STATE.copy(deep=True)


def write_sample(state: AppState, output_path: Path) -> None:
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(
        json.loads(state.json(by_alias=True)),
        indent=2,
        ensure_ascii=False,
    )
    output_path.write_text(payload + "\n", encoding="utf-8")


def install_sample(state: AppState, repository: JsonRepository) -> AppState:
    current = repository.load()
    cloned_state = state.copy(deep=True)
    cloned_state.revision = current.revision + 1
    return repository.save(cloned_state, base_revision=current.revision)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate and install the 15-class demo timetable dataset."
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        default="backend/samples/15-class-demo.json",
        help="Path to write the demo dataset JSON file (default: backend/samples/15-class-demo.json)",
    )
    parser.add_argument(
        "--install",
        nargs="?",
        const="backend/data/timetable-data.json",
        default=None,
        help="Install demo dataset into the repository data path (default when flag given without path: backend/data/timetable-data.json)",
    )

    args = parser.parse_args()

    print("Building 15-class demo timetable state...")
    demo_state = build_15_class_demo_state()

    out_path = Path(args.output)
    print(f"Writing sample to {out_path}...")
    write_sample(demo_state, out_path)
    print("Sample written successfully.")

    if args.install is not None:
        install_path = Path(args.install)
        print(f"Installing sample into repository at {install_path}...")
        repo = JsonRepository(path=install_path)
        installed = install_sample(demo_state, repo)
        print(f"Installed demo dataset successfully (revision: {installed.revision}).")


if __name__ == "__main__":
    main()

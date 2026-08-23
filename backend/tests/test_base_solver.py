from datetime import date

import pytest

from base_solver import GenerationError, generate_base_timetable
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
from factories import make_generation_state, make_impossible_room_state, make_two_class_state
from validation import validate_timetable_version


def split_slots(version, class_id, block_id):
    return {
        (day, period)
        for day, row in enumerate(version.class_schedules[class_id])
        for period, cell in enumerate(row)
        if cell is not None and cell.split_block_id == block_id
    }


def make_single_class_subject_state(subject_name, periods_per_week, fixed_slots=None):
    subject_id = f"subject-{subject_name}"
    requirement_id = f"requirement-{subject_name}"
    teacher_id = f"teacher-{subject_name}"
    return AppState(
        settings=Settings(periods_per_day=3, max_daily_subject_periods=2),
        classes=[SchoolClass(id="class-1", name="1班")],
        subjects=[Subject(id=subject_id, name=subject_name)],
        teachers=[
            Teacher(
                id=teacher_id,
                name=f"{subject_name}教师",
                qualified_subject_ids=[subject_id],
                teaching_assignment_ids=[requirement_id],
            )
        ],
        course_requirements=[
            CourseRequirement(
                id=requirement_id,
                class_id="class-1",
                subject_id=subject_id,
                teacher_id=teacher_id,
                periods_per_week=periods_per_week,
                fixed_slots=fixed_slots or [],
            )
        ],
    )


def make_core_subject_state(
    math_periods=5,
    chinese_periods=5,
    chinese_fixed_slots=None,
    math_fixed_slots=None,
):
    subjects = [
        Subject(id="subject-chinese", name="语文"),
        Subject(id="subject-math", name="数学"),
        Subject(id="subject-english", name="英语"),
    ]
    periods = {"语文": chinese_periods, "数学": math_periods, "英语": 5}
    fixed = {"语文": chinese_fixed_slots or [], "数学": math_fixed_slots or [], "英语": []}
    teachers = []
    requirements = []
    for subject in subjects:
        teacher_id = f"teacher-{subject.id}"
        requirement_id = f"requirement-{subject.id}"
        teachers.append(
            Teacher(
                id=teacher_id,
                name=f"{subject.name}教师",
                qualified_subject_ids=[subject.id],
                teaching_assignment_ids=[requirement_id],
            )
        )
        requirements.append(
            CourseRequirement(
                id=requirement_id,
                class_id="class-1",
                subject_id=subject.id,
                teacher_id=teacher_id,
                periods_per_week=periods[subject.name],
                fixed_slots=fixed[subject.name],
            )
        )
    return AppState(
        settings=Settings(periods_per_day=4, max_daily_subject_periods=2),
        classes=[SchoolClass(id="class-1", name="1班")],
        subjects=subjects,
        teachers=teachers,
        course_requirements=requirements,
    )


def test_generator_meets_weekly_counts_and_unavailability():
    state = make_generation_state()
    version = generate_base_timetable(state, "2026秋季", date(2026, 9, 1))
    report = validate_timetable_version(state, version)
    assert report.valid, report.errors
    unavailable = {
        (slot.weekday, slot.period)
        for slot in state.teachers[0].weekly_unavailable_slots
    }
    assert all(
        version.class_schedules["class-1"][day][period] is None
        or version.class_schedules["class-1"][day][period].requirement_id
        != "req-class1-math"
        for day, period in unavailable
    )


def test_generator_places_split_blocks_in_lockstep():
    state = make_generation_state()
    version = generate_base_timetable(state, "2026秋季", date(2026, 9, 1))
    class_1_slots = split_slots(
        version,
        "class-1",
        "split-geography-politics",
    )
    class_2_slots = split_slots(
        version,
        "class-2",
        "split-geography-politics",
    )
    assert class_1_slots == class_2_slots


def test_generator_returns_diagnostics_for_impossible_room_use():
    state = make_impossible_room_state()
    with pytest.raises(GenerationError) as exc:
        generate_base_timetable(state, "冲突", date(2026, 9, 1))
    assert "room_capacity" in {
        item.code for item in exc.value.diagnostics
    }


def test_generator_respects_fixed_course_requirement_slots():
    state, _ = make_two_class_state()
    req = next(r for r in state.course_requirements if r.id == "req-class1-math")
    req.fixed_slots = [Slot(weekday=1, period=2)]
    version = generate_base_timetable(state, "2026秋季", date(2026, 9, 1))
    report = validate_timetable_version(state, version)
    assert report.valid, report.errors
    cell = version.class_schedules["class-1"][1][2]
    assert cell is not None and cell.requirement_id == "req-class1-math"


def test_generator_limits_split_block_daily_frequency():
    state, _ = make_two_class_state()
    state.settings.max_daily_subject_periods = 1
    split_block = state.split_course_blocks[0]
    split_block.periods_per_week = 5
    state.course_requirements = [
        r for r in state.course_requirements
        if r.subject_id not in {"subject-geography", "subject-politics"}
    ]
    version = generate_base_timetable(state, "2026秋季", date(2026, 9, 1))
    report = validate_timetable_version(state, version)
    assert report.valid, report.errors
    for day in range(state.settings.working_days):
        day_splits = [
            cell for cell in version.class_schedules["class-1"][day]
            if cell is not None and cell.split_block_id == split_block.id
        ]
        assert len(day_splits) <= 1


def test_generator_rejects_a_core_subject_missing_from_one_weekday():
    state = make_core_subject_state(
        chinese_fixed_slots=[
            Slot(weekday=0, period=0),
            Slot(weekday=0, period=1),
            Slot(weekday=1, period=0),
            Slot(weekday=2, period=0),
            Slot(weekday=3, period=0),
        ],
    )

    with pytest.raises(GenerationError) as exc:
        generate_base_timetable(state, "五天制", date(2026, 9, 1))

    assert "daily_required_subject" in {
        item.code for item in exc.value.diagnostics
    }


def test_generator_rejects_two_periods_of_one_elective_subject_in_a_day():
    state = make_single_class_subject_state(
        "物理",
        periods_per_week=2,
        fixed_slots=[Slot(weekday=0, period=0), Slot(weekday=0, period=1)],
    )

    with pytest.raises(GenerationError):
        generate_base_timetable(state, "选科单日限制", date(2026, 9, 1))


def test_generator_allows_two_math_periods_in_one_day():
    state = make_core_subject_state(
        math_periods=6,
        math_fixed_slots=[Slot(weekday=0, period=0), Slot(weekday=0, period=1)],
    )

    version = generate_base_timetable(state, "数学双课", date(2026, 9, 1))
    daily_counts = [
        sum(
            cell is not None
            and cell.requirement_id == "requirement-subject-math"
            for cell in day
        )
        for day in version.class_schedules["class-1"]
    ]
    assert sorted(daily_counts) == [1, 1, 1, 1, 2]


def test_generator_rejects_two_chinese_periods_in_one_day():
    state = make_core_subject_state(
        chinese_periods=6,
        chinese_fixed_slots=[Slot(weekday=0, period=0), Slot(weekday=0, period=1)],
    )

    with pytest.raises(GenerationError):
        generate_base_timetable(state, "语文单日限制", date(2026, 9, 1))


def test_elective_limit_combines_normal_and_split_courses():
    state = make_single_class_subject_state("物理", periods_per_week=5)
    state.classes.append(SchoolClass(id="class-2", name="2班"))
    state.subjects.append(Subject(id="subject-geography", name="地理"))
    state.rooms.extend(
        [Room(id="room-physics", name="物理教室"), Room(id="room-geography", name="地理教室")]
    )
    state.teachers.extend(
        [
            Teacher(
                id="teacher-split-physics",
                name="走班物理教师",
                qualified_subject_ids=["subject-物理"],
            ),
            Teacher(
                id="teacher-split-geography",
                name="走班地理教师",
                qualified_subject_ids=["subject-geography"],
            ),
        ]
    )
    state.split_course_blocks.append(
        SplitCourseBlock(
            id="split-physics-geography",
            name="物理地理走班",
            source_class_ids=["class-1", "class-2"],
            periods_per_week=1,
            groups=[
                SplitCourseGroup(
                    id="group-physics",
                    subject_id="subject-物理",
                    teacher_id="teacher-split-physics",
                    room_id="room-physics",
                ),
                SplitCourseGroup(
                    id="group-geography",
                    subject_id="subject-geography",
                    teacher_id="teacher-split-geography",
                    room_id="room-geography",
                ),
            ],
        )
    )

    with pytest.raises(GenerationError):
        generate_base_timetable(state, "选科合并限次", date(2026, 9, 1))

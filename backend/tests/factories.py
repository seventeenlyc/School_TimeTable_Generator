from datetime import date

from domain import (
    AppliedChange,
    AppState,
    ChangeEvent,
    ChangeEventKind,
    ChangeEventStatus,
    CourseRequirement,
    DateException,
    LessonCell,
    ProposalScore,
    Room,
    SchoolClass,
    Settings,
    Slot,
    SplitCourseBlock,
    SplitCourseGroup,
    Subject,
    Teacher,
    TeacherSubstitution,
    TimetableVersion,
)
from validation import rebuild_resource_indexes


WORKING_DAYS = 6
PERIODS_PER_DAY = 4


def _empty_schedule():
    return [
        [None for _ in range(PERIODS_PER_DAY)]
        for _ in range(WORKING_DAYS)
    ]


def make_two_class_state():
    teachers = [
        Teacher(
            id="teacher-zhang",
            name="张老师",
            qualified_subject_ids=["subject-geography"],
        ),
        Teacher(
            id="teacher-wang",
            name="王老师",
            qualified_subject_ids=["subject-politics"],
        ),
        Teacher(
            id="teacher-li",
            name="李老师",
            qualified_subject_ids=["subject-math"],
            teaching_assignment_ids=[
                "req-class1-math",
                "req-class2-math-same-teacher",
            ],
        ),
        Teacher(
            id="teacher-chen",
            name="陈老师",
            qualified_subject_ids=["subject-chinese"],
            teaching_assignment_ids=[
                "req-class1-chinese",
                "req-class2-chinese",
            ],
        ),
    ]
    rooms = [
        Room(id="room-301", name="301教室"),
        Room(id="room-302", name="302教室"),
    ]
    requirements = [
        CourseRequirement(
            id="req-class1-math",
            class_id="class-1",
            subject_id="subject-math",
            teacher_id="teacher-li",
            room_id="room-301",
            periods_per_week=2,
        ),
        CourseRequirement(
            id="req-class2-math-same-teacher",
            class_id="class-2",
            subject_id="subject-math",
            teacher_id="teacher-li",
            room_id="room-301",
            periods_per_week=2,
        ),
        CourseRequirement(
            id="req-class1-chinese",
            class_id="class-1",
            subject_id="subject-chinese",
            teacher_id="teacher-chen",
            periods_per_week=2,
        ),
        CourseRequirement(
            id="req-class2-chinese",
            class_id="class-2",
            subject_id="subject-chinese",
            teacher_id="teacher-chen",
            periods_per_week=2,
        ),
    ]
    block = SplitCourseBlock(
        id="split-geography-politics",
        name="地理/政治走班块",
        source_class_ids=["class-1", "class-2"],
        periods_per_week=1,
        groups=[
            SplitCourseGroup(
                id="split-group-geography",
                subject_id="subject-geography",
                teacher_id="teacher-zhang",
                room_id="room-301",
            ),
            SplitCourseGroup(
                id="split-group-politics",
                subject_id="subject-politics",
                teacher_id="teacher-wang",
                room_id="room-302",
            ),
        ],
    )
    version = TimetableVersion(
        id="version-1",
        name="测试课表",
        effective_from=date(2026, 9, 1),
        class_schedules={
            "class-1": _empty_schedule(),
            "class-2": _empty_schedule(),
        },
        teacher_schedules={teacher.id: _empty_schedule() for teacher in teachers},
        room_schedules={room.id: _empty_schedule() for room in rooms},
    )
    state = AppState(
        settings=Settings(periods_per_day=PERIODS_PER_DAY),
        teachers=teachers,
        classes=[
            SchoolClass(id="class-1", name="1班"),
            SchoolClass(id="class-2", name="2班"),
        ],
        subjects=[
            Subject(id="subject-chinese", name="语文"),
            Subject(id="subject-math", name="数学"),
            Subject(id="subject-geography", name="地理"),
            Subject(id="subject-politics", name="政治"),
        ],
        rooms=rooms,
        course_requirements=requirements,
        split_course_blocks=[block],
        timetable_versions=[version],
    )
    return state, version


def place_lesson(version, class_id, weekday, period, requirement_id):
    version.class_schedules[class_id][weekday][period] = LessonCell(
        kind="lesson",
        requirement_id=requirement_id,
    )


def place_split(version, block, weekday, period):
    for class_id in block.source_class_ids:
        version.class_schedules[class_id][weekday][period] = LessonCell(
            kind="split",
            split_block_id=block.id,
        )


def make_generation_state():
    state, _ = make_two_class_state()
    math_teacher = next(
        teacher for teacher in state.teachers if teacher.id == "teacher-li"
    )
    math_teacher.weekly_unavailable_slots = [Slot(weekday=0, period=0)]
    state.teachers = [
        math_teacher,
        *(teacher for teacher in state.teachers if teacher.id != math_teacher.id),
    ]
    state.timetable_versions = []
    return state


def make_impossible_room_state():
    room_id = "room-shared"
    requirements = [
        CourseRequirement(
            id="req-class1-math",
            class_id="class-1",
            subject_id="subject-math",
            teacher_id="teacher-li",
            room_id=room_id,
            periods_per_week=6,
        ),
        CourseRequirement(
            id="req-class2-chinese",
            class_id="class-2",
            subject_id="subject-chinese",
            teacher_id="teacher-chen",
            room_id=room_id,
            periods_per_week=6,
        ),
    ]
    return AppState(
        settings=Settings(periods_per_day=1),
        teachers=[
            Teacher(
                id="teacher-li",
                name="Li",
                qualified_subject_ids=["subject-math"],
                teaching_assignment_ids=["req-class1-math"],
            ),
            Teacher(
                id="teacher-chen",
                name="Chen",
                qualified_subject_ids=["subject-chinese"],
                teaching_assignment_ids=["req-class2-chinese"],
            ),
        ],
        classes=[
            SchoolClass(id="class-1", name="Class 1"),
            SchoolClass(id="class-2", name="Class 2"),
        ],
        subjects=[
            Subject(id="subject-math", name="Math"),
            Subject(id="subject-chinese", name="Chinese"),
        ],
        rooms=[Room(id=room_id, name="Shared room")],
        course_requirements=requirements,
    )


def make_versioned_state():
    state, version = make_two_class_state()
    place_lesson(version, "class-1", 0, 0, "req-class1-math")
    place_lesson(version, "class-2", 0, 1, "req-class2-math-same-teacher")
    place_lesson(version, "class-1", 0, 2, "req-class1-chinese")
    place_lesson(version, "class-2", 0, 3, "req-class2-chinese")
    place_lesson(version, "class-1", 1, 0, "req-class1-math")
    place_lesson(version, "class-2", 1, 1, "req-class2-math-same-teacher")
    place_lesson(version, "class-1", 1, 2, "req-class1-chinese")
    place_lesson(version, "class-2", 1, 3, "req-class2-chinese")
    place_split(version, state.split_course_blocks[0], 2, 0)

    version.id = "version-before"
    version.effective_from = date(2026, 9, 1)
    first = rebuild_resource_indexes(state, version)
    second = first.copy(
        deep=True,
        update={
            "id": "version-after",
            "name": "Second version",
            "effective_from": date(2026, 9, 7),
            "parent_version_id": first.id,
        },
    )
    state.timetable_versions = [second, first]
    return state, first, second


def make_state_with_substitution_exception():
    exception_date = date(2026, 9, 8)
    requirement = CourseRequirement(
        id="req-class1-math",
        class_id="class-1",
        subject_id="subject-math",
        teacher_id="teacher-original",
        periods_per_week=1,
        room_id="room-101",
    )
    state = AppState(
        settings=Settings(periods_per_day=PERIODS_PER_DAY),
        teachers=[
            Teacher(
                id="teacher-original",
                name="Original teacher",
                qualified_subject_ids=["subject-math"],
                teaching_assignment_ids=[requirement.id],
            ),
            Teacher(
                id="teacher-substitute",
                name="Substitute teacher",
                qualified_subject_ids=["subject-math"],
            ),
        ],
        classes=[SchoolClass(id="class-1", name="Class 1")],
        subjects=[Subject(id="subject-math", name="Math")],
        rooms=[Room(id="room-101", name="Room 101")],
        course_requirements=[requirement],
    )
    version = TimetableVersion(
        id="version-base",
        name="Base version",
        effective_from=date(2026, 9, 1),
        class_schedules={"class-1": _empty_schedule()},
    )
    place_lesson(version, "class-1", 1, 0, requirement.id)
    version = rebuild_resource_indexes(state, version)
    state.timetable_versions = [version]
    state.applied_changes = [
        AppliedChange(
            id="change-substitution",
            event=ChangeEvent(
                id="event-absence",
                kind=ChangeEventKind.ABSENCE,
                teacher_id="teacher-original",
                start_date=exception_date,
                end_date=exception_date,
                status=ChangeEventStatus.PROCESSED,
            ),
            proposal_id="proposal-substitution",
            base_version_id=version.id,
            strategy="same-slot substitution",
            score=ProposalScore(
                strategy_tier=0,
                changed_cells=0,
                affected_classes=1,
                affected_teachers=2,
                moved_split_blocks=0,
                slot_distance=0,
            ),
            operations=[],
            date_exceptions=[
                DateException(
                    date=exception_date,
                    teacher_substitutions=[
                        TeacherSubstitution(
                            date=exception_date,
                            period=0,
                            target_kind="requirement",
                            target_id=requirement.id,
                            original_teacher_id="teacher-original",
                            substitute_teacher_id="teacher-substitute",
                        )
                    ],
                )
            ],
        )
    ]
    return state

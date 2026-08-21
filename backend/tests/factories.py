from datetime import date

from domain import (
    AppState,
    CourseRequirement,
    LessonCell,
    Room,
    SchoolClass,
    Settings,
    SplitCourseBlock,
    SplitCourseGroup,
    Subject,
    Teacher,
    TimetableVersion,
)


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

from datetime import date, timedelta
from pathlib import Path

from fastapi.testclient import TestClient

from domain import (
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
from server import create_app


def test_smoke_end_to_end_workflow(tmp_path: Path):
    # -------------------------------------------------------------------------
    # 1. 保存一份可生成的完整目录，必须含 1班/2班以及“地理/政治”同步走班块
    #    （两个来源班同一时间、地理张老师301、政治王老师302），并且提供同科目空闲代课教师。
    # -------------------------------------------------------------------------
    data_file = tmp_path / "smoke-state.json"
    app = create_app(data_file)
    client = TestClient(app)

    # 初始化 settings (4 slots/day, 5 working days)
    settings = Settings(periods_per_day=4, working_days=5)
    resp = client.put("/api/settings", json={"base_revision": 0, "settings": settings.dict()})
    assert resp.status_code == 200, resp.text
    state_data = resp.json()
    rev = state_data["revision"]

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
            teaching_assignment_ids=["req-class1-math"],
        ),
        Teacher(
            id="teacher-li2",
            name="李老师2",
            qualified_subject_ids=["subject-math"],
            teaching_assignment_ids=["req-class2-math"],
        ),
        Teacher(
            id="teacher-chen",
            name="陈老师",
            qualified_subject_ids=["subject-chinese"],
            teaching_assignment_ids=["req-class1-chinese"],
        ),
        Teacher(
            id="teacher-chen2",
            name="陈老师2",
            qualified_subject_ids=["subject-chinese"],
            teaching_assignment_ids=["req-class2-chinese"],
        ),
        Teacher(
            id="teacher-english",
            name="英语老师",
            qualified_subject_ids=["subject-english"],
            teaching_assignment_ids=["req-class1-english"],
        ),
        Teacher(
            id="teacher-english2",
            name="英语老师2",
            qualified_subject_ids=["subject-english"],
            teaching_assignment_ids=["req-class2-english"],
        ),
        # 提供同科目空闲代课教师（未分配课程，或者有空闲）
        Teacher(
            id="teacher-sub-math",
            name="数学备用代课老师",
            qualified_subject_ids=["subject-math"],
        ),
        Teacher(
            id="teacher-sub-chinese",
            name="语文备用代课老师",
            qualified_subject_ids=["subject-chinese"],
        ),
        Teacher(
            id="teacher-sub-geography",
            name="地理备用代课老师",
            qualified_subject_ids=["subject-geography"],
        ),
        Teacher(
            id="teacher-sub-politics",
            name="政治备用代课老师",
            qualified_subject_ids=["subject-politics"],
        ),
    ]

    classes = [
        SchoolClass(id="class-1", name="1班"),
        SchoolClass(id="class-2", name="2班"),
    ]

    subjects = [
        Subject(id="subject-chinese", name="语文"),
        Subject(id="subject-math", name="数学"),
        Subject(id="subject-english", name="英语"),
        Subject(id="subject-geography", name="地理"),
        Subject(id="subject-politics", name="政治"),
    ]

    rooms = [
        Room(id="room-301", name="301教室"),
        Room(id="room-302", name="302教室"),
    ]

    course_requirements = [
        CourseRequirement(
            id="req-class1-math",
            class_id="class-1",
            subject_id="subject-math",
            teacher_id="teacher-li",
            periods_per_week=5,
            consecutive_periods=1,
            fixed_slots=[Slot(weekday=0, period=0)],
        ),
        CourseRequirement(
            id="req-class1-chinese",
            class_id="class-1",
            subject_id="subject-chinese",
            teacher_id="teacher-chen",
            periods_per_week=5,
            consecutive_periods=1,
            fixed_slots=[Slot(weekday=0, period=1)],
        ),
        CourseRequirement(
            id="req-class2-math",
            class_id="class-2",
            subject_id="subject-math",
            teacher_id="teacher-li2",
            periods_per_week=5,
            consecutive_periods=1,
            fixed_slots=[
                Slot(weekday=1, period=0),
                Slot(weekday=2, period=0),
                Slot(weekday=3, period=0),
            ],
        ),
        CourseRequirement(
            id="req-class2-chinese",
            class_id="class-2",
            subject_id="subject-chinese",
            teacher_id="teacher-chen2",
            periods_per_week=5,
            consecutive_periods=1,
            fixed_slots=[
                Slot(weekday=1, period=1),
                Slot(weekday=2, period=1),
                Slot(weekday=3, period=1),
            ],
        ),
        CourseRequirement(
            id="req-class1-english",
            class_id="class-1",
            subject_id="subject-english",
            teacher_id="teacher-english",
            periods_per_week=5,
            consecutive_periods=1,
        ),
        CourseRequirement(
            id="req-class2-english",
            class_id="class-2",
            subject_id="subject-english",
            teacher_id="teacher-english2",
            periods_per_week=5,
            consecutive_periods=1,
        ),
    ]

    split_course_blocks = [
        SplitCourseBlock(
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
        ),
    ]

    catalog_payload = {
        "base_revision": rev,
        "teachers": [t.dict() for t in teachers],
        "classes": [c.dict() for c in classes],
        "subjects": [s.dict() for s in subjects],
        "rooms": [r.dict() for r in rooms],
        "course_requirements": [r.dict() for r in course_requirements],
        "split_course_blocks": [b.dict() for b in split_course_blocks],
    }

    resp = client.put("/api/catalog", json=catalog_payload)
    assert resp.status_code == 200, resp.text
    rev = resp.json()["revision"]

    # -------------------------------------------------------------------------
    # 2. 通过 POST /api/timetables/generate 生成预览，并通过 POST /api/timetables 保存基础课表
    # -------------------------------------------------------------------------
    effective_from = "2026-09-01"  # 2026-09-01 is Tuesday (weekday 1)
    gen_resp = client.post(
        "/api/timetables/generate",
        json={"name": "2026秋季学期课表", "effective_from": effective_from},
    )
    assert gen_resp.status_code == 200, gen_resp.text
    preview = gen_resp.json()
    assert preview["id"]
    assert "class-1" in preview["class_schedules"]
    assert "class-2" in preview["class_schedules"]

    save_resp = client.post(
        "/api/timetables",
        json={"base_revision": rev, "version": preview},
    )
    assert save_resp.status_code == 200, save_resp.text
    saved_state = save_resp.json()
    rev = saved_state["revision"]
    assert len(saved_state["timetable_versions"]) == 1
    base_version_id = saved_state["timetable_versions"][0]["id"]

    # -------------------------------------------------------------------------
    # 3. 创建 busy 事件：选择生成课表中能进行班内换课的实际日期/节次；
    #    断言返回的首选方案 strategy == "busy_class_swap"，应用该方案，
    #    再通过 /api/calendar/day 验证当天可以解析。
    # -------------------------------------------------------------------------
    # 在生成的课表中查找能够进行班内换课的实际日期/节次
    # 遍历所有班级的所有天，寻找两节 lesson (p1, t1) 和 (p2, t2)，要求 t1 在 p2 空闲且 t2 在 p1 空闲
    class_schedules = preview["class_schedules"]
    req_map = {r.id: r for r in course_requirements}
    swap_candidate = None

    for class_id, days in class_schedules.items():
        for weekday_idx, day_slots in enumerate(days):
            lessons_on_day = []
            for period_idx, cell in enumerate(day_slots):
                if cell is not None and cell.get("kind") == "lesson":
                    req = req_map[cell["requirement_id"]]
                    lessons_on_day.append((period_idx, req.teacher_id))
            if len(lessons_on_day) >= 2:
                # 检查是否存在互不冲突的 pair
                for i in range(len(lessons_on_day)):
                    for j in range(i + 1, len(lessons_on_day)):
                        p1, t1 = lessons_on_day[i]
                        p2, t2 = lessons_on_day[j]
                        if t1 == t2:
                            continue
                        # 检查 t1 在 p2 是否在其他班级有课
                        t1_free_at_p2 = True
                        for other_cid, other_days in class_schedules.items():
                            other_cell = other_days[weekday_idx][p2]
                            if other_cell is not None and other_cell.get("kind") == "lesson":
                                if req_map[other_cell["requirement_id"]].teacher_id == t1:
                                    t1_free_at_p2 = False
                                    break
                        # 检查 t2 在 p1 是否在其他班级有课
                        t2_free_at_p1 = True
                        for other_cid, other_days in class_schedules.items():
                            other_cell = other_days[weekday_idx][p1]
                            if other_cell is not None and other_cell.get("kind") == "lesson":
                                if req_map[other_cell["requirement_id"]].teacher_id == t2:
                                    t2_free_at_p1 = False
                                    break
                        if t1_free_at_p2 and t2_free_at_p1:
                            base_monday = date(2026, 8, 31)
                            target_date = base_monday + timedelta(days=weekday_idx)
                            if target_date < date(2026, 9, 1):
                                target_date += timedelta(days=7)
                            swap_candidate = (target_date, p1, t1, p2, t2)
                            break
                    if swap_candidate is not None:
                        break
            if swap_candidate is not None:
                break
        if swap_candidate is not None:
            break

    assert swap_candidate is not None, "Could not find a swappable pair in generated timetable"
    target_date, busy_period, busy_teacher_id, other_period, other_teacher_id = swap_candidate
    target_date_str = target_date.isoformat()

    busy_event = {
        "id": "evt-busy-1",
        "kind": "busy",
        "teacher_id": busy_teacher_id,
        "busy_slots": [{"date": target_date_str, "period": busy_period}],
    }

    resp = client.post("/api/change-proposals", json={"event": busy_event})
    assert resp.status_code == 200, resp.text
    proposals_data = resp.json()
    assert len(proposals_data["proposals"]) > 0
    first_proposal = proposals_data["proposals"][0]
    assert first_proposal["strategy"] == "busy_class_swap"

    # 应用该方案
    apply_resp = client.post(
        "/api/changes/apply",
        json={"proposal": first_proposal},
    )
    assert apply_resp.status_code == 200, apply_resp.text
    rev = apply_resp.json()["revision"]

    # 验证 /api/calendar/day 当天可以解析
    cal_resp = client.get(f"/api/calendar/day?date={target_date_str}")
    assert cal_resp.status_code == 200, cal_resp.text
    cal_data = cal_resp.json()
    assert cal_data["date"] == target_date_str
    assert "class-1" in cal_data["class_schedules"]
    assert "class-2" in cal_data["class_schedules"]

    # -------------------------------------------------------------------------
    # 4. 创建 absence 事件并断言采用的每位代课教师都具备目标科目的 qualified_subject_ids
    #    （允许按生成结果动态选择教师/日期）。
    # -------------------------------------------------------------------------
    # 动态选择一个有课的教师和日期（例如张老师在走班课上有课，或者李老师/陈老师）
    # 找到张老师在走班课上课的日期（split block）
    zhang_teaching_date = None
    for weekday_idx, day_slots in enumerate(preview["class_schedules"]["class-1"]):
        for cell in day_slots:
            if cell is not None and cell.get("kind") == "split" and cell.get("split_block_id") == "split-geography-politics":
                d = date(2026, 8, 31) + timedelta(days=weekday_idx)
                if d >= date(2026, 9, 1):
                    zhang_teaching_date = d
                else:
                    # 如果正好在8月31日，取下周同星期的日期
                    zhang_teaching_date = d + timedelta(days=7)
                break
        if zhang_teaching_date is not None:
            break

    assert zhang_teaching_date is not None, "Could not find teaching date for teacher-zhang"
    absence_date_str = zhang_teaching_date.isoformat()

    absence_event = {
        "id": "evt-abs-1",
        "kind": "absence",
        "teacher_id": "teacher-zhang",
        "start_date": absence_date_str,
        "end_date": absence_date_str,
    }

    resp = client.post("/api/change-proposals", json={"event": absence_event})
    assert resp.status_code == 200, resp.text
    abs_proposals_data = resp.json()
    assert len(abs_proposals_data["proposals"]) > 0
    abs_proposal = abs_proposals_data["proposals"][0]

    # 获取系统中的全部教师及目标映射以验证资格
    teachers_map = {t.id: t for t in teachers}
    reqs_map = {r.id: r for r in course_requirements}
    split_groups_map = {
        g.id: g for b in split_course_blocks for g in b.groups
    }

    all_subs = [
        sub
        for date_exc in abs_proposal.get("date_exceptions", [])
        for sub in date_exc.get("teacher_substitutions", [])
    ]
    assert len(all_subs) > 0

    for sub in all_subs:
        sub_teacher = teachers_map[sub["substitute_teacher_id"]]
        if sub["target_kind"] == "split_group":
            target_subject_id = split_groups_map[sub["target_id"]].subject_id
        else:
            target_subject_id = reqs_map[sub["target_id"]].subject_id
        assert target_subject_id in sub_teacher.qualified_subject_ids

    # 应用 absence 方案
    abs_apply_resp = client.post(
        "/api/changes/apply",
        json={"proposal": abs_proposal},
    )
    assert abs_apply_resp.status_code == 200, abs_apply_resp.text
    rev = abs_apply_resp.json()["revision"]

    # -------------------------------------------------------------------------
    # 5. 用同一个 JSON 路径重新 create_app，断言 revision、已保存课表、已应用变更均能读取。
    # -------------------------------------------------------------------------
    new_app = create_app(data_file)
    new_client = TestClient(new_app)

    state_resp = new_client.get("/api/state")
    assert state_resp.status_code == 200, state_resp.text
    reloaded_state = state_resp.json()

    assert reloaded_state["revision"] == rev
    assert len(reloaded_state["timetable_versions"]) == 1
    assert reloaded_state["timetable_versions"][0]["id"] == base_version_id
    assert len(reloaded_state["applied_changes"]) == 2

    # 验证 /api/changes 接口
    changes_resp = new_client.get("/api/changes")
    assert changes_resp.status_code == 200, changes_resp.text
    changes_list = changes_resp.json()
    assert len(changes_list) == 2
    applied_event_ids = {c["event"]["id"] for c in changes_list}
    assert "evt-busy-1" in applied_event_ids
    assert "evt-abs-1" in applied_event_ids

    # 验证重新启动后的日历解析接口
    reloaded_cal_resp = new_client.get(f"/api/calendar/day?date={target_date_str}")
    assert reloaded_cal_resp.status_code == 200, reloaded_cal_resp.text
    reloaded_cal_data = reloaded_cal_resp.json()
    assert reloaded_cal_data["date"] == target_date_str
    assert "class-1" in reloaded_cal_data["class_schedules"]

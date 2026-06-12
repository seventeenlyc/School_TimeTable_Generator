import asyncio
import unittest
import os
import sys

# Add current directory to path to allow importing from server.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from server import validate_edit, EditValidationRequest, TeacherInput, TeacherPeriod

class TestEditValidation(unittest.TestCase):
    def run_async(self, coro):
        return asyncio.run(coro)

    def test_validate_edit_valid(self):
        req = EditValidationRequest(
            class_timetable={
                "10A": [
                    ["Math(Mr. Jones)", "Science(Mrs. Davis)"],
                    ["Free", "Math(Mr. Jones)"]
                ]
            },
            teacher_timetable={
                "Mr. Jones": [
                    ["Math - 10A", "Free"],
                    ["Free", "Math - 10A"]
                ],
                "Mrs. Davis": [
                    ["Free", "Science - 10A"],
                    ["Free", "Free"]
                ]
            },
            workingDays=2,
            periods=2,
            classes=["10A"],
            subjects=["Math", "Science"],
            teachers=[
                TeacherInput(
                    name="Mr. Jones",
                    subjects=["Math"],
                    mainSubject="Math",
                    periods=[TeacherPeriod(class_name="10A", subject="Math", noOfPeriods=2)]
                ),
                TeacherInput(
                    name="Mrs. Davis",
                    subjects=["Science"],
                    mainSubject="Science",
                    periods=[TeacherPeriod(class_name="10A", subject="Science", noOfPeriods=1)]
                )
            ]
        )
        res = self.run_async(validate_edit(req))
        self.assertTrue(res["valid"])
        self.assertEqual(len(res["errors"]), 0)

    def test_validate_edit_double_booking(self):
        req = EditValidationRequest(
            class_timetable={
                "10A": [["Math(Mr. Jones)", "Free"]],
                "10B": [["Math(Mr. Jones)", "Free"]]
            },
            teacher_timetable={
                "Mr. Jones": [["Math - 10A", "Free"]]
            },
            workingDays=1,
            periods=2,
            classes=["10A", "10B"],
            subjects=["Math"],
            teachers=[
                TeacherInput(
                    name="Mr. Jones",
                    subjects=["Math"],
                    mainSubject="Math",
                    periods=[
                        TeacherPeriod(class_name="10A", subject="Math", noOfPeriods=1),
                        TeacherPeriod(class_name="10B", subject="Math", noOfPeriods=1)
                    ]
                )
            ]
        )
        res = self.run_async(validate_edit(req))
        self.assertFalse(res["valid"])
        self.assertTrue(any("double-booked" in err for err in res["errors"]))

    def test_validate_edit_daily_subject_cap(self):
        req = EditValidationRequest(
            class_timetable={
                "10A": [["Math(Mr. Jones)", "Math(Mr. Jones)", "Math(Mr. Jones)"]]
            },
            teacher_timetable={
                "Mr. Jones": [["Math - 10A", "Math - 10A", "Math - 10A"]]
            },
            workingDays=1,
            periods=3,
            classes=["10A"],
            subjects=["Math"],
            teachers=[
                TeacherInput(
                    name="Mr. Jones",
                    subjects=["Math"],
                    mainSubject="Math",
                    periods=[TeacherPeriod(class_name="10A", subject="Math", noOfPeriods=3)]
                )
            ]
        )
        res = self.run_async(validate_edit(req))
        self.assertFalse(res["valid"])
        self.assertTrue(any("Maximum allowed is 2 periods" in err for err in res["errors"]))

    def test_validate_edit_isolated_lab_period(self):
        req = EditValidationRequest(
            class_timetable={
                "10A": [["IT(Mr. Jones)", "Free"]]
            },
            teacher_timetable={
                "Mr. Jones": [["IT - 10A", "Free"]]
            },
            workingDays=1,
            periods=2,
            classes=["10A"],
            subjects=["IT"],
            teachers=[
                TeacherInput(
                    name="Mr. Jones",
                    subjects=["IT"],
                    mainSubject="IT",
                    labPeriod="IT",
                    periods=[TeacherPeriod(class_name="10A", subject="IT", noOfPeriods=2)]
                )
            ]
        )
        res = self.run_async(validate_edit(req))
        self.assertFalse(res["valid"])
        self.assertTrue(any("must be scheduled consecutively" in err for err in res["errors"]))

    def test_validate_edit_teacher_unavailability(self):
        req = EditValidationRequest(
            class_timetable={
                "10A": [["Math(Mr. Jones)", "Free"]]
            },
            teacher_timetable={
                "Mr. Jones": [["Math - 10A", "Free"]]
            },
            workingDays=1,
            periods=2,
            classes=["10A"],
            subjects=["Math"],
            teachers=[
                TeacherInput(
                    name="Mr. Jones",
                    subjects=["Math"],
                    mainSubject="Math",
                    periods=[TeacherPeriod(class_name="10A", subject="Math", noOfPeriods=1)],
                    unavailable_slots=[[0, 0]]
                )
            ]
        )
        res = self.run_async(validate_edit(req))
        self.assertFalse(res["valid"])
        self.assertTrue(any("marked as unavailable" in err for err in res["errors"]))

    def test_validate_edit_lab_room_double_booking(self):
        req = EditValidationRequest(
            class_timetable={
                "10A": [["CS Lab(Mr. Jones)", "Free"]],
                "10B": [["CS Lab(Mrs. Smith)", "Free"]]
            },
            teacher_timetable={
                "Mr. Jones": [["CS Lab - 10A", "Free"]],
                "Mrs. Smith": [["CS Lab - 10B", "Free"]]
            },
            workingDays=1,
            periods=2,
            classes=["10A", "10B"],
            subjects=["CS Lab"],
            teachers=[
                TeacherInput(
                    name="Mr. Jones",
                    subjects=["CS Lab"],
                    mainSubject="CS Lab",
                    labPeriod="CS Lab",
                    periods=[TeacherPeriod(class_name="10A", subject="CS Lab", noOfPeriods=1)]
                ),
                TeacherInput(
                    name="Mrs. Smith",
                    subjects=["CS Lab"],
                    mainSubject="CS Lab",
                    labPeriod="CS Lab",
                    periods=[TeacherPeriod(class_name="10B", subject="CS Lab", noOfPeriods=1)]
                )
            ]
        )
        res = self.run_async(validate_edit(req))
        self.assertFalse(res["valid"])
        self.assertTrue(any("Specialized Lab Room for 'CS Lab' is double-booked" in err for err in res["errors"]))

if __name__ == '__main__':
    unittest.main()

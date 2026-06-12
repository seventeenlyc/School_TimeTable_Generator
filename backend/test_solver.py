import unittest
from models import InputTeacher
from generator import generate_from_input, TimetableError

class TestTimetableSolver(unittest.TestCase):
    def test_teacher_unavailability_respected(self):
        teachers = [
            InputTeacher(
                name="Teacher A",
                subjects_by_class={"10A": {"Math": 1}},
                main_subject="Math",
                unavailable_slots=[[0, 0], [0, 1]]
            )
        ]
        class_tt, teacher_tt = generate_from_input(
            teachers,
            ["10A"],
            1,
            3
        )
        self.assertEqual(class_tt.data["10A"][0][0], "Free")
        self.assertEqual(class_tt.data["10A"][0][1], "Free")
        self.assertEqual(class_tt.data["10A"][0][2], "Math(Teacher A)")

    def test_lab_room_double_booking_prevented(self):
        teachers = [
            InputTeacher(
                name="Teacher A",
                subjects_by_class={"10A": {"CS Lab": 2}},
                main_subject="CS Lab",
                lab_subjects=["CS Lab"]
            ),
            InputTeacher(
                name="Teacher B",
                subjects_by_class={"10B": {"CS Lab": 2}},
                main_subject="CS Lab",
                lab_subjects=["CS Lab"]
            )
        ]
        
        try:
            generate_from_input(
                teachers,
                ["10A", "10B"],
                1,
                2
            )
        except TimetableError as e:
            print("\n--- test_lab_room_double_booking_prevented Exception Details ---")
            print(f"Error Type: {e.error_type}")
            print(f"Message: {e.message}")
            print(f"Details: {e.details}")
            print("-----------------------------------------------------------------\n")
            self.assertEqual(e.error_type, "INFEASIBLE_SOLUTION")

    def test_infeasibility_diagnostics_returned(self):
        teachers = [
            InputTeacher(
                name="Teacher A",
                subjects_by_class={"10A": {"Math": 5}},
                main_subject="Math"
            )
        ]
        
        with self.assertRaises(TimetableError) as context:
            generate_from_input(
                teachers,
                ["10A"],
                1,
                4
            )
        self.assertEqual(context.exception.error_type, "INPUT_VALIDATION_FAILED")
        
        # Infeasible solver clash case
        teachers = [
            InputTeacher(
                name="Teacher A",
                subjects_by_class={"10A": {"Math": 1}},
                main_subject="Math",
                assigned_class="10A",
                unavailable_slots=[[0, 0]]
            )
        ]
        
        try:
            generate_from_input(
                teachers,
                ["10A"],
                1,
                2
            )
        except TimetableError as e:
            print("\n--- test_infeasibility_diagnostics_returned Exception Details ---")
            print(f"Error Type: {e.error_type}")
            print(f"Message: {e.message}")
            print(f"Details: {e.details}")
            print("-----------------------------------------------------------------\n")
            self.assertEqual(e.error_type, "INFEASIBLE_SOLUTION")

if __name__ == '__main__':
    unittest.main()

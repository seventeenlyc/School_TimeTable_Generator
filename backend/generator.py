from ortools.sat.python import cp_model
from models import Teacher, InputTeacher, Timetable
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

class TimetableError(Exception):
    """Custom exception for timetable generation errors"""
    def __init__(self, message: str, error_type: str = "CONSTRAINT_VIOLATION", details: Dict = None):
        self.message = message
        self.error_type = error_type
        self.details = details or {}
        super().__init__(self.message)

def validate_input_constraints(teacher_list: dict, classes: List[str], working_days: int, periods_per_day: int) -> List[Dict]:
    """Validate input constraints and return list of errors"""
    errors = []
    total_periods_per_class = working_days * periods_per_day
    
    # Check 1: Total periods per class constraint
    for cls in classes:
        total_required = 0
        class_subjects = {}
        
        for teacher_name, teacher in teacher_list.items():
            if cls in teacher.subjects_by_class:
                for subject, periods in teacher.subjects_by_class[cls].items():
                    total_required += periods
                    if subject not in class_subjects:
                        class_subjects[subject] = []
                    class_subjects[subject].append((teacher_name, periods))
        
        if total_required > total_periods_per_class:
            errors.append({
                "type": "PERIODS_OVERFLOW",
                "message": f"Class {cls} requires {total_required} periods but only {total_periods_per_class} periods are available ({working_days} days x {periods_per_day} periods/day)",
                "class": cls,
                "required": total_required,
                "available": total_periods_per_class,
                "excess": total_required - total_periods_per_class
            })
    
    # Check 2: Daily subject limit (max 2 periods per subject per day)
    for cls in classes:
        for teacher_name, teacher in teacher_list.items():
            if cls in teacher.subjects_by_class:
                for subject, total_periods in teacher.subjects_by_class[cls].items():
                    max_possible_periods = working_days * 2  # 2 periods max per day
                    
                    if total_periods > max_possible_periods:
                        errors.append({
                            "type": "DAILY_SUBJECT_LIMIT",
                            "message": f"Subject '{subject}' for class {cls} requires {total_periods} periods, but maximum possible is {max_possible_periods} periods ({working_days} days x 2 periods/day limit)",
                            "teacher": teacher_name,
                            "class": cls,
                            "subject": subject,
                            "required": total_periods,
                            "max_possible": max_possible_periods
                        })
    
    # Check 3: Teacher availability (max teacher periods constraint)
    for teacher_name, teacher in teacher_list.items():
        total_teacher_periods = 0
        teacher_classes = []
        
        for cls, subjects in teacher.subjects_by_class.items():
            class_periods = sum(subjects.values())
            total_teacher_periods += class_periods
            teacher_classes.append((cls, class_periods))
        
        max_teacher_periods = working_days * periods_per_day
        # Subtract unavailable slots from max available teacher periods
        unavailable_count = len(teacher.unavailable_slots) if hasattr(teacher, 'unavailable_slots') else 0
        max_available_periods = max_teacher_periods - unavailable_count
        
        if total_teacher_periods > max_available_periods:
            errors.append({
                "type": "TEACHER_OVERLOAD",
                "message": f"Teacher {teacher_name} is assigned {total_teacher_periods} periods but is only available for {max_available_periods} periods ({working_days} days x {periods_per_day} periods/day minus {unavailable_count} unavailable slots)",
                "teacher": teacher_name,
                "assigned_periods": total_teacher_periods,
                "max_periods": max_available_periods,
                "classes": teacher_classes
            })
    
    # Check 4: Lab subject constraints (must be even number of periods)
    for teacher_name, teacher in teacher_list.items():
        for subject in teacher.lab_subjects:
            for cls, subjects in teacher.subjects_by_class.items():
                if subject in subjects:
                    periods = subjects[subject]
                    if periods % 2 != 0:
                        errors.append({
                            "type": "LAB_PERIOD_ODD",
                            "message": f"Lab subject '{subject}' for class {cls} has {periods} periods, but lab subjects must have even number of periods (for consecutive scheduling)",
                            "teacher": teacher_name,
                            "class": cls,
                            "subject": subject,
                            "periods": periods
                        })
    
    # Check 5: Main subject availability for class teachers
    for teacher_name, teacher in teacher_list.items():
        if teacher.assigned_class and hasattr(teacher, 'main_subject'):
            cls = teacher.assigned_class
            main_subject = teacher.main_subject
            
            if cls not in teacher.subjects_by_class or main_subject not in teacher.subjects_by_class[cls]:
                errors.append({
                    "type": "MAIN_SUBJECT_MISSING",
                    "message": f"Class teacher {teacher_name} is assigned to class {cls} with main subject '{main_subject}', but this subject is not assigned to them for this class",
                    "teacher": teacher_name,
                    "class": cls,
                    "main_subject": main_subject
                })
    
    # Check 6: Duplicate subject assignments
    subject_assignments = defaultdict(list)
    for teacher_name, teacher in teacher_list.items():
        for cls, subjects in teacher.subjects_by_class.items():
            for subject in subjects:
                subject_assignments[(cls, subject)].append(teacher_name)
    
    for (cls, subject), teachers in subject_assignments.items():
        if len(teachers) > 1:
            errors.append({
                "type": "DUPLICATE_SUBJECT",
                "message": f"Subject '{subject}' for class {cls} is assigned to multiple teachers: {', '.join(teachers)}. Each subject-class combination should have only one teacher.",
                "class": cls,
                "subject": subject,
                "teachers": teachers
            })
    
    return errors

def convert_input_teachers(input_teachers: List[InputTeacher]) -> dict:
    teacher_list = {}
    for t in input_teachers:
        teacher = Teacher(
            name=t.name,
            subjects_by_class=t.subjects_by_class,
            main_subject=t.main_subject,
            assigned_class=t.assigned_class,
            unavailable_slots=t.unavailable_slots or []
        )
        teacher.lab_subjects = set(t.lab_subjects or [])
        teacher_list[t.name] = teacher
    return teacher_list

def generate_from_input(input_teachers: List[InputTeacher], classes: List[str], working_days: int, periods_per_day: int):
    teacher_list = convert_input_teachers(input_teachers)
    
    # Validate constraints before attempting generation
    constraint_errors = validate_input_constraints(teacher_list, classes, working_days, periods_per_day)
    
    if constraint_errors:
        error_summary = defaultdict(list)
        for error in constraint_errors:
            error_summary[error["type"]].append(error)
        
        error_message = "[Error] Timetable generation failed due to constraint violations:\n\n"
        for error_type, errors in error_summary.items():
            error_message += f"[Type] {error_type.replace('_', ' ').title()}:\n"
            for error in errors:
                error_message += f"  - {error['message']}\n"
            error_message += "\n"
        
        raise TimetableError(
            message=error_message.strip(),
            error_type="INPUT_VALIDATION_FAILED",
            details={"constraint_errors": constraint_errors}
        )
    
    # Debug: Log total periods per class
    for cls in classes:
        total = 0
        for t in teacher_list.values():
            if cls in t.subjects_by_class:
                total += sum(t.subjects_by_class[cls].values())
        print(f"[Stats] Class {cls} requires {total} periods (max available: {working_days * periods_per_day})")
    
    return generate_with_teacher_list(teacher_list, classes, working_days, periods_per_day)

def run_relaxation_diagnostics(teacher_list: dict, classes: List[str], working_days: int, periods_per_day: int, pair_to_id: dict, id_to_pair: dict, current_id: int) -> List[str]:
    """Builds and solves a relaxed version of the timetable model to explain infeasibility."""
    model = cp_model.CpModel()
    
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    # Define variables
    timetable = {
        cls: [[model.NewIntVar(0, current_id, f"{cls}_d{d}_p{p}")
              for p in range(periods_per_day)] for d in range(working_days)]
        for cls in classes
    }
    
    penalties = []
    diagnostic_reports = []

    # 1. Relaxed Teacher conflict constraint (Penalty weight: 10000)
    for teacher in teacher_list.values():
        for d in range(working_days):
            for p in range(periods_per_day):
                teacher_pairs = [(pid, cls) for pid, (tname, _, cls) in id_to_pair.items() if tname == teacher.name]
                class_assignments = []
                for pid, cls in teacher_pairs:
                    is_assigned = model.NewBoolVar(f"{teacher.name}_{cls}_d{d}_p{p}_{pid}")
                    model.Add(timetable[cls][d][p] == pid).OnlyEnforceIf(is_assigned)
                    model.Add(timetable[cls][d][p] != pid).OnlyEnforceIf(is_assigned.Not())
                    class_assignments.append(is_assigned)
                
                if class_assignments:
                    excess = model.NewIntVar(0, len(class_assignments), f"db_excess_{teacher.name}_d{d}_p{p}")
                    model.Add(sum(class_assignments) - 1 <= excess)
                    penalties.append(excess * 100)

    # 2. Relaxed Subject period counts (Penalty weight: 10000)
    for pid, (tname, subject, cls) in id_to_pair.items():
        count = teacher_list[tname].subjects_by_class[cls][subject]
        occurrences = []
        for d in range(working_days):
            for p in range(periods_per_day):
                var = timetable[cls][d][p]
                b = model.NewBoolVar(f"occ_{cls}_{d}_{p}_{pid}")
                model.Add(var == pid).OnlyEnforceIf(b)
                model.Add(var != pid).OnlyEnforceIf(b.Not())
                occurrences.append(b)
        
        diff = model.NewIntVar(-count, count, f"diff_{pid}")
        model.Add(sum(occurrences) - count == diff)
        abs_diff = model.NewIntVar(0, count, f"abs_diff_{pid}")
        model.AddAbsEquality(abs_diff, diff)
        penalties.append(abs_diff * 10000)

    # 3. Relaxed Daily subject limit (max 2 periods per subject per day) (Penalty weight: 100)
    for cls in classes:
        for d in range(working_days):
            all_subjects = {
                subject
                for teacher in teacher_list.values()
                for subcls, subs in teacher.subjects_by_class.items()
                if subcls == cls for subject in subs
            }
            for subject in all_subjects:
                subject_ids = [pid for pid, (_, subj, c) in id_to_pair.items() if subj == subject and c == cls]
                count_vars = []
                for p in range(periods_per_day):
                    var = timetable[cls][d][p]
                    for pid in subject_ids:
                        b = model.NewBoolVar(f"{cls}_{d}_{p}_{subject}_{pid}")
                        model.Add(var == pid).OnlyEnforceIf(b)
                        model.Add(var != pid).OnlyEnforceIf(b.Not())
                        count_vars.append(b)
                
                subj_excess = model.NewIntVar(0, len(count_vars), f"subj_excess_{cls}_d{d}_{subject}")
                model.Add(sum(count_vars) - 2 <= subj_excess)
                penalties.append(subj_excess * 100)

    # 4. Relaxed Teacher Availability slots (Penalty weight: 100)
    for teacher in teacher_list.values():
        if hasattr(teacher, 'unavailable_slots') and teacher.unavailable_slots:
            for slot in teacher.unavailable_slots:
                if len(slot) == 2:
                    d, p = slot[0], slot[1]
                    if d < working_days and p < periods_per_day:
                        for pid, (tname, _, cls) in id_to_pair.items():
                            if tname == teacher.name:
                                b = model.NewBoolVar(f"unavail_viol_{tname}_{cls}_d{d}_p{p}_{pid}")
                                model.Add(timetable[cls][d][p] == pid).OnlyEnforceIf(b)
                                model.Add(timetable[cls][d][p] != pid).OnlyEnforceIf(b.Not())
                                penalties.append(b * 100)

    # 5. Relaxed Specialized Lab Rooms Allocation (Penalty weight: 100)
    lab_subjects_all = set()
    for teacher in teacher_list.values():
        if hasattr(teacher, 'lab_subjects'):
            lab_subjects_all.update(teacher.lab_subjects)

    for lab_sub in lab_subjects_all:
        for d in range(working_days):
            for p in range(periods_per_day):
                lab_assignments = []
                for pid, (tname, subject, cls) in id_to_pair.items():
                    if subject == lab_sub:
                        b = model.NewBoolVar(f"lab_room_relax_{lab_sub}_{cls}_d{d}_p{p}_{pid}")
                        model.Add(timetable[cls][d][p] == pid).OnlyEnforceIf(b)
                        model.Add(timetable[cls][d][p] != pid).OnlyEnforceIf(b.Not())
                        lab_assignments.append(b)
                
                if lab_assignments:
                    lab_excess = model.NewIntVar(0, len(lab_assignments), f"lab_excess_{lab_sub}_d{d}_p{p}")
                    model.Add(sum(lab_assignments) - 1 <= lab_excess)
                    penalties.append(lab_excess * 100)

    # 6. Relaxed Lab subject consecutive scheduling constraint (Penalty weight: 100)
    for pid, (tname, subject, cls) in id_to_pair.items():
        if subject in teacher_list[tname].lab_subjects:
            total = teacher_list[tname].subjects_by_class[cls][subject]
            if total % 2 != 0:
                continue
            num_blocks = total // 2
            block_vars = []
            for d in range(working_days):
                for p in range(periods_per_day - 1):
                    first = timetable[cls][d][p]
                    second = timetable[cls][d][p + 1]
                    is_block = model.NewBoolVar(f"lab_block_relax_{cls}_{d}_{p}_{pid}")
                    model.Add(first == pid).OnlyEnforceIf(is_block)
                    model.Add(second == pid).OnlyEnforceIf(is_block)
                    block_vars.append(is_block)
            
            if block_vars:
                lab_block_diff = model.NewIntVar(-num_blocks, num_blocks, f"lab_block_diff_{pid}")
                model.Add(sum(block_vars) - num_blocks == lab_block_diff)
                abs_lab_block_diff = model.NewIntVar(0, num_blocks, f"abs_lab_block_diff_{pid}")
                model.AddAbsEquality(abs_lab_block_diff, lab_block_diff)
                penalties.append(abs_lab_block_diff * 100)

    # 7. Relaxed Class teacher main subject first period constraint (Penalty weight: 100)
    for teacher in teacher_list.values():
        if teacher.assigned_class and hasattr(teacher, 'main_subject'):
            cls = teacher.assigned_class
            main_subject = teacher.main_subject
            main_subject_id = next(
                (pid for pid, (tname, subject, class_name) in id_to_pair.items()
                 if tname == teacher.name and subject == main_subject and class_name == cls),
                None
            )
            if main_subject_id is not None and cls in teacher.subjects_by_class and main_subject in teacher.subjects_by_class[cls]:
                total_main_subject_periods = teacher.subjects_by_class[cls][main_subject]
                first_period_main_subject = []
                for d in range(working_days):
                    is_first = model.NewBoolVar(f"relax_{cls}_d{d}_main_first_{teacher.name}")
                    model.Add(timetable[cls][d][0] == main_subject_id).OnlyEnforceIf(is_first)
                    model.Add(timetable[cls][d][0] != main_subject_id).OnlyEnforceIf(is_first.Not())
                    first_period_main_subject.append(is_first)
                
                max_first_periods = min(working_days, total_main_subject_periods)
                if first_period_main_subject:
                    first_diff = model.NewIntVar(-max_first_periods, max_first_periods, f"first_diff_{teacher.name}_{cls}")
                    model.Add(sum(first_period_main_subject) - max_first_periods == first_diff)
                    abs_first_diff = model.NewIntVar(0, max_first_periods, f"abs_first_diff_{teacher.name}_{cls}")
                    model.AddAbsEquality(abs_first_diff, first_diff)
                    penalties.append(abs_first_diff * 100)

    # Valid assignment constraint
    for cls in classes:
        for d in range(working_days):
            for p in range(periods_per_day):
                valid_assignments = []
                for pid in id_to_pair:
                    if id_to_pair[pid][2] == cls:
                        b = model.NewBoolVar(f"valid_{cls}_{d}_{p}_{pid}")
                        model.Add(timetable[cls][d][p] == pid).OnlyEnforceIf(b)
                        model.Add(timetable[cls][d][p] != pid).OnlyEnforceIf(b.Not())
                        valid_assignments.append(b)
                if valid_assignments:
                    model.Add(sum(valid_assignments) <= 1)

    # Minimize all violations
    model.Minimize(sum(penalties))
    
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 15
    status = solver.Solve(model)
    
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        # 1. Check teacher double booking
        for teacher in teacher_list.values():
            for d in range(working_days):
                for p in range(periods_per_day):
                    teacher_pairs = [(pid, cls) for pid, (tname, _, cls) in id_to_pair.items() if tname == teacher.name]
                    active_classes = []
                    for pid, cls in teacher_pairs:
                        val = solver.Value(timetable[cls][d][p])
                        if val == pid:
                            active_classes.append(cls)
                    if len(active_classes) > 1:
                        day_name = day_names[d] if d < len(day_names) else f"Day {d+1}"
                        diagnostic_reports.append(
                            f"Teacher '{teacher.name}' had to be double-booked on {day_name}, Period {p+1} for classes: {', '.join(active_classes)}."
                        )
        
        # 2. Check subject count shortage
        for pid, (tname, subject, cls) in id_to_pair.items():
            count = teacher_list[tname].subjects_by_class[cls][subject]
            assigned_count = 0
            for d in range(working_days):
                for p in range(periods_per_day):
                    if solver.Value(timetable[cls][d][p]) == pid:
                        assigned_count += 1
            if assigned_count < count:
                diagnostic_reports.append(
                    f"Class {cls} could only schedule {assigned_count} of the requested {count} periods for '{subject}' (Teacher: {tname})."
                )

        # 3. Check Daily subject limit excess
        for cls in classes:
            for d in range(working_days):
                all_subjects = {
                    subject
                    for teacher in teacher_list.values()
                    for subcls, subs in teacher.subjects_by_class.items()
                    if subcls == cls for subject in subs
                }
                for subject in all_subjects:
                    subject_ids = [pid for pid, (_, subj, c) in id_to_pair.items() if subj == subject and c == cls]
                    assigned = 0
                    for p in range(periods_per_day):
                        if solver.Value(timetable[cls][d][p]) in subject_ids:
                            assigned += 1
                    if assigned > 2:
                        day_name = day_names[d] if d < len(day_names) else f"Day {d+1}"
                        diagnostic_reports.append(
                            f"Class {cls} exceeds the daily limit of 2 periods of subject '{subject}' on {day_name} (has {assigned} periods)."
                        )

        # 4. Check Teacher Availability violations
        for teacher in teacher_list.values():
            if hasattr(teacher, 'unavailable_slots') and teacher.unavailable_slots:
                for slot in teacher.unavailable_slots:
                    if len(slot) == 2:
                        d, p = slot[0], slot[1]
                        if d < working_days and p < periods_per_day:
                            for pid, (tname, subject, cls) in id_to_pair.items():
                                if tname == teacher.name:
                                    if solver.Value(timetable[cls][d][p]) == pid:
                                        day_name = day_names[d] if d < len(day_names) else f"Day {d+1}"
                                        diagnostic_reports.append(
                                            f"Teacher '{tname}' was scheduled on blocked slot {day_name}, Period {p+1} for Class {cls}."
                                        )

        # 5. Check Specialized Lab Room double booking
        for lab_sub in lab_subjects_all:
            for d in range(working_days):
                for p in range(periods_per_day):
                    active_labs = []
                    for pid, (tname, subject, cls) in id_to_pair.items():
                        if subject == lab_sub:
                            if solver.Value(timetable[cls][d][p]) == pid:
                                active_labs.append(cls)
                    if len(active_labs) > 1:
                        day_name = day_names[d] if d < len(day_names) else f"Day {d+1}"
                        diagnostic_reports.append(
                            f"Specialized Lab Room for '{lab_sub}' was double-booked on {day_name}, Period {p+1} by classes: {', '.join(active_labs)}."
                        )
                        
        # 6. Check Lab subject consecutive scheduling violations
        for pid, (tname, subject, cls) in id_to_pair.items():
            if subject in teacher_list[tname].lab_subjects:
                total = teacher_list[tname].subjects_by_class[cls][subject]
                if total % 2 != 0:
                    continue
                num_blocks = total // 2
                block_vars_count = 0
                for d in range(working_days):
                    for p in range(periods_per_day - 1):
                        if solver.Value(timetable[cls][d][p]) == pid and solver.Value(timetable[cls][d][p + 1]) == pid:
                            block_vars_count += 1
                if block_vars_count < num_blocks:
                    diagnostic_reports.append(
                        f"Lab subject '{subject}' for Class {cls} was unable to be scheduled consecutively (only {block_vars_count} consecutive blocks scheduled instead of {num_blocks})."
                    )

        # 7. Check Class Teacher Main Subject First Period violations
        for teacher in teacher_list.values():
            if teacher.assigned_class and hasattr(teacher, 'main_subject'):
                cls = teacher.assigned_class
                main_subject = teacher.main_subject
                main_subject_id = next(
                    (pid for pid, (tname, subject, class_name) in id_to_pair.items()
                     if tname == teacher.name and subject == main_subject and class_name == cls),
                    None
                )
                if main_subject_id is not None and cls in teacher.subjects_by_class and main_subject in teacher.subjects_by_class[cls]:
                    total_main_subject_periods = teacher.subjects_by_class[cls][main_subject]
                    max_first_periods = min(working_days, total_main_subject_periods)
                    
                    first_assigned = 0
                    for d in range(working_days):
                        if solver.Value(timetable[cls][d][0]) == main_subject_id:
                            first_assigned += 1
                    
                    if first_assigned < max_first_periods:
                        diagnostic_reports.append(
                            f"Class teacher '{teacher.name}' was unable to be scheduled for main subject '{main_subject}' in the first period for {max_first_periods - first_assigned} of the required {max_first_periods} days."
                        )
                        
    return diagnostic_reports

def generate_with_teacher_list(teacher_list: dict, classes: List[str], working_days: int, periods_per_day: int):
    model = cp_model.CpModel()
    pair_to_id = {}
    id_to_pair = {}
    current_id = 1

    for teacher in teacher_list.values():
        for cls, subjects in teacher.subjects_by_class.items():
            for subject in subjects:
                pair = (teacher.name, subject, cls)
                if pair not in pair_to_id:
                    pair_to_id[pair] = current_id
                    id_to_pair[current_id] = pair
                    current_id += 1

    timetable = {
        cls: [[model.NewIntVar(0, current_id, f"{cls}_d{d}_p{p}")
              for p in range(periods_per_day)] for d in range(working_days)]
        for cls in classes
    }

    # Teacher conflict constraint
    for teacher in teacher_list.values():
        for d in range(working_days):
            for p in range(periods_per_day):
                teacher_pairs = [(pid, cls) for pid, (tname, _, cls) in id_to_pair.items() if tname == teacher.name]
                class_assignments = []
                for pid, cls in teacher_pairs:
                    is_assigned = model.NewBoolVar(f"{teacher.name}_{cls}_d{d}_p{p}_{pid}")
                    model.Add(timetable[cls][d][p] == pid).OnlyEnforceIf(is_assigned)
                    model.Add(timetable[cls][d][p] != pid).OnlyEnforceIf(is_assigned.Not())
                    class_assignments.append(is_assigned)
                if class_assignments:
                    model.Add(sum(class_assignments) <= 1)

    # Subject count constraint
    for pid, (tname, subject, cls) in id_to_pair.items():
        count = teacher_list[tname].subjects_by_class[cls][subject]
        occurrences = []
        for d in range(working_days):
            for p in range(periods_per_day):
                var = timetable[cls][d][p]
                b = model.NewBoolVar(f"occ_{cls}_{d}_{p}_{pid}")
                model.Add(var == pid).OnlyEnforceIf(b)
                model.Add(var != pid).OnlyEnforceIf(b.Not())
                occurrences.append(b)
        model.Add(sum(occurrences) == count)

    # Daily subject limit constraint (max 2 periods per subject per day)
    for cls in classes:
        for d in range(working_days):
            all_subjects = {
                subject
                for teacher in teacher_list.values()
                for subcls, subs in teacher.subjects_by_class.items()
                if subcls == cls for subject in subs
            }
            for subject in all_subjects:
                subject_ids = [pid for pid, (_, subj, c) in id_to_pair.items() if subj == subject and c == cls]
                count_vars = []
                for p in range(periods_per_day):
                    var = timetable[cls][d][p]
                    for pid in subject_ids:
                        b = model.NewBoolVar(f"{cls}_{d}_{p}_{subject}_{pid}")
                        model.Add(var == pid).OnlyEnforceIf(b)
                        model.Add(var != pid).OnlyEnforceIf(b.Not())
                        count_vars.append(b)
                model.Add(sum(count_vars) <= 2)

    # Lab subject consecutive scheduling constraint
    for pid, (tname, subject, cls) in id_to_pair.items():
        if subject in teacher_list[tname].lab_subjects:
            total = teacher_list[tname].subjects_by_class[cls][subject]
            if total % 2 != 0:
                continue
            num_blocks = total // 2
            block_vars = []
            for d in range(working_days):
                for p in range(periods_per_day - 1):
                    first = timetable[cls][d][p]
                    second = timetable[cls][d][p + 1]
                    is_block = model.NewBoolVar(f"lab_block_{cls}_{d}_{p}_{pid}")
                    model.Add(first == pid).OnlyEnforceIf(is_block)
                    model.Add(second == pid).OnlyEnforceIf(is_block)
                    block_vars.append(is_block)
            model.Add(sum(block_vars) == num_blocks)

    # Class teacher main subject first period constraint
    for teacher in teacher_list.values():
        if teacher.assigned_class and hasattr(teacher, 'main_subject'):
            cls = teacher.assigned_class
            main_subject = teacher.main_subject
            main_subject_id = next(
                (pid for pid, (tname, subject, class_name) in id_to_pair.items()
                 if tname == teacher.name and subject == main_subject and class_name == cls),
                None
            )
            if main_subject_id is not None and cls in teacher.subjects_by_class and main_subject in teacher.subjects_by_class[cls]:
                total_main_subject_periods = teacher.subjects_by_class[cls][main_subject]
                first_period_main_subject = []
                for d in range(working_days):
                    is_first = model.NewBoolVar(f"{cls}_d{d}_main_first_{teacher.name}")
                    model.Add(timetable[cls][d][0] == main_subject_id).OnlyEnforceIf(is_first)
                    model.Add(timetable[cls][d][0] != main_subject_id).OnlyEnforceIf(is_first.Not())
                    first_period_main_subject.append(is_first)
                
                max_first_periods = min(working_days, total_main_subject_periods)
                model.Add(sum(first_period_main_subject) == max_first_periods)

    # Teacher Availability slots constraint
    for teacher in teacher_list.values():
        if hasattr(teacher, 'unavailable_slots') and teacher.unavailable_slots:
            for slot in teacher.unavailable_slots:
                if len(slot) == 2:
                    d, p = slot[0], slot[1]
                    if d < working_days and p < periods_per_day:
                        for pid, (tname, _, cls) in id_to_pair.items():
                            if tname == teacher.name:
                                model.Add(timetable[cls][d][p] != pid)

    # Specialized Lab Rooms Allocation Constraint
    lab_subjects_all = set()
    for teacher in teacher_list.values():
        if hasattr(teacher, 'lab_subjects'):
            lab_subjects_all.update(teacher.lab_subjects)

    for lab_sub in lab_subjects_all:
        for d in range(working_days):
            for p in range(periods_per_day):
                lab_assignments = []
                for pid, (tname, subject, cls) in id_to_pair.items():
                    if subject == lab_sub:
                        b = model.NewBoolVar(f"lab_room_{lab_sub}_{cls}_d{d}_p{p}_{pid}")
                        model.Add(timetable[cls][d][p] == pid).OnlyEnforceIf(b)
                        model.Add(timetable[cls][d][p] != pid).OnlyEnforceIf(b.Not())
                        lab_assignments.append(b)
                if lab_assignments:
                    model.Add(sum(lab_assignments) <= 1)

    # Valid assignment constraint
    for cls in classes:
        for d in range(working_days):
            for p in range(periods_per_day):
                valid_assignments = []
                for pid in id_to_pair:
                    if id_to_pair[pid][2] == cls:
                        b = model.NewBoolVar(f"valid_{cls}_{d}_{p}_{pid}")
                        model.Add(timetable[cls][d][p] == pid).OnlyEnforceIf(b)
                        model.Add(timetable[cls][d][p] != pid).OnlyEnforceIf(b.Not())
                        valid_assignments.append(b)
                if valid_assignments:
                    model.Add(sum(valid_assignments) <= 1)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 60
    status = solver.Solve(model)

    print("[Solver] status:", solver.StatusName(status))  # Debug log

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        class_tt = {}
        for cls in classes:
            class_tt[cls] = []
            for d in range(working_days):
                row = []
                for p in range(periods_per_day):
                    val = solver.Value(timetable[cls][d][p])
                    if val in id_to_pair:
                        teacher, subject, _ = id_to_pair[val]
                        row.append(f"{subject}({teacher})")
                    else:
                        row.append("Free")
                class_tt[cls].append(row)

        teacher_timetables = {}
        for teacher_name, teacher in teacher_list.items():
            teacher_tt = [["Free"] * periods_per_day for _ in range(working_days)]
            for cls in classes:
                for d in range(working_days):
                    for p in range(periods_per_day):
                        entry = class_tt[cls][d][p]
                        if entry != "Free":
                            if '(' in entry and ')' in entry:
                                subject_part = entry.split('(')[0]
                                teacher_part = entry.split('(')[1].rstrip(')')
                                if teacher_part == teacher_name:
                                    teacher_tt[d][p] = f"{subject_part} - {cls}"
            teacher_timetables[teacher_name] = teacher_tt

        return Timetable(data=class_tt), Timetable(data=teacher_timetables)
    
    elif status == cp_model.INFEASIBLE:
        # Run Relaxation diagnostics to retrieve exact conflict causes
        violations = run_relaxation_diagnostics(teacher_list, classes, working_days, periods_per_day, pair_to_id, id_to_pair, current_id)
        
        error_message = "[Error] No feasible timetable solution exists with the given constraints.\n"
        if violations:
            error_message += "\n[Diagnostics] Conflict Diagnostics identified the following issues:\n"
            for v in violations:
                error_message += f"  - {v}\n"
        else:
            error_message += (
                "  - Too many periods assigned relative to available time slots\n"
                "  - Conflicting teacher availability schedules\n"
                "  - Lab room double-bookings\n"
                "  - Class teacher main subject constraints cannot be satisfied\n"
            )
        
        error_message += "\nPlease adjust your input and retry."
        
        raise TimetableError(
            message=error_message,
            error_type="INFEASIBLE_SOLUTION",
            details={"conflict_diagnostics": violations}
        )
    elif status == cp_model.MODEL_INVALID:
        raise TimetableError(
            message="[Error] The timetable model is invalid. This is likely due to conflicting constraints in the input data.",
            error_type="INVALID_MODEL"
        )
    else:
        raise TimetableError(
            message=f"[Error] Timetable generation failed with solver status: {solver.StatusName(status)}.",
            error_type="SOLVER_ERROR",
            details={"solver_status": solver.StatusName(status)}
        )
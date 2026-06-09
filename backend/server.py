from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from models import InputTeacher
from collections import defaultdict
from generator import generate_from_input, TimetableError
from dotenv import load_dotenv
from datetime import datetime
from bson import ObjectId
from fastapi.encoders import jsonable_encoder
from pytz import timezone
import pymongo
import traceback
import os

load_dotenv()

app = FastAPI()
frontend_url = os.getenv("FRONTEND_URL")
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if frontend_url:
    origins.append(frontend_url)

# ✅ Enable CORS for local dev environments and deployed frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = pymongo.MongoClient(
   os.getenv("MONGO_URI"),
    tls=True,
    tlsAllowInvalidCertificates=False
)
db = client["timetableDB"]
collection = db["timetables"]

class TeacherPeriod(BaseModel):
    class_name: str
    subject: str
    noOfPeriods: int

class TeacherInput(BaseModel):
    name: str
    subjects: List[str]
    mainSubject: str
    labPeriod: Optional[str] = None
    assigned_class: Optional[str] = None
    periods: List[TeacherPeriod]

class TimetableRequest(BaseModel):
    workingDays: int
    periods: int
    classes: List[str]
    subjects: List[str]
    teachers: List[TeacherInput]
    userId : str 
    title : Optional[str] = None

class EditValidationRequest(BaseModel):
    class_timetable: Dict[str, List[List[str]]]
    teacher_timetable: Dict[str, List[List[str]]]
    workingDays: int
    periods: int
    classes: List[str]
    subjects: List[str]
    teachers: List[TeacherInput]

@app.post("/generate")
async def generate_timetable(request: TimetableRequest):
    try:
        print(f"Received request: {request}")
        
        input_teachers = []
        for teacher in request.teachers:
            subjects_by_class = {}
            for period in teacher.periods:
                class_name = period.class_name
                subject = period.subject
                no_of_periods = period.noOfPeriods
                if class_name not in subjects_by_class:
                    subjects_by_class[class_name] = {}
                subjects_by_class[class_name][subject] = no_of_periods
            
            lab_subjects = []
            if teacher.labPeriod and teacher.labPeriod != "Select Lab Period":
                lab_subjects = [teacher.labPeriod]
            
            input_teacher = InputTeacher(
                name=teacher.name,
                subjects_by_class=subjects_by_class,
                main_subject=teacher.mainSubject,
                assigned_class=teacher.assigned_class if teacher.assigned_class != "Select Class" else None,
                lab_subjects=lab_subjects
            )
            input_teachers.append(input_teacher)
        
        print(f"Converted input teachers: {input_teachers}")
        
        class_timetable, teacher_timetable = generate_from_input(
            input_teachers, 
            request.classes, 
            request.workingDays, 
            request.periods
        )

        if not class_timetable.data:
            return {
                "message": "❌ Timetable generation failed. No feasible solution found.",
                "class_timetable": {},
                "teacher_timetable": {},
                "status": "INFEASIBLE",
                "error_type": "UNKNOWN",
                "error_details": {}
            }

        return {
            "class_timetable": class_timetable.data,
            "teacher_timetable": teacher_timetable.data,
            "message": "✅ Timetable generated successfully",
            "status": "FEASIBLE",
            "userId": request.userId,
            "title": request.title,
            "teacherData": request.teachers,
            "classes": request.classes,
            "subjects": request.subjects,
            "workingDays": request.workingDays,
            "periods": request.periods
        }

    except TimetableError as te:
        # Handle custom timetable errors with detailed information
        print(f"Timetable generation error: {te.message}")
        print(f"Error type: {te.error_type}")
        print(f"Error details: {te.details}")
        
        return {
            "message": te.message,
            "class_timetable": {},
            "teacher_timetable": {},
            "status": "ERROR",
            "error_type": te.error_type,
            "error_details": te.details
        }
    
    except ValueError as ve:
        # Handle other value errors
        error_message = str(ve)
        print(f"Value error: {error_message}")
        
        return {
            "message": f"❌ Input validation failed: {error_message}",
            "class_timetable": {},
            "teacher_timetable": {},
            "status": "ERROR",
            "error_type": "VALUE_ERROR",
            "error_details": {"original_error": error_message}
        }
    
    except Exception as e:
        # Handle any other unexpected errors
        error_message = str(e)
        print(f"Unexpected error generating timetable: {error_message}")
        print(traceback.format_exc())
        
        return {
            "message": f"❌ Timetable generation failed due to unexpected error: {error_message}",
            "class_timetable": {},
            "teacher_timetable": {},
            "status": "ERROR",
            "error_type": "UNEXPECTED_ERROR",
            "error_details": {
                "original_error": error_message,
                "traceback": traceback.format_exc()
            }
        }

@app.post("/add")
async def add_timetable(request: Request):
    data = await request.json()
    india = timezone("Asia/Kolkata")
    data["createdAt"] = datetime.now(india).isoformat()
    result = collection.insert_one(data)
    inserted_doc = collection.find_one({"_id":result.inserted_id})
    inserted_doc["_id"] = str(inserted_doc["_id"])  
    return jsonable_encoder(inserted_doc)

@app.get("/get-timetables/{user_id}")
def get_timetables(user_id: str):
    data = []
    query = {"userId": user_id}  

    for doc in collection.find(query).sort("createdAt", pymongo.DESCENDING):
        doc["_id"] = str(doc["_id"])  
        if isinstance(doc.get("createdAt"), datetime):
            doc["createdAt"] = doc["createdAt"].isoformat()
        data.append(doc)

    return data

@app.put("/update-timetable/{timetable_id}")
async def update_timetable(timetable_id: str, request:Request):
    data = await request.json()
    india = timezone("Asia/Kolkata")
    updated_doc = collection.find_one_and_update(
        {"_id": ObjectId(timetable_id)},
        {"$set": {"class_timetable": data["class_timetable"],"teacher_timetable":data["teacher_timetable"],"createdAt":datetime.now(india).isoformat(),"teacherData":data["teacherData"]}},
        return_document=pymongo.ReturnDocument.AFTER
    )
    updated_doc["_id"] = str(updated_doc["_id"])  
    return jsonable_encoder(updated_doc)

@app.delete("/delete-timetable/{timetable_id}")
async def delete_timetable(timetable_id: str):
    result = collection.delete_one({"_id": ObjectId(timetable_id)})
    if result.deleted_count == 1:
        return {"message": "Deleted"}
    return {"message": "Not Found"}

@app.post("/validate-edit")
async def validate_edit(request: EditValidationRequest):
    errors = []
    warnings = []
    
    class_tt = request.class_timetable
    teacher_tt = request.teacher_timetable
    working_days = request.workingDays
    periods_per_day = request.periods
    classes = request.classes
    teachers_input = request.teachers
    
    # 1. Map teachers to their lab subjects and class teacher assignments
    teacher_labs = {}
    class_teachers = {}  # class -> (teacher_name, main_subject)
    
    for t in teachers_input:
        lab_subjects = []
        if t.labPeriod and t.labPeriod != "Select Lab Period":
            lab_subjects = [t.labPeriod]
        teacher_labs[t.name] = lab_subjects
        
        if t.assigned_class and t.assigned_class != "Select Class":
            class_teachers[t.assigned_class] = (t.name, t.mainSubject)
            
    # 2. Check for teacher double-booking (double allocation in the same period)
    for d in range(working_days):
        for p in range(periods_per_day):
            teacher_slots = defaultdict(list)  # teacher_name -> list of classes
            for cls in classes:
                if cls not in class_tt:
                    continue
                if d >= len(class_tt[cls]) or p >= len(class_tt[cls][d]):
                    continue
                
                entry = class_tt[cls][d][p]
                if entry and entry != "Free":
                    if "(" in entry and ")" in entry:
                        tname = entry.split("(")[1].split(")")[0]
                        teacher_slots[tname].append(cls)
            
            for tname, classes_assigned in teacher_slots.items():
                if len(classes_assigned) > 1:
                    errors.append(
                        f"Teacher '{tname}' is double-booked on Day {d+1}, Period {p+1} "
                        f"for classes: {', '.join(classes_assigned)}."
                    )
                    
    # 3. Check for Daily Subject Cap (max 2 periods of a subject per day in a class)
    for cls in classes:
        if cls not in class_tt:
            continue
        for d in range(working_days):
            if d >= len(class_tt[cls]):
                continue
            subject_counts = defaultdict(int)
            for p in range(periods_per_day):
                if p >= len(class_tt[cls][d]):
                    continue
                entry = class_tt[cls][d][p]
                if entry and entry != "Free":
                    if "(" in entry:
                        subject = entry.split("(")[0]
                        subject_counts[subject] += 1
                        
            for subject, count in subject_counts.items():
                if count > 2:
                    errors.append(
                        f"Class {cls} has {count} periods of '{subject}' on Day {d+1}. "
                        f"Maximum allowed is 2 periods per day."
                    )
                    
    # 4. Check for Lab consecutive block integrity
    for cls in classes:
        if cls not in class_tt:
            continue
        for d in range(working_days):
            if d >= len(class_tt[cls]):
                continue
            
            for p in range(periods_per_day):
                if p >= len(class_tt[cls][d]):
                    continue
                entry = class_tt[cls][d][p]
                if entry and entry != "Free" and "(" in entry and ")" in entry:
                    subject = entry.split("(")[0]
                    tname = entry.split("(")[1].split(")")[0]
                    
                    if tname in teacher_labs and subject in teacher_labs[tname]:
                        has_prev = (p > 0 and class_tt[cls][d][p-1] == entry)
                        has_next = (p < periods_per_day - 1 and p + 1 < len(class_tt[cls][d]) and class_tt[cls][d][p+1] == entry)
                        
                        if not (has_prev or has_next):
                            errors.append(
                                f"Lab subject '{subject}' (Teacher: {tname}) in Class {cls} on Day {d+1}, "
                                f"Period {p+1} must be scheduled consecutively in a double period block."
                            )
                            
    # 5. Class Teacher Main Subject First Period Warning (Soft Constraint)
    for cls, (tname, main_subject) in class_teachers.items():
        if cls not in class_tt:
            continue
        
        first_period_assignments = 0
        total_main_subject_periods = 0
        
        for d in range(working_days):
            if d >= len(class_tt[cls]):
                continue
            
            for p in range(periods_per_day):
                if p >= len(class_tt[cls][d]):
                    continue
                entry = class_tt[cls][d][p]
                if entry and entry != "Free" and "(" in entry and ")" in entry:
                    subject = entry.split("(")[0]
                    teacher = entry.split("(")[1].split(")")[0]
                    if subject == main_subject and teacher == tname:
                        total_main_subject_periods += 1
                        
            if len(class_tt[cls][d]) > 0:
                first_entry = class_tt[cls][d][0]
                if first_entry and first_entry != "Free" and "(" in first_entry and ")" in first_entry:
                    subject = first_entry.split("(")[0]
                    teacher = first_entry.split("(")[1].split(")")[0]
                    if subject == main_subject and teacher == tname:
                        first_period_assignments += 1
                        
        expected_first_periods = min(working_days, total_main_subject_periods)
        if first_period_assignments < expected_first_periods:
            warnings.append(
                f"Class teacher '{tname}' (Main Subject: '{main_subject}') has {first_period_assignments} "
                f"first periods assigned instead of the recommended {expected_first_periods} for Class {cls}."
            )
            
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    }

@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"message": "Timetable Generator API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
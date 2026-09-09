from flask import Flask, request
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

client = MongoClient("mongodb://localhost:27017/")
db = client["smart_medicine"]

patients_collection = db["patients"]
caretakers_collection = db["caretakers"]
medicines_collection = db["medicines"]

@app.route("/")
def home():
    return "Smart Medicine Reminder Backend is Working!"

@app.route("/api/register", methods=["POST"])
def register():
    data = request.json
    if not data:
        return {"message": "No data received"}, 400

    name = data.get("name")
    email = data.get("email")
    phone = data.get("phone")
    password = data.get("password")
    caretaker_name = data.get("caretaker_name")
    caretaker_email = data.get("caretaker_email")
    caretaker_phone = data.get("caretaker_phone")

    if not name or not email or not phone or not password:
        return {"message": "Please provide all patient details"}, 400

    if not caretaker_name or not caretaker_email or not caretaker_phone:
        return {"message": "Caretaker details are compulsory"}, 400

    if patients_collection.find_one({"email": email}):
        return {"message": "Patient email already registered"}, 409

    if caretakers_collection.find_one({"email": caretaker_email}):
        return {"message": "Caretaker email already registered"}, 409

    patient = {
        "name": name,
        "email": email,
        "phone": phone,
        "password": generate_password_hash(password)
    }

    patient_result = patients_collection.insert_one(patient)
    patient_id = str(patient_result.inserted_id)

    caretaker = {
        "name": caretaker_name,
        "email": caretaker_email,
        "phone": caretaker_phone,
        "password": generate_password_hash(password),
        "patient_id": patient_id
    }

    caretaker_result = caretakers_collection.insert_one(caretaker)
    caretaker_id = str(caretaker_result.inserted_id)

    patients_collection.update_one(
        {"_id": ObjectId(patient_id)},
        {"$set": {"caretaker_id": caretaker_id}}
    )

    return {
        "message": "Registration successful!",
        "patient_id": patient_id,
        "caretaker_id": caretaker_id
    }, 201

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    if not data:
        return {"message": "No data received"}, 400

    email = data.get("email")
    password = data.get("password")
    role = data.get("role")

    if not email or not password or not role:
        return {"message": "Please enter role, email and password"}, 400

    if role == "Patient":
        user = patients_collection.find_one({"email": email})
        if not user or not check_password_hash(user["password"], password):
            return {"message": "Invalid patient email or password"}, 401

        return {
            "message": "Login successful!",
            "user": {
                "id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
                "phone": user["phone"],
                "role": "Patient",
                "caretaker_id": user.get("caretaker_id")
            }
        }, 200

    if role == "Caretaker":
        user = caretakers_collection.find_one({"email": email})
        if not user or not check_password_hash(user["password"], password):
            return {"message": "Invalid caretaker email or password"}, 401

        return {
            "message": "Login successful!",
            "user": {
                "id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
                "phone": user["phone"],
                "role": "Caretaker",
                "patient_id": user.get("patient_id")
            }
        }, 200

    return {"message": "Invalid role"}, 400

@app.route("/api/medicines", methods=["POST"])
def add_medicine():
    data = request.json
    if not data:
        return {"message": "No data received"}, 400

    patient_id = data.get("patient_id")
    medicine_name = data.get("medicine_name")
    dosage = data.get("dosage")
    date = data.get("date")
    time_of_day = data.get("time_of_day")

    if not patient_id or not medicine_name or not dosage or not date or not time_of_day:
        return {"message": "Please provide patient ID, medicine name, dosage, date and time"}, 400

    try:
        patient = patients_collection.find_one({"_id": ObjectId(patient_id)})
    except Exception:
        return {"message": "Invalid patient ID"}, 400

    if not patient:
        return {"message": "Patient not found"}, 404

    medicine = {
        "patient_id": patient_id,
        "caretaker_id": patient.get("caretaker_id"),
        "medicine_name": medicine_name,
        "dosage": dosage,
        "date": date,
        "time_of_day": time_of_day,
        "status": "scheduled",
        "created_at": datetime.now()
    }

    result = medicines_collection.insert_one(medicine)

    return {
        "message": "Medicine added successfully!",
        "id": str(result.inserted_id)
    }, 201

@app.route("/api/caretaker/schedule", methods=["POST"])
def caretaker_schedule():
    data = request.json
    if not data:
        return {"message": "No data received"}, 400

    caretaker_id = data.get("caretaker_id")
    medicine_name = data.get("medicine_name")
    dosage = data.get("dosage")
    date = data.get("date")
    time_of_day = data.get("time_of_day")

    if not caretaker_id:
        return {"message": "Caretaker ID is required"}, 400

    if not medicine_name or not dosage or not date or not time_of_day:
        return {"message": "Medicine name, dosage, date and time are required"}, 400

    try:
        caretaker = caretakers_collection.find_one({"_id": ObjectId(caretaker_id)})
    except Exception:
        return {"message": "Invalid caretaker ID"}, 400

    if not caretaker:
        return {"message": "Caretaker not found"}, 404

    patient_id = caretaker.get("patient_id")

    if not patient_id:
        return {"message": "No patient linked to this caretaker"}, 404

    try:
        patient = patients_collection.find_one({"_id": ObjectId(patient_id)})
    except Exception:
        return {"message": "Invalid patient ID"}, 400

    if not patient:
        return {"message": "Linked patient not found"}, 404

    if patient.get("caretaker_id") != caretaker_id:
        return {"message": "Caretaker is not linked to this patient"}, 403

    medicine = {
        "patient_id": patient_id,
        "caretaker_id": caretaker_id,
        "medicine_name": medicine_name,
        "dosage": dosage,
        "date": date,
        "time_of_day": time_of_day,
        "status": "scheduled",
        "created_at": datetime.now()
    }

    result = medicines_collection.insert_one(medicine)

    return {
        "message": "Medicine scheduled successfully!",
        "id": str(result.inserted_id),
        "patient_name": patient.get("name", "")
    }, 201

@app.route("/api/medicines/<patient_id>", methods=["GET"])
def get_medicines(patient_id):
    try:
        ObjectId(patient_id)
    except Exception:
        return {"message": "Invalid patient ID"}, 400

    medicines = medicines_collection.find({
        "patient_id": patient_id
    }).sort([
        ("date", 1),
        ("time_of_day", 1)
    ])

    result = []

    for medicine in medicines:
        result.append({
            "id": str(medicine["_id"]),
            "patient_id": medicine.get("patient_id"),
            "caretaker_id": medicine.get("caretaker_id"),
            "medicine_name": medicine.get("medicine_name", ""),
            "dosage": medicine.get("dosage", ""),
            "date": medicine.get("date", ""),
            "time_of_day": medicine.get("time_of_day", ""),
            "status": medicine.get("status", "scheduled")
        })

    return result, 200

@app.route("/api/medicines/<medicine_id>/taken", methods=["PUT"])
def mark_taken(medicine_id):
    try:
        object_id = ObjectId(medicine_id)
    except Exception:
        return {"message": "Invalid medicine ID"}, 400

    result = medicines_collection.update_one(
        {"_id": object_id, "status": "scheduled"},
        {"$set": {"status": "taken", "taken_at": datetime.now()}}
    )

    if result.matched_count == 0:
        return {"message": "Medicine not found or already processed"}, 404

    return {"message": "Medicine marked as taken"}, 200

@app.route("/api/medicines/<medicine_id>/missed", methods=["PUT"])
def mark_missed(medicine_id):
    try:
        object_id = ObjectId(medicine_id)
    except Exception:
        return {"message": "Invalid medicine ID"}, 400

    result = medicines_collection.update_one(
        {"_id": object_id, "status": "scheduled"},
        {"$set": {"status": "missed", "missed_at": datetime.now()}}
    )

    if result.matched_count == 0:
        return {"message": "Medicine not found or already processed"}, 404

    return {"message": "Medicine marked as missed"}, 200

@app.route("/api/medicines/<medicine_id>", methods=["DELETE"])
def delete_medicine(medicine_id):
    try:
        object_id = ObjectId(medicine_id)
    except Exception:
        return {"message": "Invalid medicine ID"}, 400

    result = medicines_collection.delete_one({"_id": object_id})

    if result.deleted_count == 0:
        return {"message": "Medicine not found"}, 404

    return {"message": "Medicine removed successfully!"}, 200

@app.route("/api/patients/<patient_id>", methods=["GET"])
def get_patient(patient_id):
    try:
        patient = patients_collection.find_one({"_id": ObjectId(patient_id)})
    except Exception:
        return {"message": "Invalid patient ID"}, 400

    if not patient:
        return {"message": "Patient not found"}, 404

    return {
        "id": str(patient["_id"]),
        "name": patient.get("name", ""),
        "email": patient.get("email", ""),
        "phone": patient.get("phone", ""),
        "caretaker_id": patient.get("caretaker_id")
    }, 200

@app.route("/api/caretakers/<caretaker_id>", methods=["GET"])
def get_caretaker(caretaker_id):
    try:
        caretaker = caretakers_collection.find_one({"_id": ObjectId(caretaker_id)})
    except Exception:
        return {"message": "Invalid caretaker ID"}, 400

    if not caretaker:
        return {"message": "Caretaker not found"}, 404

    return {
        "id": str(caretaker["_id"]),
        "name": caretaker.get("name", ""),
        "email": caretaker.get("email", ""),
        "phone": caretaker.get("phone", ""),
        "patient_id": caretaker.get("patient_id")
    }, 200

def check_missed_medicines():
    now = datetime.now()
    cutoff_time = now - timedelta(minutes=5)
    today = cutoff_time.strftime("%Y-%m-%d")
    current_time = cutoff_time.strftime("%H:%M")

    medicines = medicines_collection.find({
        "status": "scheduled",
        "date": today,
        "time_of_day": {"$lte": current_time}
    })

    for medicine in medicines:
        result = medicines_collection.update_one(
            {"_id": medicine["_id"], "status": "scheduled"},
            {"$set": {
                "status": "missed",
                "missed_at": now
            }}
        )

        if result.modified_count == 1:
            print(
                f"Medicine missed: {medicine.get('medicine_name', 'Unknown')}"
            )

scheduler = BackgroundScheduler()
scheduler.add_job(
    func=check_missed_medicines,
    trigger="interval",
    minutes=1,
    id="medicine_checker",
    replace_existing=True
)
scheduler.start()

if __name__ == "__main__":
    print("Smart Medicine Reminder Backend Started")
    print("Automatic 5-minute missed medicine checker is running")
    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000,
        use_reloader=False
    )
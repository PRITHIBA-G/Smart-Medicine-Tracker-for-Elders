const API_URL = "http://127.0.0.1:5000";
const user = JSON.parse(localStorage.getItem("user"));

if (!user || user.role !== "Caretaker") {
    window.location.href = "index.html";
}
function logoutUser() {
    localStorage.removeItem("user");
    window.location.href = "index.html";
}
const medicineForm = document.getElementById("medicineForm");
const medicineList = document.getElementById("medicineList");
const medicineMessage = document.getElementById("medicineMessage");
const patientInfo = document.getElementById("patientInfo");

let patientId = user.patient_id;

loadPatient();
loadMedicines();

medicineForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const medicineName = document.getElementById("medName").value.trim();
    const dosage = document.getElementById("dosage").value.trim();
    const date = document.getElementById("medicineDate").value;
    const time = document.getElementById("medicineTime").value;

    if (!medicineName || !dosage || !date || !time) {
        showMessage("Please fill in all medicine details.", "danger");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/caretaker/schedule`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                caretaker_id: user.id,
                medicine_name: medicineName,
                dosage: dosage,
                date: date,
                time_of_day: time
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(
                data.message || "Unable to schedule medicine.",
                "danger"
            );
            return;
        }

        showMessage(
            "Medicine scheduled successfully for the patient!",
            "success"
        );

        medicineForm.reset();
        setTodayAsDefaultDate();
        loadMedicines();

    } catch (error) {
        console.error("Schedule error:", error);

        showMessage(
            "Unable to connect to the server.",
            "danger"
        );
    }
});

async function loadPatient() {
    if (!patientId) {
        patientInfo.innerHTML = `
            <span class="text-danger">
                No patient is linked to this caretaker.
            </span>
        `;
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/api/patients/${patientId}`
        );

        const patient = await response.json();

        if (!response.ok) {
            patientInfo.innerHTML = `
                <span class="text-danger">
                    ${patient.message || "Unable to load patient."}
                </span>
            `;
            return;
        }

        patientInfo.innerHTML = `
            <strong>Name:</strong> ${escapeHTML(patient.name)}
            <br>
            <strong>Email:</strong> ${escapeHTML(patient.email)}
            <br>
            <strong>Phone:</strong> ${escapeHTML(patient.phone)}
        `;

    } catch (error) {
        console.error("Patient loading error:", error);

        patientInfo.innerHTML = `
            <span class="text-danger">
                Unable to connect to the server.
            </span>
        `;
    }
}

async function loadMedicines() {
    if (!patientId) {
        medicineList.innerHTML = `
            <div class="empty-message">
                No patient is linked.
            </div>
        `;
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/api/medicines/${patientId}`
        );

        const medicines = await response.json();

        if (!response.ok) {
            medicineList.innerHTML = `
                <div class="alert alert-danger">
                    ${medicines.message || "Unable to load medicines."}
                </div>
            `;
            return;
        }

        displayMedicines(medicines);

    } catch (error) {
        console.error("Medicine loading error:", error);

        medicineList.innerHTML = `
            <div class="alert alert-danger">
                Unable to connect to the server.
            </div>
        `;
    }
}

function displayMedicines(medicines) {
    if (!medicines || medicines.length === 0) {
        medicineList.innerHTML = `
            <div class="empty-message">
                No medicines scheduled for the patient.
            </div>
        `;
        return;
    }

    medicineList.innerHTML = "";

    medicines.forEach(function(medicine) {
        let statusClass = "status-scheduled";

        if (medicine.status === "taken") {
            statusClass = "status-taken";
        }

        if (medicine.status === "missed") {
            statusClass = "status-missed";
        }

        const medicineItem = document.createElement("div");
        medicineItem.className = "medicine-item";

        medicineItem.innerHTML = `
            <div>
                <strong>
                    ${escapeHTML(medicine.medicine_name)}
                </strong>

                <br>

                <small>
                    Dosage: ${escapeHTML(medicine.dosage)}
                </small>

                <br>

                <small>
                    Date: ${escapeHTML(medicine.date)}
                </small>

                <br>

                <small>
                    Time: ${formatTime(medicine.time_of_day)}
                </small>
            </div>

            <div class="text-end">
                <div class="status ${statusClass}">
                    ${capitalize(medicine.status)}
                </div>

                ${
                    medicine.status === "scheduled"
                    ? `
                        <button
                            class="btn btn-sm btn-danger mt-2"
                            onclick="deleteMedicine('${medicine.id}')"
                        >
                            Delete
                        </button>
                    `
                    : `
                        <button
                            class="btn btn-sm btn-outline-danger mt-2"
                            onclick="deleteMedicine('${medicine.id}')"
                        >
                            Delete
                        </button>
                    `
                }
            </div>
        `;

        medicineList.appendChild(medicineItem);
    });
}

async function deleteMedicine(medicineId) {
    const confirmDelete = confirm(
        "Are you sure you want to delete this medicine?"
    );

    if (!confirmDelete) {
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/api/medicines/${medicineId}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Unable to delete medicine.");
            return;
        }

        loadMedicines();

    } catch (error) {
        console.error("Delete error:", error);
        alert("Unable to connect to the server.");
    }
}

function showMessage(text, type) {
    medicineMessage.textContent = text;
    medicineMessage.className = `alert alert-${type}`;
    medicineMessage.style.display = "block";

    setTimeout(function() {
        medicineMessage.style.display = "none";
    }, 3000);
}

function setTodayAsDefaultDate() {
    const dateInput = document.getElementById("medicineDate");

    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    dateInput.value = `${year}-${month}-${day}`;
}

function formatTime(time) {
    if (!time) {
        return "";
    }

    const parts = time.split(":");

    if (parts.length < 2) {
        return time;
    }

    let hour = parseInt(parts[0]);
    const minute = parts[1];

    const period = hour >= 12 ? "PM" : "AM";

    hour = hour % 12;

    if (hour === 0) {
        hour = 12;
    }

    return `${hour}:${minute} ${period}`;
}

function capitalize(text) {
    if (!text) {
        return "";
    }

    return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
}

setTodayAsDefaultDate();
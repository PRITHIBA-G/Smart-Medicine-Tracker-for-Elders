const API_URL = "http://127.0.0.1:5000";
const user = JSON.parse(localStorage.getItem("user"));

if (!user || user.role !== "Patient") {
    window.location.href = "index.html";
}
function logoutUser() {
    localStorage.removeItem("user");
    window.location.href = "index.html";
}

const medicineForm = document.getElementById("medicineForm");
const medicineList = document.getElementById("medicineList");
const medicineMessage = document.getElementById("medicineMessage");
const caretakerInfo = document.getElementById("caretakerInfo");

loadCaretaker();
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
        const response = await fetch(`${API_URL}/api/medicines`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                patient_id: user.id,
                medicine_name: medicineName,
                dosage: dosage,
                date: date,
                time_of_day: time
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.message || "Unable to add medicine.", "danger");
            return;
        }

        showMessage("Medicine added successfully!", "success");

        medicineForm.reset();

        setTodayAsDefaultDate();

        loadMedicines();

    } catch (error) {
        console.error(error);
        showMessage(
            "Unable to connect to the server.",
            "danger"
        );
    }
});

async function loadMedicines() {
    try {
        const response = await fetch(
            `${API_URL}/api/medicines/${user.id}`
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
        console.error(error);

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
                No medicines scheduled yet.
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
                <strong>${escapeHTML(medicine.medicine_name)}</strong>
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
                            class="btn btn-sm btn-success mt-2"
                            onclick="markMedicineTaken('${medicine.id}')"
                        >
                            ✓ Taken
                        </button>

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

async function markMedicineTaken(medicineId) {
    try {
        const response = await fetch(
            `${API_URL}/api/medicines/${medicineId}/taken`,
            {
                method: "PUT"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Unable to update medicine.");
            return;
        }

        loadMedicines();

    } catch (error) {
        console.error(error);
        alert("Unable to connect to the server.");
    }
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
        console.error(error);
        alert("Unable to connect to the server.");
    }
}

async function loadCaretaker() {
    if (!user.caretaker_id) {
        caretakerInfo.innerHTML = `
            <span class="text-danger">
                No caretaker linked.
            </span>
        `;
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/api/caretakers/${user.caretaker_id}`
        );

        const caretaker = await response.json();

        if (!response.ok) {
            caretakerInfo.innerHTML = `
                <span class="text-danger">
                    Unable to load caretaker information.
                </span>
            `;
            return;
        }

        caretakerInfo.innerHTML = `
            <strong>Name:</strong> ${escapeHTML(caretaker.name)}
            <br>
            <strong>Email:</strong> ${escapeHTML(caretaker.email)}
            <br>
            <strong>Phone:</strong> ${escapeHTML(caretaker.phone)}
        `;

    } catch (error) {
        console.error(error);

        caretakerInfo.innerHTML = `
            <span class="text-danger">
                Unable to connect to the server.
            </span>
        `;
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
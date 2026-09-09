const API_URL = "http://127.0.0.1:5000";

const registerForm = document.getElementById("registerForm");
const message = document.getElementById("message");

registerForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;

    const caretakerName = document.getElementById("caretaker_name").value.trim();
    const caretakerEmail = document.getElementById("caretaker_email").value.trim();
    const caretakerPhone = document.getElementById("caretaker_phone").value.trim();

    if (
        !name ||
        !email ||
        !phone ||
        !password ||
        !caretakerName ||
        !caretakerEmail ||
        !caretakerPhone
    ) {
        showMessage("Please fill in all fields.", "danger");
        return;
    }

    if (password.length < 6) {
        showMessage("Password must contain at least 6 characters.", "danger");
        return;
    }

    if (email.toLowerCase() === caretakerEmail.toLowerCase()) {
        showMessage(
            "Patient and caretaker must use different email addresses.",
            "danger"
        );
        return;
    }

    const registrationData = {
        name: name,
        email: email,
        phone: phone,
        password: password,
        caretaker_name: caretakerName,
        caretaker_email: caretakerEmail,
        caretaker_phone: caretakerPhone
    };

    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(registrationData)
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(
                data.message || "Registration failed.",
                "danger"
            );
            return;
        }

        showMessage(
            "Registration successful! Redirecting to login...",
            "success"
        );

        registerForm.reset();

        setTimeout(function() {
            window.location.href = "index.html";
        }, 1500);

    } catch (error) {
        console.error("Registration error:", error);

        showMessage(
            "Unable to connect to the server. Please make sure Flask is running.",
            "danger"
        );
    }
});

function showMessage(text, type) {
    message.textContent = text;
    message.className = `alert alert-${type}`;
    message.style.display = "block";
}
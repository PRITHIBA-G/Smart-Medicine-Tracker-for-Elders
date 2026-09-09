const API_URL = "http://127.0.0.1:5000";

const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const role = document.getElementById("role").value;
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!role || !email || !password) {
        showMessage("Please fill in all fields.", "danger");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                role: role,
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.message || "Login failed.", "danger");
            return;
        }

        localStorage.setItem("user", JSON.stringify(data.user));

        showMessage("Login successful! Redirecting...", "success");

        setTimeout(function() {
            if (data.user.role === "Patient") {
                window.location.href = "dashboard.html";
            } else if (data.user.role === "Caretaker") {
                window.location.href = "caretaker.html";
            }
        }, 800);

    } catch (error) {
        console.error("Login error:", error);
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
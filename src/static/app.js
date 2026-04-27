document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginToggle = document.getElementById("login-toggle");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginCancel = document.getElementById("login-cancel");
  const loginMessage = document.getElementById("login-message");
  const teacherStatus = document.getElementById("teacher-status");
  const signupHelp = document.getElementById("signup-help");
  const emailInput = document.getElementById("email");
  const teacherUsername = document.getElementById("teacher-username");
  const teacherPassword = document.getElementById("teacher-password");

  let teacherToken = localStorage.getItem("teacherToken");
  let teacherName = localStorage.getItem("teacherName");

  function isTeacherLoggedIn() {
    return Boolean(teacherToken);
  }

  function authHeaders() {
    return teacherToken ? { Authorization: `Bearer ${teacherToken}` } : {};
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateAuthState() {
    const loginButton = signupForm.querySelector("button");
    if (isTeacherLoggedIn()) {
      teacherStatus.textContent = `Logged in as ${teacherName}`;
      loginToggle.textContent = "Logout";
      signupHelp.textContent = "Teacher logged in. You can register or unregister students.";
      loginButton.disabled = false;
      emailInput.disabled = false;
      activitySelect.disabled = false;
    } else {
      teacherStatus.textContent = "View mode";
      loginToggle.textContent = "Teacher Login";
      signupHelp.textContent = "Only teachers may register or unregister students. Please log in first.";
      loginButton.disabled = true;
      emailInput.disabled = true;
      activitySelect.disabled = true;
    }
  }

  function showLoginModal() {
    loginModal.classList.remove("hidden");
    loginMessage.classList.add("hidden");
    teacherUsername.value = "";
    teacherPassword.value = "";
  }

  function hideLoginModal() {
    loginModal.classList.add("hidden");
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = "<option value=\"\">-- Select an activity --</option>";

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
                <h5>Participants:</h5>
                <ul class="participants-list">
                  ${details.participants
                    .map((email) =>
                      `<li><span class="participant-email">${email}</span>${isTeacherLoggedIn() ? ` <button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ""}</li>`
                    )
                    .join("")}
                </ul>
              </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  loginToggle.addEventListener("click", () => {
    if (isTeacherLoggedIn()) {
      teacherToken = null;
      teacherName = null;
      localStorage.removeItem("teacherToken");
      localStorage.removeItem("teacherName");
      updateAuthState();
      fetchActivities();
      showMessage("Logged out successfully.", "info");
    } else {
      showLoginModal();
    }
  });

  loginCancel.addEventListener("click", hideLoginModal);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = teacherUsername.value.trim();
    const password = teacherPassword.value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        teacherToken = result.token;
        teacherName = result.username;
        localStorage.setItem("teacherToken", teacherToken);
        localStorage.setItem("teacherName", teacherName);
        updateAuthState();
        hideLoginModal();
        fetchActivities();
        showMessage(result.message, "success");
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Unable to log in. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  updateAuthState();
  fetchActivities();
});

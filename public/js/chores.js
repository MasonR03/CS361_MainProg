// public/js/chores.js

// A helper function to fetch the logged in user
function getUserInfo() {
    return fetch("/api/user")
      .then((res) => res.json())
      .then((data) => data.user);
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    const userInfoDiv = document.getElementById("user-info");
    const createChoreContainer = document.getElementById("create-chore-container");
  
    // First, get the logged-in user info
    getUserInfo().then(user => {
      if (user) {
        // Display who is logged in
        userInfoDiv.textContent = `Logged in as: ${user.username} (${user.role})`;
        
        // If the user is not an organizer, hide the create chore section.
        if (user.role !== "organizer") {
          createChoreContainer.style.display = "none";
        }
      } else {
        // If no user info is found, redirect to login page.
        window.location.href = "/login.html";
      }
    }).catch(err => {
      console.error("Error fetching user info:", err);
      window.location.href = "/login.html";
    });
  
    // Then, fetch chores from the server
    fetch("/api/chores")
      .then((res) => {
        if (res.ok) return res.json();
        // If not authenticated, redirect to login.
        window.location.href = "/login.html";
      })
      .then((data) => {
        if (!data) return;
        const chores = data.chores || [];
        renderChores(chores);
      })
      .catch((err) => {
        console.error("Error fetching chores:", err);
        alert("Could not fetch chores. Are you logged in?");
        window.location.href = "/login.html";
      });
      
    const logoutLink = document.getElementById("logout-link");
    if (logoutLink) {
        logoutLink.addEventListener("click", (e) => {
          // Show a confirmation dialog
          const confirmed = confirm("Are you sure you want to log out?");
          // If the user clicks 'Cancel', prevent the logout
          if (!confirmed) {
            e.preventDefault();
          }
        });
    }  

    // Handle the create chore form submission
    const createForm = document.getElementById("create-chore-form");
    if (createForm) {
      createForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const formData = new FormData(createForm);
        // Convert FormData to URLSearchParams so our server can parse it
        const searchParams = new URLSearchParams(formData);
  
        fetch("/api/chores", {
          method: "POST",
          body: searchParams,
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) {
              alert("Error: " + data.error);
            } else {
              alert("Chore created!");
              window.location.reload(); // Simple way to refresh chores list
            }
          })
          .catch((err) => {
            console.error("Error creating chore:", err);
          });
      });
    }
  });
  
  // Render the list of chores into the #chore-list div.
  function renderChores(chores) {
    const choreListDiv = document.getElementById("chore-list");
    if (chores.length === 0) {
      choreListDiv.innerHTML = "<p>No chores yet.</p>";
      return;
    }
  
    let html = "<table border='1'><tr><th>Title</th><th>Assigned To</th><th>Status</th><th>Actions</th></tr>";
    chores.forEach((chore) => {
      html += `<tr>
        <td>${chore.title}</td>
        <td>${chore.assignedTo}</td>
        <td>${chore.completed ? "Completed" : "Pending"}</td>
        <td>
            ${
            !chore.completed
                ? `<button onclick="markComplete(${chore.id})">Mark Complete</button>`
                : `<button onclick="deleteChore(${chore.id})">Delete</button>`
            }
        </td>
      </tr>`;
    });
    html += "</table>";
    choreListDiv.innerHTML = html;
  }
  
  // Mark a chore as complete
  function markComplete(choreId) {
    fetch(`/api/chores/${choreId}/complete`, {
      method: "POST",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert("Error: " + data.error);
        } else {
          alert("Chore marked as complete!");
          window.location.reload();
        }
      })
      .catch((err) => {
        console.error("Error completing chore:", err);
      });
  }

  // Delete a chore (only allowed if chore is complete)
function deleteChore(choreId) {
    fetch(`/api/chores/${choreId}/delete`, {
      method: "POST",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert("Error: " + data.error);
        } else {
          alert("Chore deleted!");
          window.location.reload(); // Refresh the list after deletion
        }
      })
      .catch((err) => {
        console.error("Error deleting chore:", err);
      });
  }
  
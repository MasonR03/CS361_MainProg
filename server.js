const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const path = require("path");

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

/****************************************************
 * Middleware
 ****************************************************/


app.use(express.urlencoded({ extended: true }));

// Session management
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// Serve static files from "public" directory
app.use(express.static(path.join(__dirname, "public")));

/****************************************************
 * In-Memory Data
 ****************************************************/
let users = [];  // { username, passwordHash, role }
let chores = []; // { id, title, assignedTo, completed, createdBy }

/****************************************************
 * Helper Functions
 ****************************************************/
// Check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  // Not logged in, redirect to login page
  return res.redirect("/login.html");
}

// Check if user is an organizer
function isOrganizer(req, res, next) {
  if (req.session.user && req.session.user.role === "organizer") {
    return next();
  }
  return res.status(403).send("Access denied. Must be an organizer.");
}

/****************************************************
 * Routes
 ****************************************************/

/**
 * GET /
 * Serve homepage (index.html)
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/**
 * POST /register
 * Handle registration form submission
 */
app.post("/register", async (req, res) => {
  const { username, password, role } = req.body;

  // Simple validation
  if (!username || !password || !role) {
    return res.status(400).send("Missing fields: username/password/role");
  }

  // Check if user already exists
  const existingUser = users.find((u) => u.username === username);
  if (existingUser) {
    return res.status(400).send("Username already taken.");
  }

  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const newUser = { username, passwordHash, role };
  users.push(newUser);

  // Redirect to login page
  return res.redirect("/login.html");
});

/**
 * POST /login
 * Handle login form submission
 */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // Find user
  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(401).send("Invalid username or password.");
  }

  // Compare hashed password
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).send("Invalid username or password.");
  }

  // Store user info in session
  req.session.user = {
    username: user.username,
    role: user.role,
  };

  // Redirect to chores page
  return res.redirect("/chores.html");
});

/**
 * GET /logout
 * Clear session
 */
app.get("/logout", (req, res) => {
  req.session.destroy(() => {});
  res.redirect("/"); // Go back to home
});

/**
 * GET /api/chores
 * Return chores in JSON (auth required)
 */
app.get("/api/chores", isAuthenticated, (req, res) => {
  // In a more advanced version, you could filter chores by user's household, etc.
  return res.json({ chores });
});

/**
 * POST /api/chores
 * Create new chore (organizer only)
 */
app.post("/api/chores", isAuthenticated, isOrganizer, (req, res) => {
  const { title, assignedTo } = req.body;
  if (!title || !assignedTo) {
    return res.status(400).json({ error: "title and assignedTo required" });
  }

  const newChore = {
    id: chores.length + 1,
    title,
    assignedTo,
    completed: false,
    createdBy: req.session.user.username,
  };
  chores.push(newChore);

  return res.json({ message: "Chore created", chore: newChore });
});

/**
 * POST /api/chores/:id/complete
 * Mark chore complete (auth required)
 */
app.post("/api/chores/:id/complete", isAuthenticated, (req, res) => {
  const choreId = parseInt(req.params.id, 10);
  const chore = chores.find((c) => c.id === choreId);

  if (!chore) {
    return res.status(404).json({ error: "Chore not found" });
  }

  chore.completed = true;
  return res.json({ message: "Chore marked as completed", chore });
});

/**
 * GET /api/user
 * Returns the current logged-in user info from the session.
 */
app.get("/api/user", (req, res) => {
    if (req.session.user) {
      return res.json({ user: req.session.user });
    }
    return res.json({ user: null });
  });
  

/**
 * POST /api/chores/:id/delete
 * Deletes a chore if it is marked as complete.
 */
app.post("/api/chores/:id/delete", isAuthenticated, (req, res) => {
    const choreId = parseInt(req.params.id, 10);
    const choreIndex = chores.findIndex((c) => c.id === choreId);
  
    if (choreIndex === -1) {
      return res.status(404).json({ error: "Chore not found." });
    }
  
    // Only allow deletion if the chore is complete
    if (!chores[choreIndex].completed) {
      return res.status(400).json({ error: "Only completed chores can be deleted." });
    }
  
    // Remove the chore from the in-memory array
    chores.splice(choreIndex, 1);
    return res.json({ message: "Chore deleted successfully." });
  });
  

/****************************************************
 * Start Server
 ****************************************************/
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const jwt = require("jsonwebtoken");

const app = express();

const PORT = process.env.PORT || 10000;
const JWT_SECRET =
  process.env.JWT_SECRET || "accunumbo-secret-change-this-later";

// -----------------------------
// DATABASE
// -----------------------------

const db = new Database("accunumbo.db");

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'student',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// -----------------------------
// AUTH MIDDLEWARE
// -----------------------------

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      ok: false,
      message: "Authentication token required."
    });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      ok: false,
      message: "Invalid authorization header."
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();

  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: "Invalid or expired token."
    });
  }
}


// -----------------------------
// CURRENT USER
// -----------------------------

app.get("/api/me", authenticateToken, (req, res) => {
  try {

    const user = db
      .prepare(`
        SELECT id, name, email, role, created_at
        FROM users
        WHERE id = ?
      `)
      .get(req.user.id);

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "User not found."
      });
    }

    res.json({
      ok: true,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      },

      progress: [
        {
          adventure: 1,
          xp: 0,
          coins: 0,
          badges: 0,
          completed_tasks: 0
        }
      ]
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Failed to load user data."
    });

  }
});

// -----------------------------
// HOME
// -----------------------------

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// -----------------------------
// HEALTH CHECK
// -----------------------------

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "AccuNumbo Adventures"
  });
});

// -----------------------------
// REGISTER
// -----------------------------

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        ok: false,
        message: "Please fill all fields."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        ok: false,
        message: "Password must contain at least 6 characters."
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(cleanEmail);

    if (existingUser) {
      return res.status(409).json({
        ok: false,
        message: "An account with this email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db
      .prepare(`
        INSERT INTO users (name, email, password)
        VALUES (?, ?, ?)
      `)
      .run(name.trim(), cleanEmail, hashedPassword);

    const token = jwt.sign(
      {
        id: result.lastInsertRowid,
        email: cleanEmail,
        role: "student"
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      ok: true,
      message: "Account created successfully!",
      token,
      user: {
        id: result.lastInsertRowid,
        name: name.trim(),
        email: cleanEmail,
        role: "student"
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Registration failed."
    });
  }
});

// -----------------------------
// LOGIN
// -----------------------------

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: "Email and password are required."
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(cleanEmail);

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Invalid email or password."
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        ok: false,
        message: "Invalid email or password."
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      ok: true,
      message: "Login successful!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Login failed."
    });
  }
});

// -----------------------------
// START SERVER
// -----------------------------

app.listen(PORT, () => {
  console.log(`AccuNumbo Adventures running on port ${PORT}`);
});

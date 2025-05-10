const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const db = require("./db/database");
const fetch = require("node-fetch");
require("dotenv").config();
const NodeGeocoder = require('node-geocoder');

const geocoder = NodeGeocoder({ provider: 'openstreetmap' });

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: "secret-key",
  resave: false,
  saveUninitialized: false,
}));

// Middleware to protect routes
function ensureAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}

// Homepage
app.get("/", async (req, res) => {
  const contacts = await db.getContacts();
  res.render("index", { contacts, user: req.session.user });
});

// Add contact with geolocation
app.post("/add", async (req, res) => {
  const data = req.body;
  try {
    const geo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(data.address)}`).then(res => res.json());
    const lat = geo[0]?.lat || null;
    const lon = geo[0]?.lon || null;
    await db.addContact({ ...data, latitude: lat, longitude: lon });
  } catch (e) {
    console.error("Geocoding error:", e);
  }
  res.redirect("/");
});

// Edit contact
app.get("/edit/:id", ensureAuthenticated, async (req, res) => {
  const contact = await db.getContactById(req.params.id);
  res.render("edit", { contact, user: req.session.user });
});

app.post("/edit/:id", ensureAuthenticated, async (req, res) => {
  await db.updateContact(req.params.id, req.body);
  res.redirect("/");
});

// Delete contact
app.post("/delete/:id", ensureAuthenticated, async (req, res) => {
  await db.deleteContact(req.params.id);
  res.redirect("/");
});

// Login
app.get("/login", (req, res) => res.render("login", { error: null }));

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await db.getUserByUsername(username);
  if (user && bcrypt.compareSync(password, user.passwordHash)) {
    req.session.user = { id: user.id, username: user.username };
    return res.redirect("/");
  }
  res.render("login", { error: "Invalid username or password." });
});

// Register
app.get("/register", (req, res) => res.render("register", { error: null }));

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const passwordHash = bcrypt.hashSync(password, 10);
  try {
    await db.addUser({ username, passwordHash });
    res.redirect("/login");
  } catch (err) {
    console.error("Registration error:", err);
    res.render("register", { error: "Username already taken." });
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// Ensure default user exists
db.ensureDefaultUser();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

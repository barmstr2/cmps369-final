const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "contacts.db");
const db = new sqlite3.Database(dbPath);

// Create tables if they don’t exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT,
    lastName TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    prefix TEXT,
    contactMail INTEGER,
    contactPhone INTEGER,
    contactEmail INTEGER,
    latitude REAL,
    longitude REAL
  )`);
});

module.exports = {
  getContacts: () => new Promise((resolve, reject) => {
    db.all("SELECT * FROM contacts", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  }),

  getContactById: (id) => new Promise((resolve, reject) => {
    db.get("SELECT * FROM contacts WHERE id = ?", [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  }),

  addContact: (contact) => new Promise((resolve, reject) => {
    const stmt = `INSERT INTO contacts (firstName, lastName, address, phone, email, prefix, contactMail, contactPhone, contactEmail, latitude, longitude)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      contact.firstName, contact.lastName, contact.address, contact.phone, contact.email,
      contact.prefix, contact.contactMail ? 1 : 0, contact.contactPhone ? 1 : 0, contact.contactEmail ? 1 : 0,
      contact.latitude, contact.longitude
    ];
    db.run(stmt, params, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  }),

  updateContact: (id, contact) => new Promise((resolve, reject) => {
    const stmt = `UPDATE contacts SET firstName=?, lastName=?, address=?, phone=?, email=?, prefix=?, contactMail=?, contactPhone=?, contactEmail=? WHERE id=?`;
    const params = [
      contact.firstName, contact.lastName, contact.address, contact.phone, contact.email,
      contact.prefix, contact.contactMail ? 1 : 0, contact.contactPhone ? 1 : 0, contact.contactEmail ? 1 : 0, id
    ];
    db.run(stmt, params, function (err) {
      if (err) reject(err);
      else resolve();
    });
  }),

  deleteContact: (id) => new Promise((resolve, reject) => {
    db.run("DELETE FROM contacts WHERE id = ?", [id], (err) => {
      if (err) reject(err);
      else resolve();
    });
  }),

  getUserByUsername: (username) => new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  }),

  addUser: (user) => new Promise((resolve, reject) => {
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [user.username, user.password], function (err) {
      if (err) reject(err);
      else resolve();
    });
  }),

  ensureDefaultUser: () => {
    db.get("SELECT * FROM users WHERE username = 'rcnj'", (err, row) => {
      if (!row) {
        const hash = bcrypt.hashSync("password", 10);
        db.run("INSERT INTO users (username, password) VALUES (?, ?)", ["rcnj", hash]);
      }
    });
  }
};
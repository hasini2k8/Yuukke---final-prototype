// Real signup/login backed by SQLite (server/db.js) — hashed passwords
// (Node's built-in scrypt, no extra dependency) and token-based sessions.
// Local dev only, same persistence caveat as every other store in this
// project (see productStore.js).
import crypto from "node:crypto";
import { get, run } from "./db.js";

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    businessName: row.business_name || "",
    createdAt: row.created_at,
  };
}

function createSession(row) {
  const token = crypto.randomBytes(32).toString("hex");
  run("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)", [
    token, row.id, new Date().toISOString(),
  ]);
  return { token, user: toPublicUser(row) };
}

export async function signup({ email, password, businessName }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) throw new Error("Email and password are required.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  const existing = get("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
  if (existing) throw new Error("An account with that email already exists.");

  const salt = crypto.randomBytes(16).toString("hex");
  const row = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    password_hash: hashPassword(password, salt),
    password_salt: salt,
    business_name: businessName || "",
    created_at: new Date().toISOString(),
  };
  run(
    "INSERT INTO users (id, email, password_hash, password_salt, business_name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [row.id, row.email, row.password_hash, row.password_salt, row.business_name, row.created_at]
  );
  return createSession(row);
}

export async function login({ email, password }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const row = get("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
  if (!row || hashPassword(password || "", row.password_salt) !== row.password_hash) {
    throw new Error("Incorrect email or password.");
  }
  return createSession(row);
}

export async function logout(token) {
  run("DELETE FROM sessions WHERE token = ?", [token]);
}

export async function getUserByToken(token) {
  if (!token) return null;
  const session = get("SELECT * FROM sessions WHERE token = ?", [token]);
  if (!session) return null;
  const row = get("SELECT * FROM users WHERE id = ?", [session.user_id]);
  return toPublicUser(row);
}

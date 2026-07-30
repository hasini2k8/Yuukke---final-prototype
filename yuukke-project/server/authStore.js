// Local file-based auth — real signup/login with hashed passwords (Node's
// built-in scrypt, no extra dependency) and token-based sessions. Local dev
// only, same persistence caveat as every other store in this project.
import crypto from "node:crypto";
import { createStore } from "./jsonStore.js";

const usersStore = createStore("users.json", []);
const sessionsStore = createStore("sessions.json", []);

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function toPublicUser(user) {
  const { passwordHash, passwordSalt, ...pub } = user;
  return pub;
}

async function createSession(user) {
  const sessions = await sessionsStore.readAll();
  const token = crypto.randomBytes(32).toString("hex");
  sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  await sessionsStore.writeAll(sessions);
  return { token, user: toPublicUser(user) };
}

export async function signup({ email, password, businessName }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) throw new Error("Email and password are required.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  const users = await usersStore.readAll();
  if (users.some((u) => u.email === normalizedEmail)) {
    throw new Error("An account with that email already exists.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    passwordHash: hashPassword(password, salt),
    passwordSalt: salt,
    businessName: businessName || "",
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await usersStore.writeAll(users);
  return createSession(user);
}

export async function login({ email, password }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const users = await usersStore.readAll();
  const user = users.find((u) => u.email === normalizedEmail);
  if (!user || hashPassword(password || "", user.passwordSalt) !== user.passwordHash) {
    throw new Error("Incorrect email or password.");
  }
  return createSession(user);
}

export async function logout(token) {
  const sessions = await sessionsStore.readAll();
  await sessionsStore.writeAll(sessions.filter((s) => s.token !== token));
}

export async function getUserByToken(token) {
  if (!token) return null;
  const sessions = await sessionsStore.readAll();
  const session = sessions.find((s) => s.token === token);
  if (!session) return null;
  const users = await usersStore.readAll();
  const user = users.find((u) => u.id === session.userId);
  return user ? toPublicUser(user) : null;
}

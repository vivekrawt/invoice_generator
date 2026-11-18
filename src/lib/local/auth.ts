import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDatabase } from "./db.ts";

export const LOCAL_SESSION_COOKIE = "abira_local_session";
export const LOCAL_SESSION_DAYS = 30;
const PASSWORD_HASH_BYTES = 64;

export function hasLocalPassword() {
  return Boolean(getDatabase().prepare("SELECT singleton FROM local_credentials WHERE singleton = 1").get());
}

export function setInitialLocalPassword(password: string) {
  if (password.length < 12 || password.length > 128) {
    throw new Error("Choose a password between 12 and 128 characters.");
  }
  const database = getDatabase();
  const existing = database.prepare("SELECT singleton FROM local_credentials WHERE singleton = 1").get();
  if (existing) throw new Error("A local password is already configured.");

  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, PASSWORD_HASH_BYTES).toString("hex");
  database.prepare(`
    INSERT INTO local_credentials (singleton, password_salt, password_hash, updated_at)
    VALUES (1, ?, ?, ?)
  `).run(salt, passwordHash, new Date().toISOString());
}

export function verifyLocalPassword(password: string) {
  const credential = getDatabase()
    .prepare("SELECT password_salt, password_hash FROM local_credentials WHERE singleton = 1")
    .get() as { password_salt: string; password_hash: string } | undefined;
  if (!credential) return false;

  const storedHash = Buffer.from(credential.password_hash, "hex");
  const candidateHash = scryptSync(password, credential.password_salt, PASSWORD_HASH_BYTES);
  return storedHash.length === candidateHash.length && timingSafeEqual(storedHash, candidateHash);
}

export function changeLocalPassword(currentPassword: string, newPassword: string) {
  if (newPassword.length < 12 || newPassword.length > 128) {
    throw new Error("Choose a password between 12 and 128 characters.");
  }
  if (!verifyLocalPassword(currentPassword)) return false;

  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(newPassword, salt, PASSWORD_HASH_BYTES).toString("hex");
  const database = getDatabase();
  const updatePassword = database.transaction(() => {
    database.prepare(`
      UPDATE local_credentials
      SET password_salt = ?, password_hash = ?, updated_at = ?
      WHERE singleton = 1
    `).run(salt, passwordHash, new Date().toISOString());
    database.prepare("DELETE FROM local_sessions").run();
  });
  updatePassword();
  return true;
}

export function createLocalSession() {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + LOCAL_SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const database = getDatabase();
  database.prepare("DELETE FROM local_sessions WHERE expires_at <= ?").run(new Date().toISOString());
  database.prepare(`
    INSERT INTO local_sessions (token_hash, expires_at, created_at)
    VALUES (?, ?, ?)
  `).run(tokenHash, expiresAt, new Date().toISOString());
  return { token, expiresAt };
}

export function isLocalSessionValid(token: string | undefined) {
  if (!token || token.length > 128) return false;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = getDatabase()
    .prepare("SELECT expires_at FROM local_sessions WHERE token_hash = ?")
    .get(tokenHash) as { expires_at: string } | undefined;
  if (!session) return false;
  if (session.expires_at <= new Date().toISOString()) {
    getDatabase().prepare("DELETE FROM local_sessions WHERE token_hash = ?").run(tokenHash);
    return false;
  }
  return true;
}

export function deleteLocalSession(token: string | undefined) {
  if (!token || token.length > 128) return;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  getDatabase().prepare("DELETE FROM local_sessions WHERE token_hash = ?").run(tokenHash);
}

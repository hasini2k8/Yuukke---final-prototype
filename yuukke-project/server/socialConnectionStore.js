// SQLite-backed store (server/db.js) for each seller's own Instagram/
// LinkedIn/Pinterest OAuth connection (server/socialAuth.js) — replaces the
// old Zernio-hosted connection. Access tokens live here and only here; every
// other layer of the app only ever sees {connected, username}.
import crypto from "node:crypto";
import { get, all, run } from "./db.js";

function toConnection(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    platform: row.platform,
    accessToken: row.access_token,
    refreshToken: row.refresh_token || null,
    expiresAt: row.expires_at || null,
    accountId: row.account_id || null,
    username: row.username || null,
    connectedAt: row.connected_at,
  };
}

export async function getConnection(userId, platform) {
  return toConnection(get("SELECT * FROM social_connections WHERE user_id = ? AND platform = ?", [userId, platform]));
}

export async function listConnections(userId) {
  return all("SELECT * FROM social_connections WHERE user_id = ?", [userId]).map(toConnection);
}

export async function saveConnection(userId, platform, data) {
  run(
    `INSERT INTO social_connections (user_id, platform, access_token, refresh_token, expires_at, account_id, username, connected_at)
     VALUES (@user_id, @platform, @access_token, @refresh_token, @expires_at, @account_id, @username, @connected_at)
     ON CONFLICT(user_id, platform) DO UPDATE SET
       access_token = excluded.access_token, refresh_token = excluded.refresh_token, expires_at = excluded.expires_at,
       account_id = excluded.account_id, username = excluded.username, connected_at = excluded.connected_at`,
    {
      user_id: userId,
      platform,
      access_token: data.accessToken,
      refresh_token: data.refreshToken || null,
      expires_at: data.expiresAt || null,
      account_id: data.accountId || null,
      username: data.username || null,
      connected_at: new Date().toISOString(),
    }
  );
  return getConnection(userId, platform);
}

export async function deleteConnection(userId, platform) {
  run("DELETE FROM social_connections WHERE user_id = ? AND platform = ?", [userId, platform]);
}

// oauth_states carries the logged-in seller's identity across the OAuth
// redirect round trip — single use, short-lived (the caller should reject
// anything older than a few minutes; see socialAuth.js's CALLBACK_MAX_AGE_MS).
export async function createOAuthState(userId, platform) {
  const state = crypto.randomBytes(24).toString("hex");
  run("INSERT INTO oauth_states (state, user_id, platform, created_at) VALUES (?, ?, ?, ?)", [
    state, userId, platform, new Date().toISOString(),
  ]);
  return state;
}

export async function consumeOAuthState(state) {
  const row = get("SELECT * FROM oauth_states WHERE state = ?", [state]);
  if (!row) return null;
  run("DELETE FROM oauth_states WHERE state = ?", [state]);
  return { userId: row.user_id, platform: row.platform, createdAt: row.created_at };
}

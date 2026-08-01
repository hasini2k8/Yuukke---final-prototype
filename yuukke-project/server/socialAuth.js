// Direct OAuth against each platform's own free developer API — replaces
// the old Zernio-hosted connection (which capped free accounts at 2). No
// middleman, no artificial account limit.
//
// Each platform needs its own free developer app (Client ID/Secret) created
// by the account holder — that's a real, unavoidable step (see the setup
// checklist in README.md). Until the matching env vars are set, connecting
// that platform fails with a clear "not configured" error — the same
// graceful-missing-key pattern already used for TRIPO_API_KEY/
// OPENAI_API_KEY/VITE_GEMINI_API_KEY elsewhere in this app.
//
// API shapes below match each platform's current stable OAuth + Graph/REST
// docs (Meta Graph API v19, LinkedIn OpenID Connect + UGC Posts, Pinterest
// API v5) at time of writing — check current docs if a platform has since
// changed something.

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} isn't set — this platform hasn't been connected to the app yet. See the setup checklist to create a free developer app and add the credentials to .env.`);
  }
  return value;
}

function baseUrl() {
  return process.env.PUBLIC_BASE_URL || "http://localhost:5173";
}

function redirectUri(platform) {
  return `${baseUrl()}/api/social/${platform}/callback`;
}

const PLATFORMS = {
  instagram: {
    scope: "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",

    authorizeUrl(state) {
      const params = new URLSearchParams({
        client_id: requireEnv("META_APP_ID"),
        redirect_uri: redirectUri("instagram"),
        scope: this.scope,
        response_type: "code",
        state,
      });
      return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
    },

    async exchangeCode(code) {
      const clientId = requireEnv("META_APP_ID");
      const clientSecret = requireEnv("META_APP_SECRET");
      const shortParams = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri("instagram"), client_secret: clientSecret, code });
      const shortRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${shortParams}`);
      const shortData = await shortRes.json();
      if (!shortRes.ok) throw new Error(shortData?.error?.message || "Instagram token exchange failed.");

      // Short-lived tokens expire in ~1-2 hours — exchange for a long-lived
      // (~60 day) one so sellers aren't forced to reconnect constantly.
      const longParams = new URLSearchParams({ grant_type: "fb_exchange_token", client_id: clientId, client_secret: clientSecret, fb_exchange_token: shortData.access_token });
      const longRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${longParams}`);
      const longData = await longRes.json();
      if (!longRes.ok) throw new Error(longData?.error?.message || "Instagram long-lived token exchange failed.");
      return { userAccessToken: longData.access_token, expiresIn: longData.expires_in };
    },

    // Instagram content publishing runs against the Facebook Page's own
    // access token for the specific Page the seller's Instagram Business
    // account is linked to — not the raw user token — so this walks that
    // chain: list the seller's Pages, find the one with a linked IG
    // Business account, then read that account's username.
    async fetchProfile({ userAccessToken }) {
      const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(userAccessToken)}`);
      const pagesData = await pagesRes.json();
      if (!pagesRes.ok) throw new Error(pagesData?.error?.message || "Couldn't list your Facebook Pages.");

      for (const page of pagesData.data || []) {
        const igRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${encodeURIComponent(page.access_token)}`);
        const igData = await igRes.json();
        const igAccountId = igData?.instagram_business_account?.id;
        if (!igAccountId) continue;
        const userRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}?fields=username&access_token=${encodeURIComponent(page.access_token)}`);
        const userData = await userRes.json();
        return { accountId: igAccountId, username: userData.username, accessToken: page.access_token };
      }
      throw new Error("None of your Facebook Pages have an Instagram Business account linked. Instagram posting needs a Business or Creator account connected to a Facebook Page.");
    },
  },

  linkedin: {
    // w_member_social posts to the seller's own profile without needing
    // LinkedIn's Marketing Developer Platform partnership (that's only
    // required for posting to Company Pages, which is out of scope here).
    scope: "openid profile w_member_social",

    authorizeUrl(state) {
      const params = new URLSearchParams({
        response_type: "code",
        client_id: requireEnv("LINKEDIN_CLIENT_ID"),
        redirect_uri: redirectUri("linkedin"),
        scope: this.scope,
        state,
      });
      return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
    },

    async exchangeCode(code) {
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri("linkedin"),
        client_id: requireEnv("LINKEDIN_CLIENT_ID"),
        client_secret: requireEnv("LINKEDIN_CLIENT_SECRET"),
      });
      const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error_description || "LinkedIn token exchange failed.");
      return { userAccessToken: data.access_token, expiresIn: data.expires_in };
    },

    async fetchProfile({ userAccessToken }) {
      const res = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${userAccessToken}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Couldn't read your LinkedIn profile.");
      // `sub` is the member's opaque id — posts are authored as urn:li:person:{sub}.
      return { accountId: data.sub, username: data.name, accessToken: userAccessToken };
    },
  },

  pinterest: {
    scope: "boards:read,pins:write,user_accounts:read",

    authorizeUrl(state) {
      const params = new URLSearchParams({
        client_id: requireEnv("PINTEREST_APP_ID"),
        redirect_uri: redirectUri("pinterest"),
        response_type: "code",
        scope: this.scope,
        state,
      });
      return `https://www.pinterest.com/oauth/?${params}`;
    },

    async exchangeCode(code) {
      const clientId = requireEnv("PINTEREST_APP_ID");
      const clientSecret = requireEnv("PINTEREST_APP_SECRET");
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri("pinterest") });
      const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` }, body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Pinterest token exchange failed.");
      return { userAccessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
    },

    async fetchProfile({ userAccessToken }) {
      const res = await fetch("https://api.pinterest.com/v5/user_account", { headers: { Authorization: `Bearer ${userAccessToken}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Couldn't read your Pinterest profile.");
      return { accountId: data.username, username: data.username, accessToken: userAccessToken };
    },
  },
};

export function getPlatformConfig(platform) {
  const config = PLATFORMS[platform];
  if (!config) throw new Error(`Unknown platform: ${platform}`);
  return config;
}

export function getAuthUrl(platform, state) {
  return getPlatformConfig(platform).authorizeUrl(state);
}

// Runs the full "code → tokens → who is this" chain for one platform and
// returns exactly what social_connections needs — the route handler in
// server/index.js just persists this.
export async function completeOAuth(platform, code) {
  const config = getPlatformConfig(platform);
  const tokenResult = await config.exchangeCode(code);
  const profile = await config.fetchProfile(tokenResult);
  return {
    accessToken: profile.accessToken || tokenResult.userAccessToken,
    refreshToken: tokenResult.refreshToken || null,
    expiresAt: tokenResult.expiresIn ? new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString() : null,
    accountId: profile.accountId,
    username: profile.username,
  };
}

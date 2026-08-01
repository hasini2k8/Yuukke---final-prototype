// Local in-process scheduler — Instagram/LinkedIn/Pinterest's own APIs
// publish immediately when called (unlike Zernio, which ran its own remote
// scheduling infrastructure), so "post this on a future date" now needs
// something on our side to actually fire the publish call once that date
// arrives. Polls every minute for due, still-scheduled posts. The server
// process needs to be running at that time — same local-dev-only caveat as
// the rest of this app's persistence (see productStore.js).
import * as posts from "./postStore.js";
import { attemptPublish } from "./socialSchedule.js";

const POLL_INTERVAL_MS = 60_000;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function tick() {
  const due = await posts.listScheduledDue(todayIso());
  for (const post of due) {
    await attemptPublish(post.userId, post).catch(() => {});
  }
}

export function startScheduler() {
  tick().catch(() => {});
  setInterval(() => { tick().catch(() => {}); }, POLL_INTERVAL_MS);
}

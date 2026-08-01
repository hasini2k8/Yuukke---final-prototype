// The social calendar always works in India Standard Time, regardless of
// the seller's own browser timezone — a post "for Tuesday" should mean
// Tuesday in India, not wherever the browser happens to think "today" is.
// Uses Intl with an explicit timeZone rather than `new Date()` local time.
const IST_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
});
const IST_WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long" });
const IST_WEEKDAY_SHORT_FORMATTER = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short" });
const IST_MONTH_DAY_FORMATTER = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });

export function istTodayIso() {
  return IST_FORMATTER.format(new Date());
}

// Adds `days` (may be negative) to an "YYYY-MM-DD" string, staying in
// calendar-date arithmetic (no timezone drift) by parsing as UTC noon.
export function istDateOffset(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return IST_FORMATTER.format(d);
}

// The Sunday on/before `iso`, so a week always starts on Sunday.
export function istWeekStart(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  return istDateOffset(iso, -d.getUTCDay());
}

export function istWeekdayName(iso) {
  return IST_WEEKDAY_FORMATTER.format(new Date(`${iso}T12:00:00Z`));
}

export function istWeekdayShort(iso) {
  return IST_WEEKDAY_SHORT_FORMATTER.format(new Date(`${iso}T12:00:00Z`));
}

export function istMonthDay(iso) {
  return IST_MONTH_DAY_FORMATTER.format(new Date(`${iso}T12:00:00Z`));
}

// 12-hour "9:00 AM"-style label for a "HH:mm" time string.
export function formatTime(hhmm) {
  const [h, m] = String(hhmm || "09:00").split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

const SLOT_TIMES = ["09:00", "13:00", "18:00"];
const MAX_POSTS_PER_DAY = 3;

// "The AI randomly puts it on a certain day" — a post submitted from the
// Storefront composer doesn't get a seller-picked date; this picks one for
// it. Literally random (not a judgment call, so no AI call needed for it):
// a day within the next `withinDays` IST days, skipping ones already
// holding MAX_POSTS_PER_DAY+ posts so everything doesn't pile onto today.
export function pickRandomSlot(existingPosts, { withinDays = 14 } = {}) {
  const today = istTodayIso();
  const counts = {};
  for (const p of existingPosts) if (p.scheduledFor) counts[p.scheduledFor] = (counts[p.scheduledFor] || 0) + 1;

  const candidates = [];
  for (let i = 1; i <= withinDays; i++) {
    const iso = istDateOffset(today, i);
    if ((counts[iso] || 0) < MAX_POSTS_PER_DAY) candidates.push(iso);
  }
  const scheduledFor = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : istDateOffset(today, 1);
  const scheduledTime = SLOT_TIMES[Math.floor(Math.random() * SLOT_TIMES.length)];
  return { scheduledFor, scheduledTime };
}

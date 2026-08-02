import { all, get, run } from "./db.js";

const VIEW_LABELS = /views|impressions|reach|plays/i;

function points(metric) {
  return Array.isArray(metric?.data) ? metric.data : [];
}

export function savePostMetrics(sellerId, postId, metrics) {
  const byDate = new Map();
  for (const metric of Array.isArray(metrics) ? metrics : []) {
    const key = VIEW_LABELS.test(metric.label || "") ? "views" : /likes/i.test(metric.label || "") ? "likes" : /comments/i.test(metric.label || "") ? "comments" : /shares/i.test(metric.label || "") ? "shares" : null;
    if (!key) continue;
    for (const point of points(metric)) {
      const date = String(point.date || "").slice(0, 10);
      if (!date) continue;
      const row = byDate.get(date) || { views: 0, likes: 0, comments: 0, shares: 0 };
      row[key] = Math.max(row[key], Number(point.total) || 0);
      byDate.set(date, row);
    }
  }
  const syncedAt = new Date().toISOString();
  for (const [date, row] of byDate) run(
    `INSERT INTO instagram_analytics (seller_id, post_id, metric_date, views, likes, comments, shares, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(seller_id, post_id, metric_date) DO UPDATE SET views=excluded.views, likes=excluded.likes, comments=excluded.comments, shares=excluded.shares, synced_at=excluded.synced_at`,
    [sellerId, postId, date, row.views, row.likes, row.comments, row.shares, syncedAt]
  );
}

export function recordWebsiteView(sellerId) {
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  run(`INSERT INTO website_analytics (seller_id, metric_date, views, updated_at) VALUES (?, ?, 1, ?)
    ON CONFLICT(seller_id, metric_date) DO UPDATE SET views=views+1, updated_at=excluded.updated_at`, [sellerId, date, new Date().toISOString()]);
}

export function refreshStrategy(sellerId) {
  const best = get(`SELECT p.topic, p.caption, p.video_url, MAX(a.views) views, MAX(a.likes + a.comments + a.shares) engagement
    FROM instagram_analytics a JOIN posts p ON p.id=a.post_id WHERE a.seller_id=? GROUP BY a.post_id ORDER BY views DESC, engagement DESC LIMIT 1`, [sellerId]);
  const website = get("SELECT COALESCE(SUM(views),0) total, COALESCE(MAX(views),0) peak FROM website_analytics WHERE seller_id=?", [sellerId]);
  if (!best && !website?.total) return null;
  const format = best?.video_url ? "short video/reel" : "product-led image";
  const socialAdvice = best ? `Prioritize ${format} advertisements similar to the best-performing post about "${best.topic || "the featured product"}". Reuse the visual tone that earned ${best.views} Instagram views.` : "Use product-led advertisements to establish an initial Instagram performance baseline.";
  const websiteAdvice = website?.total ? `The storefront has attracted ${website.total} website views; use clear shop-now calls to action and link every campaign directly to the storefront.` : "Add the storefront link to every campaign so website interest can be measured.";
  const strategy = `${socialAdvice} ${websiteAdvice} Keep the product clearly visible, lead with a concrete customer benefit, use a concise caption, and test one creative change at a time.`;
  const evidence = `${best ? `${best.views} Instagram views and ${best.engagement || 0} recorded interactions` : "No Instagram baseline yet"}; ${website?.total || 0} storefront views recorded.`;
  run(`INSERT INTO marketing_strategies (seller_id, strategy, evidence, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(seller_id) DO UPDATE SET strategy=excluded.strategy, evidence=excluded.evidence, updated_at=excluded.updated_at`, [sellerId, strategy, evidence, new Date().toISOString()]);
  return { strategy, evidence };
}

export function getAnalytics(sellerId) {
  const rows = all(`SELECT a.*, p.topic, p.caption, p.calendar_number FROM instagram_analytics a JOIN posts p ON p.id=a.post_id WHERE a.seller_id=? ORDER BY a.metric_date, p.calendar_number`, [sellerId]);
  const strategy = get("SELECT strategy, evidence, updated_at updatedAt FROM marketing_strategies WHERE seller_id=?", [sellerId]) || null;
  const websiteRows = all("SELECT metric_date date, views FROM website_analytics WHERE seller_id=? ORDER BY metric_date", [sellerId]);
  return { rows: rows.map((r) => ({ postId: r.post_id, date: r.metric_date, views: r.views, likes: r.likes, comments: r.comments, shares: r.shares, topic: r.topic, postNumber: r.calendar_number })), websiteRows, strategy };
}

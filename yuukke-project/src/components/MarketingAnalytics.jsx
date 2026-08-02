import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Eye, RefreshCw, Sparkles } from "lucide-react";
import { theme } from "../theme";
import { Spinner } from "./Shared";
import { fetchAnalytics, syncAnalytics } from "../lib/analytics";

export default function MarketingAnalytics() {
  const [data, setData] = useState({ rows: [], websiteRows: [], strategy: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    syncAnalytics().then(setData).catch(() => fetchAnalytics().then(setData).catch(() => {}));
  }, []);

  const chart = useMemo(() => {
    const totals = {};
    for (const row of data.rows || []) totals[row.date] = (totals[row.date] || 0) + row.views;
    return Object.entries(totals).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, views]) => ({ date, views }));
  }, [data.rows]);
  const max = Math.max(1, ...chart.map((p) => p.views));
  const websiteChart = (data.websiteRows || []).slice(-14);
  const websiteMax = Math.max(1, ...websiteChart.map((p) => p.views));
  const websiteViews = (data.websiteRows || []).reduce((sum, row) => sum + row.views, 0);
  const websitePeak = Math.max(0, ...(data.websiteRows || []).map((row) => row.views));
  const latestByPost = Object.values((data.rows || []).reduce((map, row) => {
    if (!map[row.postId] || row.date >= map[row.postId].date) map[row.postId] = row;
    return map;
  }, {}));
  const totalViews = latestByPost.reduce((sum, row) => sum + row.views, 0);
  const best = [...latestByPost].sort((a, b) => b.views - a.views)[0];

  async function sync() {
    setBusy(true); setError("");
    try { setData(await syncAnalytics()); }
    catch (e) { setError(e.message || "Couldn’t sync Instagram analytics."); }
    finally { setBusy(false); }
  }

  return <section style={{ marginTop: 20, background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 20 }}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
      <div><p style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 800, color: theme.ink, margin: "0 0 4px" }}><BarChart3 size={17} color={theme.wine} /> Marketing analytics</p><p style={{ fontSize: 11.5, color: theme.inkSoft, margin: 0 }}>Instagram and storefront views are stored for future marketing decisions.</p></div>
      <button onClick={sync} disabled={busy} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 9, border: "none", background: theme.wine, color: "#fff", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>{busy ? <Spinner size={12} /> : <RefreshCw size={13} />} Sync Instagram</button>
    </div>
    {error && <p style={{ fontSize: 11.5, color: "#a32d2d" }}>{error}</p>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 18 }}>
      {[["Recorded views", totalViews.toLocaleString()], ["Posts measured", latestByPost.length], ["Best post", best ? (best.topic || `Post ${best.postNumber}`) : "Waiting for data"]].map(([label, value]) => <div key={label} style={{ padding: 13, borderRadius: 12, background: theme.cream }}><span style={{ display: "block", fontSize: 10.5, color: theme.inkSoft, marginBottom: 5 }}>{label}</span><strong style={{ fontSize: 16, color: theme.ink }}>{value}</strong></div>)}
    </div>
    {chart.length ? <div style={{ height: 190, display: "flex", alignItems: "flex-end", gap: 8, padding: "18px 12px 26px", borderRadius: 14, background: `linear-gradient(180deg, ${theme.cream}, #fff)` }}>
      {chart.map((point) => <div key={point.date} title={`${point.date}: ${point.views} views`} style={{ flex: 1, minWidth: 12, height: `${Math.max(5, point.views / max * 100)}%`, borderRadius: "7px 7px 2px 2px", background: `linear-gradient(180deg, #c56b83, ${theme.wine})`, position: "relative" }}><span style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: theme.inkSoft }}>{point.views}</span></div>)}
    </div> : <div style={{ padding: 28, borderRadius: 14, background: theme.cream, textAlign: "center", color: theme.inkSoft }}><Eye size={20} style={{ marginBottom: 6 }} /><p style={{ margin: 0, fontSize: 12 }}>Post to Instagram, then sync to start the views graph.</p></div>}

    <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${theme.line}` }}>
      <p style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 800, color: theme.ink, margin: "0 0 4px" }}><Eye size={15} color={theme.wine} /> Business website performance</p>
      <p style={{ fontSize: 11.5, color: theme.inkSoft, margin: "0 0 14px" }}>Every successful visit to the entrepreneur's published storefront is counted automatically.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 14 }}>
        {[["Website views", websiteViews.toLocaleString()], ["Best day", websitePeak.toLocaleString()], ["Days measured", (data.websiteRows || []).length]].map(([label, value]) => <div key={label} style={{ padding: 13, borderRadius: 12, background: theme.cream }}><span style={{ display: "block", fontSize: 10.5, color: theme.inkSoft, marginBottom: 5 }}>{label}</span><strong style={{ fontSize: 16, color: theme.ink }}>{value}</strong></div>)}
      </div>
      {websiteChart.length ? <div style={{ height: 170, display: "flex", alignItems: "flex-end", gap: 8, padding: "18px 12px 24px", borderRadius: 14, background: `linear-gradient(180deg, #f2e7da, #fff)` }}>
        {websiteChart.map((point) => <div key={point.date} title={`${point.date}: ${point.views} website views`} style={{ flex: 1, minWidth: 12, height: `${Math.max(5, point.views / websiteMax * 100)}%`, borderRadius: "7px 7px 2px 2px", background: "linear-gradient(180deg, #d69a62, #a3512c)", position: "relative" }}><span style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: theme.inkSoft }}>{point.views}</span></div>)}
      </div> : <div style={{ padding: 22, borderRadius: 14, background: theme.cream, textAlign: "center", color: theme.inkSoft, fontSize: 12 }}>Publish the storefront and share its URL to begin measuring website views.</div>}
    </div>

    <div style={{ marginTop: 16, padding: 15, borderRadius: 14, background: theme.wineTint, border: `1px solid ${theme.line}` }}><p style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 6px", color: theme.wine, fontWeight: 800, fontSize: 12 }}><Sparkles size={14} /> Strategy saved for the advertising AI</p><p style={{ margin: 0, color: theme.ink, fontSize: 12, lineHeight: 1.55 }}>{data.strategy?.strategy || "Once Instagram or storefront performance is available, Yuukke will save a strategy here and automatically use it in future advertisements."}</p>{data.strategy?.evidence && <small style={{ display: "block", marginTop: 7, color: theme.inkSoft }}>{data.strategy.evidence}</small>}</div>
  </section>;
}

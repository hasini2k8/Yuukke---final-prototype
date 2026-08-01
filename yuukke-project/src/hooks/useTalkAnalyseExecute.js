import { useState } from "react";
import { askOpenAIJSON } from "../lib/ai";

// Shared "talk → AI analyses → AI executes" loop used across the business
// platform's voice-driven onboarding (brand guidelines, logo, website) — a
// seller speaks or types an instruction, the AI turns it into the same
// structured JSON shape the page already works with (via buildContext,
// usually src/lib/ai.js's buildEditContext), and the page applies it
// directly (onExecute) — no separate "generate" step to click through.
// Voice and typing hit this same code path; the mic just fills the
// instruction text before it's run (see TalkAnalyseExecuteBar).
export function useTalkAnalyseExecute({ system, buildContext, onExecute }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(instruction) {
    setBusy(true);
    setError("");
    try {
      const result = await askOpenAIJSON(system, buildContext(instruction));
      await onExecute(result);
    } catch (e) {
      setError(e.message || "Couldn't do that just now.");
    } finally {
      setBusy(false);
    }
  }

  return { run, busy, error };
}

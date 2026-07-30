import { askGeminiChat } from "./ai";

// Translates a batch of English UI strings into the given language in one
// call, preserving array order so results can be zipped back to their
// original source strings.
export async function translateStrings(strings, languageName) {
  if (!strings.length) return [];
  const system = `Translate each string in this JSON array into ${languageName} as spoken in India, for a small-business marketplace website's interface. Preserve meaning, keep it natural, concise, and appropriately formal/informal for a UI. Keep numbers, currency symbols, and placeholders like "%s" exactly as they are. Respond with ONLY a JSON array of translated strings — same length, same order as the input — no markdown fences, no prose.`;
  const text = await askGeminiChat(system, [{ role: "user", content: JSON.stringify(strings) }]);
  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed) || parsed.length !== strings.length) {
    throw new Error("Translation response didn't match the expected shape.");
  }
  return parsed;
}

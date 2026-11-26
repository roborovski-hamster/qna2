import { normalize } from "./utils.js";

export function readCategory(body, data) {
  const contexts = [body.contexts, body.userRequest?.contexts, body.bot?.contexts, body.action?.contexts].find(c => Array.isArray(c) && c.length) || [];
  const categories = [...new Set(data.map(row => String(row.category || "")).filter(Boolean))];
  const valid = value => categories.find(c => normalize(c) === normalize(value)) || "";
  const legacy = contexts.filter(c => valid(c.name) && (c.lifespan ?? c.lifeSpan ?? 1) > 0).sort((a,b) => (b.lifespan ?? b.lifeSpan ?? 0) - (a.lifespan ?? a.lifeSpan ?? 0))[0];
  const common = contexts.find(c => c.name === "faq_context" && (c.lifespan ?? c.lifeSpan ?? 1) > 0);
  return valid(common?.params?.category) || valid(legacy?.name);
}

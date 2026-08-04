import { ChatOpenAI } from "@langchain/openai";

export const AI_MODEL_ID = process.env.OPENAI_MODEL || "gpt-4.1";

/**
 * A single shared model instance, configured for deterministic, factual
 * output. Temperature is pinned low across every pipeline (extraction,
 * customization, tailoring) because resume content must stay faithful to
 * the source — this is not a creative-writing task.
 */
export function createChatModel() {
  return new ChatOpenAI({
    model: AI_MODEL_ID,
    temperature: 0,
  });
}

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { z } from "zod";
import { AiOutputError } from "@/lib/errors";
import { createChatModel } from "@/lib/ai/model";

/**
 * Invokes the model for a validated structured response, with one repair
 * attempt on failure.
 *
 * Uses the "functionCalling" method rather than OpenAI's newer strict
 * json_schema response format: strict mode requires every property to be
 * listed in `required` (optionality is expressed via nullable types, not
 * omission), which our schemas' widespread use of `.optional()` violates —
 * OpenAI rejects the schema outright with a 400 before the model ever runs.
 * Function calling has no such constraint. Validation still happens fully
 * on our side (schema.parse, including refinements JSON Schema can't
 * express, like "sectionOrder must be a permutation"), so this doesn't
 * weaken correctness — it just uses a wire format our schemas fit.
 */
export async function callStructured<T extends Record<string, unknown>>(params: {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  schemaName: string;
}): Promise<T> {
  const { systemPrompt, userPrompt, schema, schemaName } = params;
  const model = createChatModel().withStructuredOutput(schema, {
    method: "functionCalling",
    name: schemaName,
  });

  const messages = [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)];

  try {
    // withStructuredOutput's overload resolution can't always tie its return
    // type back to our generic T, even though it's runtime-validated against
    // `schema` — the cast just restates what the schema already guarantees.
    return (await model.invoke(messages)) as T;
  } catch (firstError) {
    console.error("[ai] structured call failed, attempting one repair pass", {
      schemaName,
      message: firstError instanceof Error ? firstError.message : String(firstError),
    });
    try {
      return (await model.invoke([
        ...messages,
        new HumanMessage(
          "Your previous response did not match the required schema. Re-read the instructions " +
            "carefully and return a corrected response that strictly matches the schema.",
        ),
      ])) as T;
    } catch (secondError) {
      console.error("[ai] structured call repair attempt also failed", {
        schemaName,
        message: secondError instanceof Error ? secondError.message : String(secondError),
      });
      throw new AiOutputError(
        "The AI couldn't produce a valid result for this request. Please try again.",
      );
    }
  }
}

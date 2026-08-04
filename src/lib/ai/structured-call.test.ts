import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AiOutputError } from "@/lib/errors";

const invoke = vi.fn();
const withStructuredOutput = vi.fn(() => ({ invoke }));

vi.mock("@/lib/ai/model", () => ({
  createChatModel: () => ({ withStructuredOutput }),
  AI_MODEL_ID: "test-model",
}));

const { callStructured } = await import("@/lib/ai/structured-call");

const schema = z.object({ ok: z.boolean() });

beforeEach(() => {
  invoke.mockReset();
  withStructuredOutput.mockClear();
});

describe("callStructured", () => {
  it("returns the parsed result on the first successful call", async () => {
    invoke.mockResolvedValueOnce({ ok: true });
    const result = await callStructured({
      systemPrompt: "sys",
      userPrompt: "user",
      schema,
      schemaName: "test_schema",
    });
    expect(result).toEqual({ ok: true });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("retries exactly once after a failure, then returns the repaired result", async () => {
    invoke.mockRejectedValueOnce(new Error("schema mismatch")).mockResolvedValueOnce({ ok: true });
    const result = await callStructured({
      systemPrompt: "sys",
      userPrompt: "user",
      schema,
      schemaName: "test_schema",
    });
    expect(result).toEqual({ ok: true });
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("throws a sanitized AiOutputError (not the raw error) when both attempts fail", async () => {
    invoke.mockRejectedValue(new Error("raw internal parser detail that must not leak to users"));
    await expect(
      callStructured({ systemPrompt: "sys", userPrompt: "user", schema, schemaName: "test_schema" }),
    ).rejects.toThrow(AiOutputError);
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("never saves/returns data when both attempts fail — the error carries no partial result", async () => {
    invoke.mockRejectedValue(new Error("fail"));
    try {
      await callStructured({ systemPrompt: "sys", userPrompt: "user", schema, schemaName: "test_schema" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AiOutputError);
      expect((error as AiOutputError).message).not.toMatch(/raw internal|fail\b/);
    }
  });
});

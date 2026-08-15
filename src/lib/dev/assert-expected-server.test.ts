import { describe, expect, it } from "vitest";
import { assertExpectedServer, WrongServerError } from "@/lib/dev/assert-expected-server";

describe("assertExpectedServer", () => {
  it("resolves when the response is ResumeForge's own homepage", async () => {
    const fakeFetch = (async () =>
      new Response("<html><head><title>ResumeForge — AI Resume Formatting</title></head></html>")) as typeof fetch;

    await expect(assertExpectedServer("http://localhost:3100", fakeFetch)).resolves.toBeUndefined();
  });

  it("throws a diagnostic WrongServerError when a different app owns the port", async () => {
    const fakeFetch = (async () =>
      new Response("<html><head><title>Some Other Local Project</title></head></html>")) as typeof fetch;

    await expect(assertExpectedServer("http://localhost:3100", fakeFetch)).rejects.toThrow(WrongServerError);
    await expect(assertExpectedServer("http://localhost:3100", fakeFetch)).rejects.toThrow(/different application/);
  });
});

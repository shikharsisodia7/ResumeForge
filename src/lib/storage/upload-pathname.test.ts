import { describe, expect, it } from "vitest";
import { isOwnUploadPathname } from "@/lib/storage/upload-pathname";

describe("isOwnUploadPathname", () => {
  it("accepts a pathname under the caller's own user prefix", () => {
    expect(isOwnUploadPathname("resumes/user-1/abc-resume.pdf", "user-1")).toBe(true);
  });

  it("rejects a pathname under a different user's prefix", () => {
    expect(isOwnUploadPathname("resumes/user-2/abc-resume.pdf", "user-1")).toBe(false);
  });

  it("rejects a pathname with the exact prefix but no filename segment", () => {
    expect(isOwnUploadPathname("resumes/user-1/", "user-1")).toBe(false);
  });

  it("rejects a pathname outside the resumes/ namespace entirely", () => {
    expect(isOwnUploadPathname("pdfs/user-1/abc.pdf", "user-1")).toBe(false);
  });

  it("rejects a prefix look-alike that isn't actually a subpath (no separator)", () => {
    expect(isOwnUploadPathname("resumes/user-10/abc.pdf", "user-1")).toBe(false);
  });
});

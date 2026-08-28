import { describe, expect, it } from "vitest";
import { CHECKLIST_CATEGORIES, CHECKLIST_ITEMS, checklistItemById } from "@/lib/checklist/definitions";

describe("checklist definitions", () => {
  it("has 31 items, each with a unique, correctly-prefixed stable id", () => {
    expect(CHECKLIST_ITEMS).toHaveLength(31);
    const ids = CHECKLIST_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of CHECKLIST_ITEMS) {
      expect(item.id).toMatch(/^[A-Z]{3,4}-\d{3}$/);
    }
  });

  it("assigns every item to one of the 10 documented categories", () => {
    const categoryKeys = new Set(CHECKLIST_CATEGORIES.map((c) => c.key));
    expect(categoryKeys.size).toBe(10);
    for (const item of CHECKLIST_ITEMS) {
      expect(categoryKeys.has(item.category), `${item.id} has unknown category ${item.category}`).toBe(true);
    }
  });

  it("looks up a known item by id and throws for an unknown one", () => {
    expect(checklistItemById("GRAM-001").label).toBeTruthy();
    expect(() => checklistItemById("NOPE-999")).toThrow();
  });
});

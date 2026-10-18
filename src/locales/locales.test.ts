import { sort } from "remeda";
import { describe, expect, it } from "vitest";
import { resources } from "@/locales";

const byName = (a: string, b: string) => a.localeCompare(b);

function collectKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    collectKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function collectPlaceholders(value: unknown): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const walk = (node: unknown, path: string) => {
    if (typeof node === "string") {
      result[path] = sort(
        [...node.matchAll(/{{\s*(\w+)\s*}}|<(\w+)\s*\/?>/g)].map(
          (match) => match[1] ?? match[2] ?? "",
        ),
        byName,
      );
      return;
    }
    if (typeof node === "object" && node !== null) {
      for (const [key, child] of Object.entries(node)) {
        walk(child, path ? `${path}.${key}` : key);
      }
    }
  };
  walk(value, "");
  return result;
}

describe("locales", () => {
  it("defines the same keys in every language", () => {
    expect(sort(collectKeys(resources.tr), byName)).toEqual(
      sort(collectKeys(resources.en), byName),
    );
  });

  it("keeps the same placeholders and components in every language", () => {
    expect(collectPlaceholders(resources.tr)).toEqual(
      collectPlaceholders(resources.en),
    );
  });
});

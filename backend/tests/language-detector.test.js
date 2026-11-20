import { describe, it, expect } from "vitest";
import {
  detectLanguage,
  detectLanguageWithConfidence,
  detectLanguageWithHighlight
} from "../services/language-detector.js";

const SAMPLES = {
  javascript: `import express from "express";
const app = express();
app.get("/", (req, res) => {
  res.send("hi");
});
module.exports = app;`,
  python: `def greet(name):
    if name is None:
        return "Hello, world"
    return f"Hello, {name}"

print(greet("Durva"))`,
  "c++": `#include <iostream>
using namespace std;

int main() {
    cout << "Hello" << endl;
    return 0;
}`,
  sql: `SELECT id, name
FROM users
WHERE created_at > '2024-01-01'
ORDER BY name;`,
  go: `package main

import "fmt"

func main() {
    fmt.Println("hello")
}`
};

describe("detectLanguage (flourite, used in production)", () => {
  for (const [expected, code] of Object.entries(SAMPLES)) {
    it(`recognises ${expected} and returns Notion's name for it`, () => {
      expect(detectLanguage(code)).toBe(expected);
    });
  }

  it("returns null for empty code so the block is left alone", () => {
    expect(detectLanguage("")).toBeNull();
    expect(detectLanguage("   \n  ")).toBeNull();
  });

  it("returns null when it can't tell what the code is", () => {
    expect(detectLanguage("hello there")).toBeNull();
  });
});

describe("detectLanguageWithHighlight (comparison only)", () => {
  it("returns a Notion language name for recognisable code", () => {
    expect(detectLanguageWithHighlight(SAMPLES.python)).toBe("python");
  });

  it("returns null for empty code", () => {
    expect(detectLanguageWithHighlight("")).toBeNull();
  });
});

describe("detectLanguageWithConfidence (used by auto-sync)", () => {
  it("returns the same language as detectLanguage, with a confidence between 0 and 1", () => {
    for (const code of Object.values(SAMPLES)) {
      const { language, confidence } = detectLanguageWithConfidence(code);
      expect(language).toBe(detectLanguage(code));
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    }
  });

  it("is more confident about a full snippet than a one-liner", () => {
    const full = detectLanguageWithConfidence(SAMPLES.python);
    const oneLiner = detectLanguageWithConfidence("x = 1");

    expect(full.confidence).toBeGreaterThan(oneLiner.confidence);
  });

  it("has zero confidence when there is no language", () => {
    expect(detectLanguageWithConfidence("")).toEqual({ language: null, confidence: 0 });
    expect(detectLanguageWithConfidence("hello there")).toEqual({ language: null, confidence: 0 });
  });
});

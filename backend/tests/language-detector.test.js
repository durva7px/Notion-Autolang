import { describe, it, expect } from "vitest";
import {
  detectLanguage,
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

/*
    Compare flourite (production) and highlight.js on the same code.

    npm run compare-detectors            -> built-in labelled samples, scored
    npm run compare-detectors -- notion  -> code blocks on NOTION_PAGE_ID
                                            (expected = the block's current language)
*/

import dotenv from "dotenv";
import notionSdk from "@notionhq/client";

// The SDK is CommonJS; Node can't pull its named exports into ESM.
const { Client } = notionSdk;

import {
  detectLanguage,
  detectLanguageWithHighlight
} from "../services/language-detector.js";
import { fetchCodeBlocks } from "../services/fetch-code-blocks.js";

const SAMPLES = [
  { expected: "javascript", code: `const add = (a, b) => a + b;\nconsole.log(add(1, 2));\nexport default add;` },
  { expected: "typescript", code: `interface User { id: number; name: string }\nconst u: User = { id: 1, name: "a" };\nexport function getName(user: User): string { return user.name; }` },
  { expected: "python", code: `def add(a, b):\n    return a + b\n\nprint(add(1, 2))` },
  { expected: "java", code: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("hi");\n    }\n}` },
  { expected: "c++", code: `#include <iostream>\nint main() {\n    std::cout << "hi" << std::endl;\n    return 0;\n}` },
  { expected: "c", code: `#include <stdio.h>\nint main(void) {\n    printf("hi\\n");\n    return 0;\n}` },
  { expected: "c#", code: `using System;\nnamespace App {\n    class Program {\n        static void Main(string[] args) {\n            Console.WriteLine("hi");\n        }\n    }\n}` },
  { expected: "go", code: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("hi")\n}` },
  { expected: "rust", code: `fn main() {\n    let v: Vec<i32> = vec![1, 2, 3];\n    println!("{:?}", v);\n}` },
  { expected: "ruby", code: `class Greeter\n  def greet(name)\n    puts "Hello #{name}"\n  end\nend` },
  { expected: "php", code: `<?php\n$name = "world";\necho "Hello $name";\n?>` },
  { expected: "sql", code: `SELECT id, name FROM users WHERE active = 1 ORDER BY name;` },
  { expected: "html", code: `<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Hi</h1>\n  </body>\n</html>` },
  { expected: "css", code: `.button {\n  color: #fff;\n  background: blue;\n  padding: 4px 8px;\n}` },
  { expected: "json", code: `{\n  "name": "autolang",\n  "version": "1.0.0",\n  "private": true\n}` },
  { expected: "yaml", code: `name: CI\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest` },
  { expected: "docker", code: `FROM node:22\nWORKDIR /app\nCOPY . .\nRUN npm ci\nCMD ["node", "server.js"]` },
  { expected: "kotlin", code: `fun main() {\n    val name = "world"\n    println("Hello, $name")\n}` }
];

async function loadNotionSamples() {
  dotenv.config({ path: new URL("../.env", import.meta.url), quiet: true });
  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const blocks = await fetchCodeBlocks(notion, process.env.NOTION_PAGE_ID);
  return blocks.map(block => ({ expected: block.language, code: block.content }));
}

const samples = process.argv[2] === "notion" ? await loadNotionSamples() : SAMPLES;

let flouriteHits = 0;
let highlightHits = 0;
const rows = samples.map(({ expected, code }) => {
  const flourite = detectLanguage(code);
  const highlight = detectLanguageWithHighlight(code);
  if (flourite === expected) flouriteHits++;
  if (highlight === expected) highlightHits++;
  return {
    expected,
    flourite: `${flourite ?? "-"} ${flourite === expected ? "✓" : "✗"}`,
    "highlight.js": `${highlight ?? "-"} ${highlight === expected ? "✓" : "✗"}`
  };
});

console.table(rows);
const pct = n => `${n}/${samples.length} (${Math.round((n / samples.length) * 100)}%)`;
console.log(`flourite:     ${pct(flouriteHits)}`);
console.log(`highlight.js: ${pct(highlightHits)}`);

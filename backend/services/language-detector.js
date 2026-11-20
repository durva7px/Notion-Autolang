import flourite from "flourite";
import hljs from "highlight.js";

/** Every language a Notion code block accepts (Notion API `LanguageRequest`). */
export const NOTION_LANGUAGES = new Set([
  "abap", "abc", "agda", "arduino", "ascii art", "assembly", "bash", "basic", "bnf",
  "c", "c#", "c++", "clojure", "coffeescript", "coq", "css", "dart", "dhall", "diff",
  "docker", "ebnf", "elixir", "elm", "erlang", "f#", "flow", "fortran", "gherkin",
  "glsl", "go", "graphql", "groovy", "haskell", "hcl", "html", "idris", "java",
  "javascript", "json", "julia", "kotlin", "latex", "less", "lisp", "livescript",
  "llvm ir", "lua", "makefile", "markdown", "markup", "matlab", "mathematica",
  "mermaid", "nix", "notion formula", "objective-c", "ocaml", "pascal", "perl", "php",
  "plain text", "powershell", "prolog", "protobuf", "purescript", "python", "r",
  "racket", "reason", "ruby", "rust", "sass", "scala", "scheme", "scss", "shell",
  "smalltalk", "solidity", "sql", "swift", "toml", "typescript", "vb.net", "verilog",
  "vhdl", "visual basic", "webassembly", "xml", "yaml", "java/c/c++/c#"
]);

// Detector names that differ from Notion's. Anything else is lower-cased and
// accepted only if Notion knows it.
const ALIASES = {
  // flourite
  dockerfile: "docker",
  // highlight.js
  cpp: "c++",
  csharp: "c#",
  objectivec: "objective-c",
  vbnet: "vb.net",
  fsharp: "f#",
  llvm: "llvm ir",
  wasm: "webassembly",
  tex: "latex",
  "x86asm": "assembly",
  scheme: "scheme",
  plaintext: null
};

function toNotionLanguage(detectorName) {
  if (!detectorName) return null;
  const name = detectorName.toLowerCase();
  if (name in ALIASES) return ALIASES[name];
  return NOTION_LANGUAGES.has(name) ? name : null;
}

/**
 * Production detector (flourite). Returns a Notion code-block language,
 * or null when the code is empty or the language can't be determined.
 */
export function detectLanguage(code) {
  if (typeof code !== "string" || code.trim() === "") return null;
  const { language } = flourite(code, { noUnknown: false });
  return language === "Unknown" ? null : toNotionLanguage(language);
}

// Damps confidence for snippets with little evidence: flourite scores are raw
// points, so a one-liner scoring 2 shouldn't count as much as a snippet scoring 9.
const EVIDENCE_DAMPING = 2;

/**
 * Like detectLanguage, plus a 0–1 confidence: how far the winning language's
 * flourite score is ahead of the runner-up, damped for small scores.
 */
export function detectLanguageWithConfidence(code) {
  const none = { language: null, confidence: 0 };
  if (typeof code !== "string" || code.trim() === "") return none;

  const { language: detected, statistics } = flourite(code, { noUnknown: false });
  const language = detected === "Unknown" ? null : toNotionLanguage(detected);
  if (!language) return none;

  const top = statistics[detected] ?? 0;
  const runnerUp = Math.max(
    0,
    ...Object.entries(statistics)
      .filter(([name]) => name !== detected && name !== "Unknown")
      .map(([, score]) => score)
  );
  const confidence = Math.max(0, top - runnerUp) / (top + EVIDENCE_DAMPING);
  return { language, confidence: Math.round(confidence * 100) / 100 };
}

// Restrict highlight.js to languages Notion supports; otherwise it happily
// answers "dns" or "routeros" for ordinary Python and JavaScript.
const HIGHLIGHT_SUBSET = hljs
  .listLanguages()
  .filter(name => toNotionLanguage(name) !== null);

/** highlight.js detector, used only to compare accuracy against flourite. */
export function detectLanguageWithHighlight(code) {
  if (typeof code !== "string" || code.trim() === "") return null;
  const { language } = hljs.highlightAuto(code, HIGHLIGHT_SUBSET);
  return toNotionLanguage(language);
}

import hljs from "highlight.js";

const LANGUAGE_MAP = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  sh: "shell",
  bash: "shell",
  html: "html",
  css: "css",
  json: "json",
  sql: "sql",
  java: "java",
  cpp: "c++",
  csharp: "c#",
};

export function detectLanguage(source) {
  const code = source.trim();
  console.log(`\n 
    Code Snippet: 
    ${code}
    \n
    `)

  // Short or empty snippets are too ambiguous.
  if (code.length < 8 || code.split("\n").length < 2) {
    return { language: null, confidence: 0 };
  }

  const result = hljs.highlightAuto(code);
  const language = LANGUAGE_MAP[result.language] ?? result.language;

  return {
    language: language ?? null,
    confidence: result.relevance > 0 ? result.relevance : 0,
  };
}
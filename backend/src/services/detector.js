
import hljs from "highlight.js/lib/core";

import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import cpp from "highlight.js/lib/languages/cpp";
import sql from "highlight.js/lib/languages/sql";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";

const languages = {
  javascript,
  typescript,
  python,
  java,
  cpp,
  sql,
  json,
  bash,
  css,
  xml
};

Object.entries(languages).forEach(([name, grammar]) => {
  hljs.registerLanguage(name, grammar);
});

// Highlight.js identifiers -> Notion identifiers.
// Verify identifiers against Notion's supported-language list.
const NOTION_LANGUAGE_MAP = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  cpp: "c++",
  sql: "sql",
  json: "json",
  bash: "shell",
  css: "css",
  xml: "xml"
};

export function detectLanguage(code) {
  if (!code || typeof code !== "string") {
    return null;
  }

  const source = code.trim();

  // Avoid guessing on extremely small snippets.
  if (source.length < 20) {
    return null;
  }

  const result = hljs.highlightAuto(
    source,
    Object.keys(languages)
  );

  if (!result.language || result.relevance < 3) {
    return null;
  }

  const secondScore = result.secondBest?.relevance ?? 0;

  // If the top two languages are similarly ranked,
  // the prediction is too ambiguous.
  if (result.relevance - secondScore < 2) {
    return null;
  }

  const notionLanguage =
    NOTION_LANGUAGE_MAP[result.language];

  if (!notionLanguage) {
    return null;
  }

  return {
    language: notionLanguage,
    detectedAs: result.language,
    relevance: result.relevance,
    secondBestRelevance: secondScore
  };
}

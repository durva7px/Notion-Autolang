import { apiUrl } from '../config.js'

/** Why a detection request didn't give an answer: 'unreachable', 'rate_limited' or 'failed'. */
export class DetectError extends Error {
  constructor(kind) {
    super(kind)
    this.kind = kind
  }
}

/**
 * Asks the backend which language `code` is, the same way page sync does.
 * Resolves to { language, confidence, confident }; `language` is Notion's name or null.
 * Public endpoint: no cookies, no Notion connection.
 */
export async function detectLanguage(code, { signal } = {}) {
  let response
  try {
    response = await fetch(new URL('/detect', apiUrl()).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      credentials: 'omit',
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new DetectError('unreachable')
  }
  if (response.status === 429) throw new DetectError('rate_limited')
  if (!response.ok) throw new DetectError('failed')
  return response.json()
}

// Notion's own spelling where title case isn't enough.
const LABELS = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  coffeescript: 'CoffeeScript',
  livescript: 'LiveScript',
  purescript: 'PureScript',
  powershell: 'PowerShell',
  graphql: 'GraphQL',
  'objective-c': 'Objective-C',
  'vb.net': 'VB.Net',
  'llvm ir': 'LLVM IR',
  webassembly: 'WebAssembly',
  latex: 'LaTeX',
  matlab: 'MATLAB',
  php: 'PHP',
  sql: 'SQL',
  css: 'CSS',
  scss: 'SCSS',
  html: 'HTML',
  xml: 'XML',
  json: 'JSON',
  yaml: 'YAML',
  toml: 'TOML',
  hcl: 'HCL',
  glsl: 'GLSL',
  vhdl: 'VHDL',
  abap: 'ABAP',
  bnf: 'BNF',
  ebnf: 'EBNF',
  ocaml: 'OCaml',
  'java/c/c++/c#': 'Java/C/C++/C#',
}

/** Notion's language name ("typescript", "c++") as shown in its menu ("TypeScript", "C++"). */
export function languageLabel(language) {
  if (LABELS[language]) return LABELS[language]
  return language.replace(/(^|\s)\S/g, s => s.toUpperCase())
}

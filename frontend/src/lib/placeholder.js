// The playground's language menu and placeholder.

/**
 * Every language a Notion code block accepts (Notion API `LanguageRequest`).
 * Keep in step with NOTION_LANGUAGES in backend/services/language-detector.js.
 */
export const NOTION_LANGUAGES = [
  'abap', 'abc', 'agda', 'arduino', 'ascii art', 'assembly', 'bash', 'basic', 'bnf',
  'c', 'c#', 'c++', 'clojure', 'coffeescript', 'coq', 'css', 'dart', 'dhall', 'diff',
  'docker', 'ebnf', 'elixir', 'elm', 'erlang', 'f#', 'flow', 'fortran', 'gherkin',
  'glsl', 'go', 'graphql', 'groovy', 'haskell', 'hcl', 'html', 'idris', 'java',
  'javascript', 'json', 'julia', 'kotlin', 'latex', 'less', 'lisp', 'livescript',
  'llvm ir', 'lua', 'makefile', 'markdown', 'markup', 'matlab', 'mathematica',
  'mermaid', 'nix', 'notion formula', 'objective-c', 'ocaml', 'pascal', 'perl', 'php',
  'plain text', 'powershell', 'prolog', 'protobuf', 'purescript', 'python', 'r',
  'racket', 'reason', 'ruby', 'rust', 'sass', 'scala', 'scheme', 'scss', 'shell',
  'smalltalk', 'solidity', 'sql', 'swift', 'toml', 'typescript', 'vb.net', 'verilog',
  'vhdl', 'visual basic', 'webassembly', 'xml', 'yaml', 'java/c/c++/c#',
]

const EXAMPLE = [
  'Write your code here and AutoLang will detect the language. For example:',
  '',
  'def greet(name):',
  '    return f"Hello, {name}!"',
]

// How each language writes a comment: a line prefix, or [open, close] for a block.
// Languages without comments (Plain Text, ASCII art, JSON, diff) use #, like the Python example.
const LINE = {
  '#': ['bash', 'shell', 'python', 'r', 'ruby', 'perl', 'elixir', 'yaml', 'toml', 'docker', 'makefile',
    'nix', 'powershell', 'julia', 'coffeescript', 'graphql', 'hcl', 'gherkin', 'livescript', 'diff',
    'plain text', 'ascii art'],
  '//': ['c', 'c#', 'c++', 'java', 'javascript', 'typescript', 'go', 'rust', 'swift', 'kotlin', 'scala',
    'dart', 'groovy', 'php', 'objective-c', 'solidity', 'flow', 'glsl', 'less', 'scss', 'sass', 'protobuf',
    'reason', 'verilog', 'arduino', 'java/c/c++/c#', 'f#', 'json'],
  '--': ['sql', 'haskell', 'lua', 'elm', 'idris', 'agda', 'purescript', 'vhdl', 'dhall'],
  ';': ['lisp', 'clojure', 'scheme', 'racket', 'assembly', 'llvm ir', 'bnf'],
  ';;': ['webassembly'],
  '%': ['latex', 'erlang', 'prolog', 'matlab', 'abc'],
  '%%': ['mermaid'],
  "'": ['visual basic', 'vb.net'],
  '"': ['abap'],
  '!': ['fortran'],
  REM: ['basic'],
}

const BLOCK = {
  html: ['<!--', '-->'],
  xml: ['<!--', '-->'],
  markup: ['<!--', '-->'],
  markdown: ['<!--', '-->'],
  css: ['/*', '*/'],
  'notion formula': ['/*', '*/'],
  ocaml: ['(*', '*)'],
  coq: ['(*', '*)'],
  pascal: ['(*', '*)'],
  mathematica: ['(*', '*)'],
  ebnf: ['(*', '*)'],
  smalltalk: ['"', '"'],
}

const LINE_PREFIX = Object.fromEntries(
  Object.entries(LINE).flatMap(([prefix, languages]) => languages.map(language => [language, prefix])),
)

/** The playground's placeholder: the Python example, commented out the way `language` writes comments. */
export function placeholderFor(language) {
  const block = BLOCK[language]
  if (block) return [block[0], ...EXAMPLE, block[1]].join('\n')

  const prefix = LINE_PREFIX[language] ?? '#'
  return EXAMPLE.map(line => (line ? `${prefix} ${line}` : prefix)).join('\n')
}

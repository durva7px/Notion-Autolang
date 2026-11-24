import { githubLinks } from './landing.js'

// Every answer here describes what the code actually does. When behaviour
// changes (backend/, extension/), update the matching answer.
export const faqGroups = [
  { id: 'basics', title: 'The basics' },
  { id: 'access', title: 'Notion access' },
  { id: 'privacy', title: 'Privacy & your data' },
  { id: 'using', title: 'Using AutoLang' },
]

export const faqs = [
  {
    id: 'what-is-autolang',
    group: 'basics',
    question: 'What does AutoLang do?',
    answer: [
      'It sets the language of Notion code blocks for you. Write code in a code block, pause, and AutoLang picks the right language (Python, TypeScript, SQL and so on) so you never have to stop and choose it from the menu.',
    ],
  },
  {
    id: 'try-without-installing',
    group: 'basics',
    question: 'Can I try it without installing anything?',
    answer: [
      'Yes. The Playground on the home page uses the same detection as the extension, with no extension and no Notion sign-in.',
    ],
    link: { label: 'Open the Playground', href: '/#playground' },
  },
  {
    id: 'browsers',
    group: 'basics',
    question: 'Which browsers does it work in?',
    answer: ['AutoLang is a Chrome extension, so it works in Chrome on desktop. It only runs on Notion pages.'],
  },
  {
    id: 'open-source',
    group: 'basics',
    question: 'Is AutoLang open source?',
    answer: [
      'Yes. The extension, the backend and this website are all on GitHub, so you can read exactly what runs before you install it.',
    ],
    link: { label: 'View the code on GitHub', href: githubLinks.repo, external: true },
  },
  {
    id: 'workspace-access',
    group: 'access',
    question: 'Which parts of my Notion workspace can AutoLang see?',
    answer: [
      'Only the pages you choose. When you connect, Notion asks which pages to share with AutoLang, and AutoLang can only open those pages and the pages inside them. Everything else in your workspace stays invisible to it.',
      'You can share or unshare pages at any time from Notion: open a page’s ··· menu, then Connections.',
    ],
  },
  {
    id: 'permissions',
    group: 'access',
    question: 'What permissions does AutoLang ask for, and what does it change?',
    answer: [
      'It asks Notion for permission to read and update content on the pages you share. It uses that to read your code blocks and to set a code block’s language. It never edits your text, your code or any other kind of block.',
    ],
  },
  {
    id: 'disconnect',
    group: 'access',
    question: 'How do I disconnect AutoLang from Notion?',
    answer: [
      'Click the AutoLang icon in Chrome and choose Disconnect. That signs AutoLang out and forgets its access to your workspace.',
      'To remove it from Notion completely, also open Notion’s Settings, then Connections, and remove AutoLang there. Uninstalling the extension stops it from watching your pages.',
    ],
  },
  {
    id: 'store-code',
    group: 'privacy',
    question: 'Does AutoLang read or store my code?',
    answer: [
      'It reads the code blocks on the pages you share, because it has to see code to recognise its language. It does not keep your code.',
      'For each code block it remembers only a fingerprint of the code (a SHA-256 hash, which can’t be turned back into the code), the language it last saw, and whether you picked the language yourself. That is how it knows when a block has changed.',
    ],
  },
  {
    id: 'extension-sees',
    group: 'privacy',
    question: 'What does the extension see in my browser?',
    answer: [
      'The extension only runs on Notion pages. It notices when a code block is added or edited and tells AutoLang which page changed by sending the page’s ID. It doesn’t send the page’s content: AutoLang reads the code blocks itself, through Notion, only on pages you shared.',
    ],
  },
  {
    id: 'access-token',
    group: 'privacy',
    question: 'Where is my Notion access token kept?',
    answer: [
      'On AutoLang’s server, with your sign-in session. It is never sent to your browser or the extension. The extension is recognised by a session cookie instead, which scripts on web pages can’t read and which lasts up to 7 days.',
    ],
  },
  {
    id: 'playground-privacy',
    group: 'privacy',
    question: 'Is what I type in the Playground saved?',
    answer: [
      'No. The Playground sends your snippet to AutoLang to detect its language and shows you the answer. The snippet isn’t saved, and no account or sign-in is involved.',
    ],
  },
  {
    id: 'manual-language',
    group: 'using',
    question: 'Will AutoLang overwrite a language I picked myself?',
    answer: [
      'No. As soon as you choose a code block’s language by hand, AutoLang leaves that block alone for good, even if you edit its code later.',
    ],
  },
  {
    id: 'not-sure',
    group: 'using',
    question: 'What happens when AutoLang isn’t sure which language it is?',
    answer: [
      'It leaves the block as it is. AutoLang only changes a language when it is confident, so a short or ambiguous snippet may stay as it is until you write a bit more. You can try this in the Playground: it shows how confident AutoLang is.',
    ],
  },
  {
    id: 'how-fast',
    group: 'using',
    question: 'How quickly does the language change?',
    answer: [
      'About two seconds after you stop typing. AutoLang waits for a pause so it isn’t guessing from half-written code.',
    ],
  },
  {
    id: 'languages',
    group: 'using',
    question: 'Which languages can it detect?',
    answer: [
      'Python, JavaScript, TypeScript, Java, C, C++, C#, Go, Rust, Ruby, PHP, Kotlin, Dart, Elixir, Clojure, Julia, Lua, Pascal, SQL, HTML, CSS, JSON, YAML, Markdown and Dockerfiles.',
      'Other languages, such as shell scripts, aren’t recognised yet, so AutoLang leaves those blocks for you to set.',
    ],
  },
]

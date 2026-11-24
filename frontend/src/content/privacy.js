import { githubLinks } from './landing.js'

// The privacy policy linked from the Chrome Web Store listing. Like faq.js,
// every statement describes what the code does; when backend/ or extension/
// changes what is sent or kept, update this and EFFECTIVE_DATE together.
export const EFFECTIVE_DATE = '24 November 2026'

export const issuesUrl = `${githubLinks.repo}/issues`

export const privacySections = [
  {
    id: 'summary',
    title: 'In short',
    paragraphs: [
      'Notion AutoLang sets the language of Notion code blocks. To do that it reads code blocks on the Notion pages you share with it. It does not keep your code, does not sell any data, does not show ads and does not use analytics or tracking.',
    ],
  },
  {
    id: 'extension',
    title: 'What the Chrome extension sends',
    paragraphs: [
      'The extension only runs on Notion pages (notion.so and app.notion.com). When a code block is added or edited, it sends the page ID of that page to the AutoLang backend, together with your AutoLang session cookie. It does not send the page’s content, your browsing history or anything from other websites.',
      'In the browser it keeps only the connection status (for example, which workspace is connected) in Chrome’s session storage, which Chrome clears when you close the browser.',
    ],
  },
  {
    id: 'notion',
    title: 'What AutoLang reads in Notion',
    paragraphs: [
      'When you connect, Notion asks which pages to share with AutoLang. AutoLang can only open those pages and the pages inside them. It reads their code blocks to recognise each block’s language and changes only a code block’s language setting. It never edits your text, your code or any other kind of block.',
    ],
  },
  {
    id: 'stored',
    title: 'What the backend keeps, and for how long',
    paragraphs: [
      'Your sign-in session: the Notion access token and refresh token Notion issues when you connect, plus your workspace’s ID, name and icon. It is kept on the server for up to 7 days and deleted when you choose Disconnect. The token is never sent to your browser or the extension, which are recognised by a session cookie that scripts on web pages can’t read.',
      'For each code block AutoLang has processed: the block’s ID, a SHA-256 fingerprint of its code (which can’t be turned back into the code), the language it last saw, and whether you picked the language yourself. This is how AutoLang knows when a block changed and never overrides a language you chose. These records contain no code and no account details.',
      'Server error logs record error messages, never your code or access token, and are deleted automatically after 7 days.',
    ],
  },
  {
    id: 'playground',
    title: 'The website and the Playground',
    paragraphs: [
      'The Playground on this website sends the snippet you type to AutoLang to detect its language. The snippet is processed in memory and not saved. To limit how many requests one visitor can make, your IP address is counted in the server’s memory only; it is never written to storage.',
    ],
  },
  {
    id: 'processors',
    title: 'Who else handles the data',
    paragraphs: [
      'Notion, which hosts your workspace and issues the access token. Amazon Web Services (AWS), which runs the AutoLang backend and stores the data above in its Sydney (ap-southeast-2) region. Vercel, which hosts this website and keeps standard request logs. AutoLang shares data with no one else.',
    ],
  },
  {
    id: 'commitments',
    title: 'How the data is used',
    paragraphs: [
      'The data above is used only to set the language of your Notion code blocks and to keep AutoLang working. AutoLang does not sell or transfer it to third parties, does not use it for advertising, creditworthiness or lending, and does not use it for anything unrelated to that single purpose.',
      'The use of information received by the extension complies with the Chrome Web Store User Data Policy, including the Limited Use requirements.',
    ],
  },
  {
    id: 'control',
    title: 'Your choices',
    paragraphs: [
      'Click the AutoLang icon in Chrome and choose Disconnect to sign out and delete your session, including the Notion access token. To remove AutoLang’s access in Notion as well, open Notion’s Settings, then Connections, and remove AutoLang. Uninstalling the extension stops it from watching your pages.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes and contact',
    paragraphs: [
      'If this policy changes, this page will show the new effective date. AutoLang is open source, so you can read exactly what it does in the repository.',
    ],
    link: { label: 'Questions? Open a GitHub issue', href: issuesUrl },
  },
]

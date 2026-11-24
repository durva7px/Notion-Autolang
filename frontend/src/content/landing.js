// All landing page copy lives here so sections stay purely presentational.
import check from '../assets/icons/check.png'
import gear from '../assets/icons/gear.png'
import technologistAlt from '../assets/icons/technologist-alt.png'
// Light-mode recording for now. The dark one (autolang-demo.mp4 + poster) sits next
// to it for when the site gets a light/dark toggle.
import demoVideo from '../assets/demo/autolang-demo-light.mp4'
import demoPoster from '../assets/demo/autolang-demo-light-poster.jpg'

// Absolute (/#…) so they also work from other pages such as /faq.
export const navLinks = [
  { label: 'About Us', href: '/#about' },
  { label: 'Demo', href: '/#demo' },
  { label: 'Playground', href: '/#playground' },
]

export const faqLink = { label: 'FAQ', href: '/faq' }

export const githubLinks = {
  repo: 'https://github.com/durva7px/Notion-Autolang',
  profile: 'https://github.com/durva7px',
}

export const hero = {
  headingLines: ['You write code.', 'We get the'],
  typedWord: {
    base: 'language.',
    // Colours loosely follow each language's brand, darkened where needed to stay readable on white.
    extensions: [
      { ext: 'js', color: '#b58900' },
      { ext: 'py', color: '#3776ab' },
      { ext: 'html', color: '#e34c26' },
      { ext: 'ts', color: '#2f74c0' },
      { ext: 'java', color: '#b07219' },
      { ext: 'cpp', color: '#f34b7d' },
      { ext: 'go', color: '#0089b0' },
      { ext: 'rs', color: '#b7410e' },
      { ext: 'php', color: '#4f5d95' },
      { ext: 'rb', color: '#cc342d' },
      { ext: 'kt', color: '#7f52ff' },
      { ext: 'swift', color: '#f05138' },
      { ext: 'cs', color: '#178600' },
      { ext: 'sql', color: '#c06e00' },
    ],
  },
  badge: 'built by a  developer for developers <3',
}

export const steps = [
  {
    number: '01',
    title: 'Download the extension',
    icon: gear,
    description: 'Add AutoLang to Chrome and pin it to your toolbar.',
  },
  {
    number: '02',
    title: 'Connect Notion from the extension',
    icon: check,
    description: 'Click the AutoLang icon, then Connect Notion. No manual API-key setup.',
    // Also the card's anchor. The extension's sign-in lands on the website's
    // "connected" page, which marks this step done.
    id: 'connect-notion',
  },
  {
    number: '03',
    title: 'Start writing code',
    icon: technologistAlt,
    description: 'Go back to Notion and write naturally inside a code block.',
  },
]

export const demo = {
  video: demoVideo,
  poster: demoPoster,
  label:
    "Demo: writing a developer guide in Notion while AutoLang sets each code block's language",
}

export const playground = {
  //hint: 'Try writing any code snippet in the code block',
  sample: `// write your code here and AutoLang will detect the language`,
  // Shown under the block, like a Notion code block caption.
  caption: 'Write your code here and AutoLang will detect the language',
}

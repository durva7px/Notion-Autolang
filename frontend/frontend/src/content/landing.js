// All landing page copy lives here so sections stay purely presentational.
import check from '../assets/icons/check.png'
import gear from '../assets/icons/gear.png'
import technologistAlt from '../assets/icons/technologist-alt.png'

export const navLinks = [
  { label: 'About Us', href: '#about' },
  { label: 'Support', href: '#support' },
  { label: 'Resources', href: '#resources' },
]

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
    title: 'Sign Up to Authorize Workspace',
    icon: check,
    description: 'Authorize AutoLang with Notion. No manual API-key setup.',
  },
  {
    number: '02',
    title: 'Download extension and enable',
    icon: gear,
    description: 'Setup browser extension to let AutoLang access your code blocks',
  },
  {
    number: '03',
    title: 'Start writing code',
    icon: technologistAlt,
    description: 'Go back to Notion and write naturally inside a code block.',
  },
]

export const playground = {
  language: 'Python',
  hint: 'Try writing any code snippet in the code block',
  sample: `def calculate_average(numbers):

  total = sum(numbers)
  count = len(numbers)

  if count == 0:
    return 0

  return total / count`,
}

export const footerLinks = [
  [
    { label: 'Support', href: '#support' },
    { label: 'Contact Us', href: '#contact' },
  ],
  [
    { label: 'FAQ', href: '#faq' },
    { label: 'Help', href: '#help' },
  ],
]

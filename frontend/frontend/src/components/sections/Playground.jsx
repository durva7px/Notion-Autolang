import Section from '../ui/Section.jsx'
import Cursor from '../ui/Cursor.jsx'
import CodeBlock from './CodeBlock.jsx'
import { playground } from '../../content/landing.js'
import styles from './Playground.module.css'

export default function Playground() {
  return (
    <Section
      id="playground"
      title="AutoLang Playground"
      titleAccessory={<Cursor rotate={-90} className={styles.cursor} />}
    >
      <CodeBlock initialCode={playground.sample} language={playground.language} />
      <p className={styles.hint}>{playground.hint}</p>
    </Section>
  )
}

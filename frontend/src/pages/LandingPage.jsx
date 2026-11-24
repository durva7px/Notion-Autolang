import { useEffect } from 'react'
import Header from '../components/layout/Header.jsx'
import Footer from '../components/layout/Footer.jsx'
import Hero from '../components/sections/Hero.jsx'
import HowToUse from '../components/sections/HowToUse.jsx'
import Demo from '../components/sections/Demo.jsx'
import Playground from '../components/sections/Playground.jsx'
import DeveloperNote from '../components/sections/DeveloperNote.jsx'

export default function LandingPage() {
  // Links from other pages (e.g. /#demo from the FAQ) land before React has drawn
  // the section, so the browser can't jump to it on its own.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (id) document.getElementById(id)?.scrollIntoView()
  }, [])

  return (
    <>
      <Header />
      <main>
        <Hero />
        <HowToUse />
        <Demo />
        <Playground />
        <DeveloperNote />
      </main>
      <Footer />
    </>
  )
}

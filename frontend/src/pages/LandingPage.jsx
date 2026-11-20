import Header from '../components/layout/Header.jsx'
import Footer from '../components/layout/Footer.jsx'
import Hero from '../components/sections/Hero.jsx'
import HowToUse from '../components/sections/HowToUse.jsx'
import Demo from '../components/sections/Demo.jsx'
import Playground from '../components/sections/Playground.jsx'
import DeveloperNote from '../components/sections/DeveloperNote.jsx'

export default function LandingPage() {
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

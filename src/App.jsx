import Hero from './components/Hero.jsx'

// Demo page for the Onward Hero component. In a real app you'd render
// <Hero /> directly wherever the landing graphic belongs.
export default function App() {
  return <Hero onCtaClick={() => console.log('Onward!')} />
}

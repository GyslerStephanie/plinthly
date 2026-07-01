import { useEffect, useMemo, useState } from 'react'
import Cloud from './Cloud.jsx'
import House from './House.jsx'
import Controls from './Controls.jsx'
import { makeHouses } from '../../lib/house.js'
import '../../styles/hero.css'

const clampDensity = (n) => Math.max(4, Math.min(24, Math.round(n)))

export default function Hero({
  pace: paceProp = 1,
  density: densityProp = 12,
  coralRoofs: coralProp = false,
  // Copy is exposed as props (English defaults) so it can be wired to i18n
  // without touching the component.
  eyebrow = 'Onward · upward',
  wordmark = 'Plinthly',
  tagline = 'Honest numbers, grounded in nature.',
  sub = 'See what you can buy, build, or renovate in Switzerland — before you talk to a bank.',
  ctaLabel = 'Start',
  // The built-in arrow — turn off when ctaLabel already ends in one (e.g. an
  // i18n string like "Get started →").
  ctaArrow = true,
  // Optional secondary "skip" affordance (e.g. straight to the calculator).
  skipLabel,
  onSkip,
  footnote = 'No account · nothing saved · nothing sold',
  // The tweak panel is a prototype/dev knob — off in production by default.
  showControls = false,
  onCtaClick,
}) {
  const [pace, setPace] = useState(paceProp)
  const [density, setDensity] = useState(clampDensity(densityProp))
  const [coralRoofs, setCoralRoofs] = useState(coralProp)

  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduce(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // House positions are regenerated only when the count changes; pace/coral
  // tweaks reuse the same layout.
  const houses = useMemo(() => makeHouses(density), [density])

  const handleControls = (patch) => {
    if (patch.pace !== undefined) setPace(patch.pace)
    if (patch.density !== undefined) setDensity(clampDensity(patch.density))
    if (patch.coralRoofs !== undefined) setCoralRoofs(patch.coralRoofs)
  }

  return (
    <div className="hero" data-screen-label="Onward hero">
      {/* sun / horizon glow near the vanishing point */}
      <div className="hero__sun" />

      {/* far clouds */}
      <Cloud
        tint="#dbe9e8"
        style={{
          top: '12%',
          width: 150,
          zIndex: 3,
          opacity: 0.9,
          animationDuration: '62s',
          animationDelay: '-8s',
        }}
      />
      <Cloud
        tint="#dbe9e8"
        style={{
          top: '40%',
          width: 110,
          zIndex: 3,
          opacity: 0.85,
          animationDuration: '84s',
          animationDelay: '-46s',
        }}
      />
      <Cloud
        tint="#dbe9e8"
        style={{
          top: '6%',
          width: 96,
          zIndex: 3,
          opacity: 0.8,
          animationDuration: '96s',
          animationDelay: '-30s',
        }}
      />

      {/* houses receding toward the vanishing point */}
      <div className="hero__stage">
        {houses.map((desc, i) => (
          <House
            key={`${density}-${i}`}
            desc={desc}
            index={i}
            count={houses.length}
            pace={pace}
            coralRoofs={coralRoofs}
            reduce={reduce}
          />
        ))}
      </div>

      {/* near / foreground clouds (parallax, faint so text stays legible) */}
      <Cloud
        tint="#eef4f3"
        style={{
          top: '70%',
          width: 280,
          zIndex: 200,
          opacity: 0.55,
          animationDuration: '40s',
          animationDelay: '-24s',
        }}
      />
      <Cloud
        tint="#eef4f3"
        style={{
          top: '84%',
          width: 340,
          zIndex: 200,
          opacity: 0.5,
          animationDuration: '52s',
          animationDelay: '-4s',
        }}
      />

      {/* centered content */}
      <div className="hero__content">
        <div className="hero__scrim" />

        <div className="hero__eyebrow">{eyebrow}</div>

        <h1 className="hero__wordmark">{wordmark}</h1>

        <p className="hero__tagline">{tagline}</p>

        <p className="hero__sub">{sub}</p>

        <div className="hero__cta-wrap">
          <button type="button" className="hero__cta" onClick={onCtaClick}>
            {ctaLabel}
            {ctaArrow && <span className="hero__cta-arrow">&rarr;</span>}
          </button>

          {onSkip && (
            <button type="button" className="hero__skip" onClick={onSkip}>
              {skipLabel}
            </button>
          )}
        </div>

        <div className="hero__footnote">{footnote}</div>
      </div>

      {showControls && (
        <Controls
          pace={pace}
          density={density}
          coralRoofs={coralRoofs}
          onChange={handleControls}
        />
      )}
    </div>
  )
}

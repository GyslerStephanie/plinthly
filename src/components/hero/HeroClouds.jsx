import Cloud from './Cloud'

/**
 * Airy voxel clouds behind the "Can I buy?" card. Three depths: far clouds are
 * small, pale, soft and slow; near ones larger and a little quicker, so they
 * read as receding into the sky. They drift across the card on a loop
 * (index.css `.ds-hero-cloud`), and stand still for reduced motion.
 */
const CLOUDS = [
  // far
  { top: '8%', width: 70, opacity: 0.55, blur: 1.2, duration: 95, delay: -20, tint: '#e6f0ef' },
  { top: '26%', width: 56, opacity: 0.45, blur: 1.5, duration: 110, delay: -70, tint: '#e6f0ef' },
  // mid
  { top: '14%', width: 104, opacity: 0.75, blur: 0.4, duration: 70, delay: -42, tint: '#dbe9e8' },
  // near
  { top: '58%', width: 150, opacity: 0.85, blur: 0, duration: 52, delay: -12, tint: '#dbe9e8' },
]

export default function HeroClouds() {
  return (
    <div className="ds-hero-clouds" aria-hidden="true">
      {CLOUDS.map((c, i) => (
        <Cloud
          key={i}
          tint={c.tint}
          className="ds-hero-cloud"
          style={{
            top: c.top,
            width: c.width,
            height: c.width * (80 / 180),
            opacity: c.opacity,
            filter: c.blur ? `blur(${c.blur}px)` : undefined,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

import Cloud from './Cloud'

/**
 * Airy voxel clouds behind the "Can I buy?" card. Three depths in six sizes (96 to 300px wide): far clouds are
 * small, pale, soft and slow; near ones much larger and a little quicker, so they
 * read as receding into the sky. They drift across the card on a loop
 * (index.css `.ds-hero-cloud`), and stand still for reduced motion.
 */
const CLOUDS = [
  // far: small to medium, pale and soft
  { top: '6%', width: 96, opacity: 0.5, blur: 1.4, duration: 110, delay: -20, tint: '#e6f0ef' },
  { top: '30%', width: 132, opacity: 0.45, blur: 1.2, duration: 125, delay: -80, tint: '#e6f0ef' },
  // mid
  { top: '12%', width: 190, opacity: 0.72, blur: 0.5, duration: 78, delay: -42, tint: '#dbe9e8' },
  { top: '40%', width: 150, opacity: 0.65, blur: 0.6, duration: 88, delay: -64, tint: '#dbe9e8' },
  // near: the largest, crisp
  { top: '52%', width: 300, opacity: 0.85, blur: 0, duration: 58, delay: -12, tint: '#dbe9e8' },
  { top: '-4%', width: 240, opacity: 0.8, blur: 0, duration: 66, delay: -36, tint: '#dbe9e8' },
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

import { useState } from 'react'

// Timber-and-glass house with a green roof and solar panels on the voxel island.
const SRC = '/brand/voxel-island-house.svg'
const LAYERS = 8
const SEEN_KEY = 'plinthly.islandBuilt'

/**
 * The Phase 1 voxel island, built layer by layer on first appearance: the
 * image is sliced into horizontal bands that drop into place from the base
 * up, like blocks being stacked, then the whole island settles. Plays once
 * per visit (sessionStorage); reduced-motion users get the finished island
 * (CSS skips the animation).
 */
export default function BuildIsland({ className = '' }) {
  const [animate] = useState(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY) === '1') return false
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* storage blocked: just animate */
    }
    return true
  })

  if (!animate) return <img src={SRC} alt="" className={`ds-hero-land ${className}`} />

  const step = 100 / LAYERS
  return (
    <span className={`ds-hero-land ds-build ${className}`} aria-hidden="true">
      {/* Sizing copy: keeps the box the image's shape; never shown. */}
      <img src={SRC} alt="" className="ds-build-ghost" />
      {Array.from({ length: LAYERS }, (_, i) => {
        // i = 0 is the bottom band; it lands first.
        const top = 100 - step * (i + 1)
        const bottom = step * i
        return (
          <img
            key={i}
            src={SRC}
            alt=""
            className="ds-build-layer"
            style={{
              clipPath: `inset(${top}% 0 ${bottom}% 0)`,
              animationDelay: `${150 + i * 110}ms`,
            }}
          />
        )
      })}
    </span>
  )
}

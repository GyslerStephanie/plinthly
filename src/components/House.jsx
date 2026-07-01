import { useMemo } from 'react'
import { houseSVG } from '../lib/house.js'

// One voxel house travelling the recede path. Positions come from the
// descriptor; duration/delay are derived from `pace` so speed tweaks don't
// reshuffle the scene. In reduced-motion mode houses are frozen along the path.
export default function House({ desc, index, count, pace, coralRoofs, reduce }) {
  const svg = useMemo(() => houseSVG(desc.seed, coralRoofs), [desc.seed, coralRoofs])

  const dur = 24 / Math.max(0.2, pace)

  const style = {
    '--nx': desc.nx + 'vw',
    '--ny': desc.ny + 'vh',
    '--s0': desc.s0,
  }

  if (reduce) {
    // Freeze houses along the path, evenly spread by depth — no animation.
    const d = (index + 0.5) / count
    const near = 1 - d
    const s = (0.045 + (desc.s0 - 0.045) * Math.pow(near, 1.5)).toFixed(3)
    style.transform = `translate(${(desc.nx * near).toFixed(2)}vw, ${(
      desc.ny * near
    ).toFixed(2)}vh) scale(${s})`
    style.opacity = near > 0.06 ? Math.min(1, near * 1.5) : near * 16
  } else {
    const delay = -(((index + desc.offset) / count) * dur)
    style.animation = `recede ${dur.toFixed(2)}s cubic-bezier(0.33,0,0.4,1) infinite`
    style.animationDelay = `${delay.toFixed(2)}s`
  }

  return (
    <div
      className="house"
      style={style}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

// Procedural voxel-house SVG, ported from the Onward Hero prototype.
// Each house is a grass-topped plinth (echoing the brand mark) carrying a
// front-facing pixel house, flanked by little voxel trees.

// Small deterministic PRNG (mulberry32-style) so a given seed always yields
// the same house — keeps a house's look stable across re-renders.
export function rng(seed) {
  let t = seed >>> 0
  return function () {
    t += 0x6d2b79f5
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

// Palette sampled directly from the Plinthly colour tokens.
const WALLS = ['#f1e3c6', '#f3f3ee', '#faf4e6', '#e6d0a2'] // sand / stone walls
const CORAL = '#dd5c47' // --coral-400 accent
const ROOFS = [CORAL, '#566d29', '#7e5f3d', '#a9803a', '#4f7d88']
const WINDOW = '#cfe0e0'
const DOOR = '#5e451d'

function tree(cx, by, sc) {
  const tw = 7 * sc
  const th = 15 * sc
  const c1 = 24 * sc
  const c2 = 15 * sc
  const cTop = by - th
  return (
    '<rect x="' + (cx - tw / 2) + '" y="' + cTop + '" width="' + tw + '" height="' + th + '" fill="#5e451d"/>' +
    '<rect x="' + (cx - c1 / 2) + '" y="' + (cTop - c1) + '" width="' + c1 + '" height="' + c1 + '" fill="#6f8a35"/>' +
    '<rect x="' + (cx - c1 / 2) + '" y="' + (cTop - c1) + '" width="' + c1 + '" height="' + (c1 * 0.34) + '" fill="#93ad48"/>' +
    '<rect x="' + (cx - c2 / 2) + '" y="' + (cTop - c1 - c2) + '" width="' + c2 + '" height="' + c2 + '" fill="#566d29"/>' +
    '<rect x="' + (cx - c2 / 2) + '" y="' + (cTop - c1 - c2) + '" width="' + c2 + '" height="' + (c2 * 0.4) + '" fill="#6f8a35"/>'
  )
}

export function houseSVG(seed, coralRoofs = false) {
  const r = rng(seed)
  const wall = WALLS[(r() * WALLS.length) | 0]
  const roof = coralRoofs ? CORAL : ROOFS[(r() * ROOFS.length) | 0]

  // grass-topped plinth block (echoes the brand mark)
  const block =
    '<polygon points="120,110 216,152 120,194 24,152" fill="#93ad48"/>' +
    '<polygon points="24,152 120,194 120,205 24,163" fill="#566d29"/>' +
    '<polygon points="24,163 120,205 120,231 24,189" fill="#7e5f3d"/>' +
    '<polygon points="120,194 216,152 216,163 120,205" fill="#42541f"/>' +
    '<polygon points="120,205 216,163 216,189 120,231" fill="#4f3a23"/>'

  // front-facing pixel house standing on the block
  const house =
    '<polygon points="120,96 156,132 84,132" fill="' + roof + '"/>' +
    '<polygon points="120,96 156,132 138,132 120,110" fill="rgba(0,0,0,0.12)"/>' +
    '<rect x="94" y="132" width="52" height="46" fill="' + wall + '"/>' +
    '<rect x="94" y="132" width="52" height="46" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>' +
    '<rect x="100" y="140" width="13" height="13" fill="' + WINDOW + '"/>' +
    '<rect x="127" y="140" width="13" height="13" fill="' + WINDOW + '"/>' +
    '<rect x="112" y="160" width="16" height="18" fill="' + DOOR + '"/>'

  const backTree = r() > 0.45 ? tree(120 + (r() * 40 - 20), 150, 0.72) : ''
  const leftTree = tree(58 + (r() * 10 - 5), 168 + r() * 6, 0.92 + r() * 0.2)
  const rightTree = tree(182 + (r() * 10 - 5), 166 + r() * 6, 0.9 + r() * 0.2)

  return (
    '<svg viewBox="0 0 240 250" width="100%" height="100%" style="display:block;overflow:visible">' +
    '<ellipse cx="120" cy="222" rx="98" ry="15" fill="#3d3f35" opacity="0.12"/>' +
    block + backTree + house + leftTree + rightTree +
    '</svg>'
  )
}

// Build the per-house descriptors that place houses across depth/lanes.
// Regenerated whenever the count changes; positions stay put for pace tweaks.
export function makeHouses(n) {
  const houses = []
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 2 - 1 // horizontal lane (-1..1)
    houses.push({
      seed: (Math.random() * 1e9) | 0,
      s0: +(0.82 + Math.random() * 0.42).toFixed(3), // near-size variety
      nx: +(a * 47).toFixed(2), // near horizontal offset from vanishing point (vw)
      ny: +(44 + Math.random() * 14).toFixed(2), // near vertical drop toward ground (vh)
      offset: Math.random() * 0.5, // fractional stagger so houses don't sync
    })
  }
  return houses
}

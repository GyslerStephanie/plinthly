/**
 * Build the app as a claude.ai Artifact prototype (a live, clickable copy
 * Stephanie can open and comment on inside Claude).
 *
 *   node scripts/build-prototype.mjs <outDir>
 *
 * Artifacts serve files next to the page, so the build uses relative paths
 * (`--base ./`) and the few hard-coded "/brand/…" image paths are rewritten to
 * "./brand/…". Writes <outDir>/plinthly-prototype.html (the Artifact page) and
 * prints the `files` map to publish alongside it. The API routes (/api/*) do not
 * exist on claude.ai, so the advisor and feedback form won't work there.
 */
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const out = process.argv[2]
if (!out) {
  console.error('usage: node scripts/build-prototype.mjs <outDir>')
  process.exit(1)
}
if (existsSync(out)) rmSync(out, { recursive: true })
execSync(`npx vite build --base ./ --outDir "${out}" --emptyOutDir`, { stdio: 'inherit' })

// The entry script and stylesheet are the ones Vite's own index.html loads.
// (Lazy chunks such as the map library also sit in assets/, so never just pick the first .js.)
const indexHtml = readFileSync(join(out, 'index.html'), 'utf8')
const js = indexHtml.match(/<script[^>]+src="\.\/assets\/([^"]+\.js)"/)?.[1]
const css = indexHtml.match(/<link[^>]+href="\.\/assets\/([^"]+\.css)"/)?.[1]
if (!js || !css) throw new Error('could not find the entry script or stylesheet in the built index.html')
// Brand images are absolute in the source; make them relative in every chunk.
for (const f of readdirSync(join(out, 'assets')).filter((n) => n.endsWith('.js'))) {
  const p = join(out, 'assets', f)
  writeFileSync(p, readFileSync(p, 'utf8').replaceAll('"/brand/', '"./brand/'))
}

const fonts =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600&family=Spectral:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap'
writeFileSync(
  join(out, 'plinthly-prototype.html'),
  [
    '<title>Plinthly US Prototype</title>',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    `<link rel="stylesheet" href="${fonts}">`,
    `<link rel="stylesheet" href="assets/${css}">`,
    '<style>body{background:#fbfaf4;margin:0}</style>',
    '<div id="root"></div>',
    `<script type="module" src="assets/${js}"></script>`,
    '',
  ].join('\n'),
)

const files = {}
for (const dir of ['assets', 'brand']) {
  for (const f of readdirSync(join(out, dir))) {
    const p = relative(out, join(out, dir, f))
    files[p] = p
  }
}
console.log('\nPage:', join(out, 'plinthly-prototype.html'))
console.log('files:', JSON.stringify(files))

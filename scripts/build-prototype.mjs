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

const assets = readdirSync(join(out, 'assets'))
const js = assets.find((f) => f.endsWith('.js'))
const css = assets.find((f) => f.endsWith('.css'))
const jsPath = join(out, 'assets', js)
writeFileSync(jsPath, readFileSync(jsPath, 'utf8').replaceAll('"/brand/', '"./brand/'))

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

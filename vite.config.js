import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Dev-only bridge for the Vercel functions in api/.
 *
 * `vite` serves static assets and never touches api/, so in local dev the
 * advisor always fell back to the client-side mock and the serverless code was
 * effectively untestable without deploying. This mounts the handlers on the dev
 * server with a minimal Vercel-shaped req/res, so /api/advisor behaves locally
 * the way it does in production.
 *
 * DEV ONLY — it is never part of the build. Production still runs the real
 * Vercel runtime. Set ANTHROPIC_API_KEY in .env.local to exercise the live
 * model; with no key the function's own mock mode answers instead.
 */
function vercelApiDev(env) {
  return {
    name: 'plinthly-vercel-api-dev',
    apply: 'serve',
    configureServer(server) {
      // The handler reads process.env, same as on Vercel.
      for (const key of ['ANTHROPIC_API_KEY', 'ADVISOR_MODEL']) {
        if (env[key] && !process.env[key]) process.env[key] = env[key]
      }

      server.middlewares.use(async (req, res, next) => {
        const path = (req.url || '').split('?')[0]
        if (!path.startsWith('/api/')) return next()

        const name = path.slice('/api/'.length).replace(/[^a-z0-9_-]/gi, '')
        let mod
        try {
          mod = await server.ssrLoadModule(`/api/${name}.js`)
        } catch {
          return next()
        }

        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        const raw = Buffer.concat(chunks).toString('utf8')
        try {
          req.body = raw ? JSON.parse(raw) : {}
        } catch {
          req.body = raw
        }

        res.status = (code) => { res.statusCode = code; return res }
        res.json = (payload) => {
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(payload))
          return res
        }

        try {
          await mod.default(req, res)
        } catch (err) {
          server.config.logger.error(`[api/${name}] ${err?.stack || err}`)
          if (!res.writableEnded) res.status(500).json({ error: 'dev_handler_threw' })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return { plugins: [react(), tailwindcss(), vercelApiDev(env)] }
})

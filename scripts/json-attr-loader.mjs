// ESM loader hook: lets Vite-style bare `.json` imports run under plain Node by
// injecting the required `type: json` import attribute. Used only by the
// conformance test runner; the app itself is bundled by Vite.
export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    return nextLoad(url, {
      ...context,
      importAttributes: { ...(context.importAttributes || {}), type: 'json' },
    })
  }
  return nextLoad(url, context)
}

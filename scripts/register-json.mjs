// Registers the JSON-attribute loader so `node --import ./scripts/register-json.mjs`
// can execute modules that use bare `.json` imports (the conformance runner).
import { register } from 'node:module'
register('./json-attr-loader.mjs', import.meta.url)

/**
 * The advisor's agent loop, shared by the floating bubble (AdvisorFab) and the
 * comment layer (CommentLayer). Pure async, no React.
 *
 * One turn: POST the history to /api/advisor; while the model answers with a
 * tool_use block, run the tool HERE against src/lib/ (the engine never leaves
 * the browser), post the result back, and continue, up to a hard cap.
 *
 * When no server answers (local vite without the API bridge, or the claude.ai
 * prototype) the same preview mock the server uses runs in the browser, so the
 * loop still works on the real engine and nothing leaves the device.
 *
 * A real API that refuses (rate limit, daily cap, upstream error) is reported
 * as an error: a made-up answer would hide it.
 */
import { runAdvisorTool } from './advisorTools'
import { mockAgentTurn } from './advisorMock'

export const MAX_TOOL_ROUNDTRIPS = 3

async function post({ context, history, mode, surface }) {
  const mock = () => ({ mock: true, ...mockAgentTurn(context, history, mode, surface) })
  let res
  try {
    res = await fetch('/api/advisor', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ context, messages: history, mode, surface }),
    })
  } catch {
    return mock()
  }
  const ct = res.headers.get('content-type') || ''
  if (res.status === 404 || !ct.includes('application/json')) return mock()
  if (!res.ok) return { error: true }
  return res.json()
}

/**
 * Run one advisor turn.
 * @param {object} o
 * @param {object} o.context     Non-PII computed context (+ optional `anchor`).
 * @param {Array}  o.messages    Chat history INCLUDING the new user message.
 * @param {string} [o.mode]      'plan' for the roadmap generator.
 * @param {'phase1'|'compare'} [o.surface]
 * @param {object} [o.values]    Form values the tools recompute from.
 * @param {object} [o.compare]   Compare state for the compare tool.
 * @param {(content: object) => object} [o.labelResult]  Attach readable labels to a tool result.
 * @param {(scenario: object) => void}   [o.onScenario]  A what-if preview came back.
 * @param {(e: {name: string, ok: boolean}) => void} [o.onToolRun]
 * @returns {Promise<{reply: string|null, mock: boolean, error: boolean}>}
 */
export async function runAdvisorTurn({ context, messages, mode, surface = 'phase1', values, compare, labelResult = (c) => c, onScenario, onToolRun }) {
  const market = context && context.market === 'us' ? 'us' : 'ch'
  let history = messages
  let data = await post({ context, history, mode, surface })
  let isMock = !!data.mock
  if (data.error) return { reply: null, mock: false, error: true }

  for (let hop = 0; data.stop === 'tool_use' && hop < MAX_TOOL_ROUNDTRIPS; hop++) {
    const results = []
    for (const call of data.toolUse || []) {
      const outcome = runAdvisorTool(call.name, call.input, { values: values || {}, compare, market })
      if (onToolRun) onToolRun({ name: call.name, ok: outcome.ok })
      if (outcome.ok && outcome.scenario && onScenario) onScenario(outcome.scenario)
      results.push({
        type: 'tool_result',
        tool_use_id: call.id,
        content: JSON.stringify(labelResult(outcome.content)),
        ...(outcome.ok ? {} : { is_error: true }),
      })
    }
    history = [...history, { role: 'assistant', content: data.assistant }, { role: 'user', content: results }]
    data = await post({ context, history, mode, surface })
    isMock = isMock || !!data.mock
    if (data.error) return { reply: null, mock: isMock, error: true }
  }
  return { reply: data.reply || null, mock: isMock, error: false }
}

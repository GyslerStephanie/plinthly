import { createContext, useContext, useMemo, useState } from 'react'
import { decodeState } from '../lib/share'
import {
  getMarket,
  isMarketId,
  marketIdForCountry,
  resolveInitialMarketId,
  MARKET_STORAGE_KEY,
} from './index'
import { browserSignals, detectCountry } from './detect'

const MarketContext = createContext(null)

function initialMarketId() {
  try {
    const s = decodeState()
    const { market: hashMarket, ...rest } = s
    let stored = null
    try {
      stored = localStorage.getItem(MARKET_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    return resolveInitialMarketId({
      hashMarket,
      hashHasState: Object.keys(rest).length > 0,
      stored,
    })
  } catch {
    return resolveInitialMarketId()
  }
}

export function MarketProvider({ children }) {
  const [marketId, setMarketIdState] = useState(initialMarketId)

  // Browser guess for the onboarding confirm step. Read once; never applied
  // here. `detectedMarketId` is null when the guessed country isn't supported.
  const [detected] = useState(() => {
    const country = detectCountry(browserSignals())
    return { country, marketId: marketIdForCountry(country) }
  })

  const setMarket = (id) => {
    if (!isMarketId(id)) return
    setMarketIdState(id)
    try {
      localStorage.setItem(MARKET_STORAGE_KEY, id)
    } catch {
      /* ignore */
    }
  }

  const value = useMemo(
    () => ({
      market: getMarket(marketId),
      marketId,
      setMarket,
      detectedCountry: detected.country,
      detectedMarketId: detected.marketId,
    }),
    [marketId, detected],
  )

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}

export function useMarket() {
  const ctx = useContext(MarketContext)
  if (!ctx) throw new Error('useMarket must be used within MarketProvider')
  return ctx
}

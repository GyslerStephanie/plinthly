import { useI18n } from '../i18n/I18nContext'

/**
 * Tabs under the page heading: the journey, Compare, and (US) How to build.
 * They replace the tool chips that sat beside the journey steps. Each tab
 * navigates (Compare and the build explorer are overlays), so this is a nav
 * with aria-current rather than an ARIA tablist.
 *
 * @param {boolean} journeyActive  True when no tool is open.
 * @param {() => void} onJourney   Close any tool and return to the journey.
 * @param {Array<{id: string, label: string, active?: boolean, onSelect: () => void}>} tools
 */
export default function ToolTabs({ journeyActive, onJourney, tools = [], className = '' }) {
  const { t } = useI18n()
  const tabs = [{ id: 'journey', label: t('nav.journey'), active: journeyActive, onSelect: onJourney }, ...tools]
  return (
    <nav aria-label={t('nav.tools')} className={'border-b border-line ' + className}>
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <button
              type="button"
              onClick={tab.onSelect}
              aria-current={tab.active ? 'page' : undefined}
              className={
                'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition ' +
                (tab.active
                  ? 'border-teal-700 font-semibold text-ink'
                  : 'border-transparent font-medium text-muted hover:border-line-strong hover:text-ink')
              }
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

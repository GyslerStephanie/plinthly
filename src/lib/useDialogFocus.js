import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Focus management for the full-screen overlays (Landing, Onboarding, Compare).
 *
 * All three render as `fixed inset-0 z-50` *on top of* the phase content rather
 * than replacing it, so without a trap a keyboard user tabs straight off the
 * overlay into the form fields behind it — which are invisible but still
 * focusable. That is the bug this fixes.
 *
 * Provides:
 *   - focus moved to the overlay container on mount (so screen readers announce
 *     it via aria-labelledby rather than leaving the cursor behind the overlay)
 *   - Tab / Shift+Tab cycling within the overlay
 *   - focus restored to whatever was focused before, on unmount
 *   - optional Escape-to-close
 *
 * `onClose` is held in a ref so that passing an inline arrow from the parent
 * does not re-run the effect on every render and yank focus back to the top.
 *
 * @param {{ onClose?: () => void }} [opts]
 * @returns {import('react').RefObject<HTMLElement>} ref for the overlay root
 */
export function useDialogFocus({ onClose } = {}) {
  const ref = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const previouslyFocused = document.activeElement

    // Focus the container itself rather than the first control: with
    // aria-labelledby this announces the overlay's purpose, and it avoids
    // jumping the user straight onto a "skip" button.
    if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1')
    node.focus({ preventScroll: true })

    const visibleFocusables = () =>
      Array.from(node.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
      )

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && onCloseRef.current) {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return

      const items = visibleFocusables()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      const outside = !node.contains(active) || active === node

      if (e.shiftKey && (active === first || outside)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault()
        first.focus()
      }
    }

    node.addEventListener('keydown', onKeyDown)
    return () => {
      node.removeEventListener('keydown', onKeyDown)
      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true })
      }
    }
  }, [])

  return ref
}

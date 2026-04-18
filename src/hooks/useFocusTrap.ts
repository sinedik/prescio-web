'use client'
import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Ловушка фокуса для модалок:
 *  - при mount фокусирует первый focusable внутри контейнера
 *  - Tab/Shift+Tab циклит фокус внутри
 *  - Escape вызывает onClose
 *  - при unmount возвращает фокус на предыдущий элемент
 */
export function useFocusTrap<T extends HTMLElement>(onClose?: () => void) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusables = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null)

    const first = focusables()[0]
    if (first) first.focus()
    else node.setAttribute('tabindex', '-1'), node.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && onClose) {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const els = focusables()
      if (!els.length) { e.preventDefault(); return }
      const firstEl = els[0]
      const lastEl = els[els.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && active === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    node.addEventListener('keydown', onKey)
    return () => {
      node.removeEventListener('keydown', onKey)
      if (previouslyFocused && document.body.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [onClose])

  return ref
}

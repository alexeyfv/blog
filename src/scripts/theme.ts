export type Theme = 'light' | 'dark'

export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem('theme')
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function getPreferredTheme(): Theme {
  const stored = getStoredTheme()
  if (stored) return stored

  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

export function applyTheme(theme: Theme): void {
  const html = document.documentElement
  const isDark = theme === 'dark'

  html.classList.toggle('dark', isDark)
  html.classList.toggle('light', !isDark)
}

export function setTheme(theme: Theme): void {
  applyTheme(theme)
  try {
    localStorage.setItem('theme', theme)
  } catch {
    // ignore
  }

  document.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }))
}

export function getCurrentTheme(): Theme {
  // Check document classes first to reflect current state
  // If none, fall back to preferred theme.
  return document.documentElement.classList.contains('dark')
    ? 'dark'
    : document.documentElement.classList.contains('light')
      ? 'light'
      : getPreferredTheme()
}

export function toggleTheme(): Theme {
  const next: Theme = getCurrentTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

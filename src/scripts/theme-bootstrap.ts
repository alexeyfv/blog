import { applyTheme, getPreferredTheme } from './theme'

// Runs as early as possible (loaded from <head>) to reduce theme flash.
applyTheme(getPreferredTheme())

document.addEventListener('astro:after-swap', () => {
  applyTheme(getPreferredTheme())
})

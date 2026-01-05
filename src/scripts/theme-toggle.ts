import { onPageLoad } from './onPageLoad'
import { toggleTheme } from './theme'

export function initThemeToggle(): void {
  onPageLoad(() => {
    const button = document.getElementById('themeToggle')
    if (!button) return
    if ((button as HTMLElement).dataset.bound === 'true') return
    ;(button as HTMLElement).dataset.bound = 'true'
    button.addEventListener('click', () => {
      toggleTheme()
    })
  })
}

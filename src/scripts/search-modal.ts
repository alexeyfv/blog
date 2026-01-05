import { onPageLoad } from './onPageLoad'

export function initSearchModal(): void {
  onPageLoad(() => {
    const dialog = document.getElementById('SearchPage') as HTMLElement | null
    const content = document.getElementById(
      'SearchPageContent',
    ) as HTMLElement | null
    const openButton = document.getElementById(
      'openSearchPage',
    ) as HTMLElement | null
    const closeButton = document.getElementById(
      'closeSearchPage',
    ) as HTMLElement | null

    if (!dialog || !content || !openButton || !closeButton) return
    if (openButton.dataset.bound === 'true') return

    const openModal = () => {
      dialog.style.display = 'flex'
      requestAnimationFrame(() => {
        dialog.style.opacity = '1'
        content.classList.add('transition-transform', 'show')
      })
    }

    const closeModal = () => {
      dialog.style.opacity = '0'
      window.setTimeout(() => {
        dialog.style.display = 'none'
        content.classList.remove('transition-transform', 'show')
      }, 300)
    }

    openButton.dataset.bound = 'true'
    closeButton.addEventListener('click', closeModal)
    openButton.addEventListener('click', openModal)
  })
}

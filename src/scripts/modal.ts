import { onPageLoad } from './onPageLoad'

export function initModal(): void {
  onPageLoad(() => {
    const modal = document.getElementById('modal') as HTMLElement | null
    const modalContent = document.getElementById(
      'modalContent',
    ) as HTMLElement | null
    const openModalButton = document.getElementById(
      'openModalButton',
    ) as HTMLElement | null
    const closeModalButton = document.getElementById(
      'closeModalButton',
    ) as HTMLElement | null

    if (!modal || !modalContent || !openModalButton || !closeModalButton) return
    if (openModalButton.dataset.bound === 'true') return

    const openModal = () => {
      modal.style.display = 'flex'
      requestAnimationFrame(() => {
        modal.style.opacity = '1'
        modalContent.classList.add('transition-transform', 'show')
      })
    }

    const closeModal = () => {
      modal.style.opacity = '0'
      window.setTimeout(() => {
        modal.style.display = 'none'
        modalContent.classList.remove('transition-transform', 'show')
      }, 300)
    }

    openModalButton.dataset.bound = 'true'
    closeModalButton.addEventListener('click', closeModal)
    openModalButton.addEventListener('click', openModal)
  })
}

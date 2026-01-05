import { onPageLoad } from './onPageLoad'

export function initCodeCopy(): void {
  onPageLoad(() => {
    const blocks = document.querySelectorAll<HTMLElement>('pre[data-codeblock]')
    if (!blocks.length) return

    for (const block of blocks) {
      const button =
        block.querySelector<HTMLButtonElement>('[data-copy-button]')
      const check = block.querySelector<HTMLElement>('[data-copy-check]')
      if (!button || !check) continue
      if (button.dataset.bound === 'true') continue

      button.dataset.bound = 'true'
      button.addEventListener('click', async () => {
        try {
          const text = block.textContent?.trim() ?? ''
          await navigator.clipboard.writeText(text)
        } catch {
          // ignore
        }

        check.classList.remove('opacity-0')
        button.classList.add('opacity-0')
        window.setTimeout(() => {
          check.classList.add('opacity-0')
          button.classList.remove('opacity-0')
        }, 1500)
      })
    }
  })
}

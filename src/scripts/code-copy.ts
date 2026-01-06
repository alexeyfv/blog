import { onPageLoad } from './onPageLoad'

export function initCodeCopy(): void {
  onPageLoad(() => {
    const blocks = document.querySelectorAll<HTMLElement>('pre[data-codeblock]')
    if (!blocks.length) return

    const track = (event: string, data?: Record<string, unknown>) => {
      const umami = (window as any)?.umami
      if (typeof umami?.track !== 'function') return
      try {
        umami.track(event, data)
      } catch {
        // ignore
      }
    }

    for (const block of blocks) {
      const button =
        block.querySelector<HTMLButtonElement>('[data-copy-button]')
      const check = block.querySelector<HTMLElement>('[data-copy-check]')
      if (!button || !check) continue
      if (button.dataset.bound === 'true') continue

      button.dataset.bound = 'true'
      button.addEventListener('click', async () => {
        const text = block.textContent?.trim() ?? ''
        try {
          await navigator.clipboard.writeText(text)
        } catch {
          // ignore
        }

        track('code_copy', {
          lang: document.documentElement.lang || undefined,
          path: window.location.pathname,
          code_length: text.length,
        })

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

export type PageLoadCallback = () => void

export function onPageLoad(callback: PageLoadCallback): void {
  const run = () => {
    try {
      callback()
    } catch {
      // swallow to avoid breaking navigation on non-critical UI scripts
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true })
  } else {
    run()
  }

  document.addEventListener('astro:after-swap', run)
}

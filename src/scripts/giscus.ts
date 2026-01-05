import { onPageLoad } from './onPageLoad'
import { getCurrentTheme } from './theme'

const GISCUS_ORIGIN = 'https://giscus.app'

type GiscusTheme = 'light' | 'dark'

function postGiscusTheme(theme: GiscusTheme): void {
  const frame = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame')
  if (!frame) return

  frame.contentWindow?.postMessage(
    {
      giscus: {
        setConfig: {
          theme,
        },
      },
    },
    GISCUS_ORIGIN,
  )
}

function ensureGiscusMounted(container: HTMLElement, theme: GiscusTheme): void {
  // Avoid re-injecting on subsequent navigations.
  if (container.dataset.giscusMounted === 'true') return

  const script = document.createElement('script')
  script.src = `${GISCUS_ORIGIN}/client.js`
  script.async = true
  script.crossOrigin = 'anonymous'

  // Required config
  script.setAttribute('data-repo', container.dataset.repo ?? '')
  script.setAttribute('data-repo-id', container.dataset.repoId ?? '')
  script.setAttribute('data-category', container.dataset.category ?? '')
  script.setAttribute('data-category-id', container.dataset.categoryId ?? '')
  script.setAttribute('data-mapping', container.dataset.mapping ?? 'og:title')

  // Optional config
  script.setAttribute('data-strict', container.dataset.strict ?? '0')
  script.setAttribute(
    'data-reactions-enabled',
    container.dataset.reactionsEnabled ?? '1',
  )
  script.setAttribute(
    'data-emit-metadata',
    container.dataset.emitMetadata ?? '0',
  )
  script.setAttribute(
    'data-input-position',
    container.dataset.inputPosition ?? 'top',
  )
  script.setAttribute('data-theme', theme)
  script.setAttribute('data-lang', document.documentElement.lang)
  script.setAttribute('data-loading', container.dataset.loading ?? 'lazy')

  container.innerHTML = ''
  container.appendChild(script)
  container.dataset.giscusMounted = 'true'
}

let themeListenerBound = false

export function initGiscus(): void {
  onPageLoad(() => {
    const container = document.getElementById('giscusContainer')
    if (!container) return

    ensureGiscusMounted(container, getCurrentTheme())

    // Keep in sync on theme changes
    if (!themeListenerBound) {
      themeListenerBound = true
      document.addEventListener('theme-change', () => {
        postGiscusTheme(getCurrentTheme())
      })
    }
  })
}

let t

const schedule = () => {
  if (t) clearTimeout(t)
  t = setTimeout(() => {
    if (document.visibilityState !== 'visible') return
    window.umami?.track?.('engaged')
  }, 5000)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', schedule, { once: true })
} else {
  schedule()
}

document.addEventListener('astro:after-swap', schedule)

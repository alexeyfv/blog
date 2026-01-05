setTimeout(() => {
  if (document.visibilityState === 'visible') {
    window.umami?.track?.('engaged')
  }
}, 5000)

document.addEventListener('astro:after-swap', () => {
  setTimeout(() => {
    if (document.visibilityState === 'visible') {
      window.umami?.track?.('engaged')
    }
  }, 5000)
})

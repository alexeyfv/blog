;(() => {
  let t,
    i,
    s = () => {
      clearTimeout(t)
      clearInterval(i)
      t = setTimeout(() => {
        window.umami?.track?.('ping')
        i = setInterval(
          () =>
            document.visibilityState == 'visible' &&
            window.umami?.track?.('ping'),
          5000,
        )
      }, 5000)
    }
  document.readyState == 'loading'
    ? addEventListener('DOMContentLoaded', s, { once: 1 })
    : s()
  document.addEventListener('astro:after-swap', s)
})()

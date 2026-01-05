const scheduleEngagedPing = () => {
  setTimeout(() => {
    if (document.visibilityState !== 'visible') return
    ;(window as any).umami?.track?.({ name: 'engaged' })
  }, 5000)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleEngagedPing, {
    once: true,
  })
} else {
  scheduleEngagedPing()
}

// Astro client-side navigation (View Transitions) hook.
document.addEventListener('astro:after-swap', scheduleEngagedPing)

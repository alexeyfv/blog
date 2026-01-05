import { onPageLoad } from './onPageLoad'

export function initBlogPostTocObserver(): void {
  onPageLoad(() => {
    // Only run on pages that actually have prose headings.
    const headings = document.querySelectorAll<HTMLElement>(
      'section.prose h1, section.prose h2, section.prose h3, section.prose h4, section.prose h5, section.prose h6',
    )

    if (!headings.length) return

    const handleIntersection: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        const link = document.querySelector<HTMLElement>(
          `aside a[href="#${(entry.target as HTMLElement).id}"]`,
        )

        if (!link) continue

        if (entry.isIntersecting) {
          link.classList.remove('bg-slate-200', 'dark:bg-slate-800')
          link.classList.add(
            'bg-indigo-600',
            'dark:bg-indigo-700',
            'text-white',
            'font-bold',
            'transition-colors',
            'duration-200',
          )
        } else {
          link.classList.add('bg-slate-200', 'dark:bg-slate-800')
          link.classList.remove(
            'bg-indigo-600',
            'dark:bg-indigo-700',
            'text-white',
            'font-bold',
            'transition-colors',
            'duration-200',
          )
        }
      }
    }

    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '15% 0px 0% 0px',
      threshold: 1,
    })

    headings.forEach((heading) => observer.observe(heading))
  })
}

import { onPageLoad } from './onPageLoad'

export function initAnimationsPref(): void {
  onPageLoad(() => {
    if (!('animations' in localStorage)) {
      localStorage.setItem('animations', 'true')
    } else {
      // Preserve current behavior (sets false once the key exists)
      localStorage.setItem('animations', 'false')
    }
  })
}

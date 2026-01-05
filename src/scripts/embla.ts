import { onPageLoad } from './onPageLoad'
import { initEmblaCarousel as initEmbla } from '../components/CarouselPerView/ts/index'

export function initEmblaCarousel(): void {
  onPageLoad(() => {
    initEmbla()
  })
}

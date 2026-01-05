import EmblaCarousel from 'embla-carousel'
import type { EmblaOptionsType } from 'embla-carousel'
import { addPrevNextBtnsClickHandlers } from './EmblaCarouselArrowButtons'
import '../style/embla.css'

const OPTIONS: EmblaOptionsType = { align: 'start' }

export function initEmblaCarousel(): void {
  const emblaNodes = document.querySelectorAll<HTMLElement>('.embla')
  if (!emblaNodes.length) return

  for (const emblaNode of emblaNodes) {
    if (emblaNode.dataset.emblaBound === 'true') continue

    const viewportNode =
      emblaNode.querySelector<HTMLElement>('.embla__viewport')
    const prevBtnNode = emblaNode.querySelector<HTMLElement>(
      '.embla__button--prev',
    )
    const nextBtnNode = emblaNode.querySelector<HTMLElement>(
      '.embla__button--next',
    )

    if (!viewportNode || !prevBtnNode || !nextBtnNode) continue

    const emblaApi = EmblaCarousel(viewportNode, OPTIONS)

    const removePrevNextBtnsClickHandlers = addPrevNextBtnsClickHandlers(
      emblaApi,
      prevBtnNode,
      nextBtnNode,
    )

    emblaNode.dataset.emblaBound = 'true'
    emblaApi.on('destroy', removePrevNextBtnsClickHandlers)
  }
}

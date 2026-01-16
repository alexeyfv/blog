export type BreadcrumbItem = {
  name: string
  url: string
}

type BreadcrumbLabels = {
  home: string
  tags: string
}

type BuildBreadcrumbsOptions = {
  site: URL | string
  pathname: string
  lang: string
  pageTitle: string
  currentLabel?: string
  labels: BreadcrumbLabels
}

const toBaseUrl = (site: URL | string) => {
  if (site instanceof URL) {
    return site
  }

  const hasScheme = site.includes('://')
  return new URL(hasScheme ? site : `https://${site}`)
}

const normalizePathname = (pathname: string) => {
  if (!pathname) {
    return '/'
  }

  const normalized = pathname.replace(/\/+$/g, '')
  return normalized === '' ? '/' : normalized
}

export const buildBreadcrumbs = ({
  site,
  pathname,
  lang,
  pageTitle,
  currentLabel,
  labels,
}: BuildBreadcrumbsOptions): BreadcrumbItem[] => {
  const baseUrl = toBaseUrl(site)
  const normalizedPathname = normalizePathname(pathname)
  const segments = normalizedPathname.split('/').filter(Boolean)
  const items: BreadcrumbItem[] = []
  const homePath = `/${lang}`

  items.push({
    name: labels.home,
    url: new URL(homePath, baseUrl).href,
  })

  if (segments.length === 1) {
    return items
  }

  if (segments[0] !== lang) {
    const fallbackLabel = currentLabel ?? pageTitle
    items.push({
      name: fallbackLabel,
      url: new URL(normalizedPathname, baseUrl).href,
    })
    return items
  }

  const section = segments[1]

  if (section === 'tags') {
    const tagsUrl = new URL(`/${lang}/tags`, baseUrl).href
    items.push({
      name: labels.tags,
      url: tagsUrl,
    })

    if (segments.length > 2) {
      const tagSlug = segments.slice(2).join('/')
      const tagLabel = currentLabel ?? pageTitle
      items.push({
        name: tagLabel,
        url: new URL(`/${lang}/tags/${tagSlug}`, baseUrl).href,
      })
    }

    return items
  }

  if (section === 'post') {
    const postSlug = segments.slice(2).join('/')
    const postLabel = currentLabel ?? pageTitle

    items.push({
      name: postLabel,
      url: new URL(`/${lang}/post/${postSlug}`, baseUrl).href,
    })

    return items
  }

  const staticLabel = currentLabel ?? pageTitle
  items.push({
    name: staticLabel,
    url: new URL(normalizedPathname, baseUrl).href,
  })

  return items
}

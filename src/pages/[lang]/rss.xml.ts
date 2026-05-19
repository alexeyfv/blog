import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import { siteConfig } from '@/site-config'
import type { APIRoute } from 'astro'
import { Lang, ui } from '@/i18n/utils'

export async function getStaticPaths() {
  return Object.keys(ui).map((lang) => ({
    params: { lang: lang as Lang },
  }))
}

export const GET: APIRoute = async ({ params, site }) => {
  const lang = params.lang as Lang
  const posts = await getCollection(lang)

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: site ?? new URL('https://alexeyfv.xyz'),
    items: posts.map((post) => ({
      ...post.data,
      link: `${lang}/post/${post.id}/`,
    })),
  })
}

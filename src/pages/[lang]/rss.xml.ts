import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import { siteConfig } from '@/site-config'
import { Lang, ui } from '@/i18n/ui'

export async function getStaticPaths() {
  return Object.keys(ui).map((lang) => ({
    params: { lang: lang as Lang },
  }))
}

export const GET = async ({ lang, site }) => {
  const posts = await getCollection(lang as Lang)

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: site,
    items: posts.map((post) => ({
      ...post.data,
      link: `${lang}/post/${post.slug}/`,
    })),
  })
}

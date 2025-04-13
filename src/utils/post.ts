import { Lang } from '@/i18n/ui'
import { getCollection } from 'astro:content'
import { slugifyTag } from './slugify'

export const getPosts = async (lang: Lang, max?: number) => {
  const posts = await getCollection(lang)
  return posts
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .slice(0, max)
}

export const getTags = async (lang: Lang) => {
  const posts = await getCollection(lang)

  const tagCounts: Record<string, number> = {}

  posts.forEach((post) => {
    if (post.data.lang === lang) {
      post.data.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    }
  })

  return Object.entries(tagCounts)
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([tag]) => tag)
}

export const getPostByTag = async (lang: Lang, tag: string) => {
  const posts = await getPosts(lang)
  const filtered = posts.filter((p) =>
    p.data.tags.some((t) => slugifyTag(t) === slugifyTag(tag)),
  )
  return filtered
}

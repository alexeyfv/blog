import { Lang } from '@/i18n/ui'
import { getCollection } from 'astro:content'

export const getPosts = async (max?: number) => {
  const posts = await getCollection('blog')
  return posts
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .slice(0, max)
}

export const getTags = async (lang: string) => {
  const posts = await getCollection('blog')
  
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

export const getPostByTag = async (tag: string) => {
  const posts = await getPosts()
  const lowercaseTag = tag.toLowerCase()

  return posts.filter((post) =>
    post.data.tags.some((postTag) => postTag.toLowerCase() === lowercaseTag),
  )
}

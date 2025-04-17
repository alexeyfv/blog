import { Lang, ui } from '@/i18n/utils'
import { getPosts } from '@/utils'
import type { APIRoute } from 'astro'
import { generateCover } from 'src/utils/cover'

export async function getStaticPaths() {
  const result: any[] = []

  for (const lang of Object.keys(ui)) {
    const posts = await getPosts(lang as Lang)

    for (const post of posts) {
      result.push({
        params: { lang, slug: post.slug },
        props: post,
      })
    }
  }

  return result
}

export const GET: APIRoute = async ({ props }) => {
  // If the post has a cover image,
  // return 404 instead of generating a cover
  if (props.data.cover) {
    return new Response(null, {
      status: 404,
      statusText: 'Not found',
    })
  }

  const title = props.data.title
  const cover = await generateCover(title)

  return new Response(cover, {
    headers: { 'Content-Type': 'image/png' },
  })
}

import { getPosts } from '@/utils'
import type { APIRoute } from 'astro'
import { generateCover } from 'src/utils/cover'

export async function getStaticPaths() {
  const posts = await getPosts('ru')

  return posts.map((post) => ({
    params: { slug: post.slug },
    props: post,
  }))
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

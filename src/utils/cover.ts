import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import fs from 'fs'
import path from 'path'
import { Lang } from '@/i18n/utils'

const defaultRatio = {
  width: 1536,
  height: 1024,
}

export function getCover(lang: Lang, props): ImageMetadata {
  const cover = props.data.cover

  // If the cover is provided, use it
  if (cover) {
    return cover
  }

  // id = lang\path-to-post\index.mdx
  const id = props.id as string
  const slashIndex = id.lastIndexOf('/')
  const slug = id.substring(0, slashIndex)

  // Otherwise, use the generated image
  const generated: ImageMetadata = {
    src: `${lang}/post/${slug}/cover.png`,
    width: defaultRatio.width,
    height: defaultRatio.height,
    format: 'png',
  }

  return generated
}

export async function generateCover(title: string) {
  const fontFamily = 'Ubuntu+Mono'
  const fontWeight = 400
  const fontStyle = 'normal'

  const data = await getGoogleFont(fontFamily, fontWeight)

  const element = createOgImage(title)

  const svg = await satori(element, {
    width: defaultRatio.width,
    height: defaultRatio.height,
    embedFont: true,
    fonts: [
      {
        name: fontFamily,
        style: fontStyle,
        weight: fontWeight,
        data: data,
      },
    ],
  })

  const resvg = new Resvg(svg)

  const pngData = resvg.render()

  return pngData.asPng()
}

function createOgImage(title: string): any {
  const imagePath = path.resolve('./src/assets/images/background.png')
  const imageBuffer = fs.readFileSync(imagePath)
  const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`

  return {
    type: 'img',
    props: {
      src: base64Image,
      style: {
        width: defaultRatio.width,
        height: defaultRatio.height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#fff',
        textAlign: 'center',
        position: 'relative',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderRadius: '16px',
              padding: '40px 60px',
              maxWidth: '1300px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '80px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 64,
                  },
                  children: title,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 40,
                  },
                  children: 'alexeyfv.xyz',
                },
              },
            ],
          },
        },
      ],
    },
  }
}

async function getGoogleFont(
  font: string,
  weight: number,
): Promise<ArrayBuffer> {
  const API = `https://fonts.googleapis.com/css2?family=${font}:wght@${weight}`
  const response = await fetch(API)
  const text = await response.text()

  const resource = text.match(
    /src: url\((.+?)\) format\('(opentype|truetype)'\)/,
  )

  if (!resource) {
    throw new Error('Failed to download dynamic font')
  }

  const res = await fetch(resource[1])

  if (!res.ok) {
    throw new Error('Failed to download dynamic font. Status: ' + res.status)
  }

  return res.arrayBuffer()
}

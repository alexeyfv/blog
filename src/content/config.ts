import { Lang } from '@/i18n/ui'
import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

const en = defineCollection({ loader: loader('en'), schema: schema })
const ru = defineCollection({ loader: loader('ru'), schema: schema })

function loader(lang: Lang) {
  return glob({ pattern: '**/*.mdx', base: `./src/content/${lang}` })
}

function schema({ image }) {
  return z.object({
    // 60 characters
    // With Google's Title update, shorter titles are preferred.
    // If the title is too long, they are more likely to be rewritten.
    // Use these rules of thumb when it comes to the title tag
    // length: Maximum length: 60 characters or 575 pixels.2
    title: z.string().max(60),
    description: z.string(),
    // Transform string to Date object
    pubDate: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val)),
    // cover is optional
    // if not provided, it will be generated
    cover: z.optional(image()),
    // Tags are mandatory
    tags: z.array(z.string()),
    // Language is mandatory
    lang: z.string(),
  })
}

export const collections = { en, ru }

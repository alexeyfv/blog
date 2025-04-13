// @ts-check
import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import pagefind from 'astro-pagefind'
import { remarkReadingTime } from './src/utils/readTime'

// https://astro.build/config
export default defineConfig({
  site: 'https://alexeyfv.xyz',
  trailingSlash: 'ignore',

  devToolbar: {
    enabled: false,
  },

  experimental: {
    contentLayer: true,
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru'],
  },

  markdown: {
    remarkPlugins: [remarkReadingTime],
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },

  integrations: [
    mdx(),
    tailwind(),
    pagefind(),

    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          ru: 'ru',
        },
      },
    }),
  ],
})

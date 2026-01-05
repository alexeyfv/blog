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

  vite: {
    build: {
      assetsInlineLimit: 0
    }
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

  redirects: {
    // Redirect index to default lang
    '/': 'en',
    // Posts from old Jekyll blog
    '/2022/01/31/insidious-enum-in-dotnet.html': {
      destination: '/ru/post/2022-01-27-insidious-enum-in-dotnet',
      status: 308,
    },
    '/2022/05/01/fsharp-01.html': {
      destination: '/ru/post/2022-05-01-fsharp-01',
      status: 308,
    },
    '/2022/05/08/fsharp-02.html': {
      destination: '/ru/post/2022-05-08-fsharp-02',
      status: 308,
    },
    '/2022/07/14/how-to-create-blog.html': {
      destination: '/ru/post/2022-07-14-how-to-create-blog',
      status: 308,
    },
    '/2023/01/31/react-html-annotations.html': {
      destination: '/en/post/2023-01-31-react-html-annotations',
      status: 308,
    },
    '/2023/02/25/ef-inheritance.html': {
      destination: '/en/post/2023-02-25-ef-inheritance',
      status: 308,
    },
    '/2023/06/05/understanding-ddd-01.html': {
      destination: '/en/post/2023-06-05-understanding-ddd-01',
      status: 308,
    },
    '/2023/07/30/secure-app-with-keycloak.html': {
      destination: '/en/post/2023-07-08-secure-app-with-keycloak',
      status: 308,
    },
    '/2023/08/10/top-level-statements.html': {
      destination: '/en/post/2023-08-10-top-level-statements',
      status: 308,
    },
    '/2023/10/18/method-as-a-parameter.html': {
      destination: '/en/post/2023-10-18-method-as-a-parameter',
      status: 308,
    },
    '/2023/10/28/substring.html': {
      destination: '/en/post/2023-10-28-substring',
      status: 308,
    },
    '/2023/12/02/readonlyspan-vs-string.html': {
      destination: '/en/post/2023-12-02-readonlyspan-vs-string',
      status: 308,
    },
    '/2024/01/08/whats-wrong-with-options-pattern.html': {
      destination: '/en/post/2024-01-09-whats-wrong-with-options-pattern',
      status: 308,
    },
    '/2024/01/15/class-vs-struct.html': {
      destination: '/en/post/2024-01-15-class-vs-struct',
      status: 308,
    },
    '/2024/02/12/testcontainers.html': {
      destination: '/en/post/2024-02-12-testcontainers',
      status: 308,
    },
    '/2024/04/12/collections-marshal.html': {
      destination: '/ru/post/2024-04-12-collections-marshal',
      status: 308,
    },
    '/2024/08/22/frozen-dictionary.html': {
      destination: '/ru/post/2024-08-22-frozen-dictionary',
      status: 308,
    },
    '/2024/08/29/fast-mod-algorithm.html': {
      destination: '/ru/post/2024-08-29-fast-mod-algorithm',
      status: 308,
    },
    '/2024/09/05/create-array.html': {
      destination: '/ru/post/2024-09-05-create-array',
      status: 308,
    },
    '/2024/09/07/frozen-dictionary-collisions-count.html': {
      destination: '/ru/post/2024-09-09-frozen-dictionary-collisions-count',
      status: 308,
    },
    '/2024/09/16/bad-vs-better-benchmark.html': {
      destination: '/ru/post/2024-09-16-bad-vs-better-benchmark',
      status: 308,
    },
    '/2024/09/30/how-data-affects-performance.html': {
      destination: '/ru/post/2024-09-30-how-data-affects-performance',
      status: 308,
    },
    '/2024/10/09/frozen-dictionary.html': {
      destination: '/en/post/2024-08-22-frozen-dictionary',
      status: 308,
    },
    '/2024/12/09/object-pool.html': {
      destination: '/en/post/2024-12-09-object-pool',
      status: 308,
    },
    '/2025/03/10/source-generators.html': {
      destination: '/en/post/2025-03-10-source-generators',
      status: 308,
    },
    '/2025/03/29/duck-typing.html': {
      destination: '/en/post/2025-03-29-duck-typing',
      status: 308,
    },
  },
})

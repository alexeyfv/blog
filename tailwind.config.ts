import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
import typography from '@tailwindcss/typography'

export default {
  darkMode: 'selector',
  content: ['./src/**/*.{astro,html,js,md,mdx,ts}'],

  theme: {
    extend: {
      colors: {
        grayDeep: '#1f2b3a',
        grayLight: '#f8f8f8',
      },
      fontFamily: {
        body: ['Manrope', ...defaultTheme.fontFamily.sans],
      },
      gridTemplateColumns: {
        list: 'repeat(auto-fill, minmax(400px, max-content))',
      },
    },
  },

  plugins: [typography],
} satisfies Config

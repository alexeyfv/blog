interface SiteConfig {
  author: string
  title: string
  baseUrl: string
  description: string
  lang: string
  ogLocale: string
  shareMessage: string
}

export const siteConfig: SiteConfig = {
  author: 'Alexey Fedorov',
  title: 'alexeyfv',
  baseUrl: 'alexeyfv.xyz',
  description:
    'Sharing my path in software development — thoughts, lessons, and technical insights.',
  lang: 'en',
  ogLocale: 'en',
  shareMessage: 'Share this post',
}

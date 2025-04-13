import { siteConfig } from '@/data/site.config'

export function GET() {
  const robotsTxt = `
User-agent: *
Allow: /

Sitemap: https://${siteConfig.baseUrl}/sitemap-index.xml
`.trim()

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}

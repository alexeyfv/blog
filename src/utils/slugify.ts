import slugify from 'slugify'

export const slugifyTag = (text: string) => {
  const slug = text
    .replace(/#/g, '-sharp')
    .replace(/\.NET/gi, 'dotnet')
    .replace(/ASP\.NET/gi, 'aspnet')
  return slugify(slug, { lower: true, strict: true })
}

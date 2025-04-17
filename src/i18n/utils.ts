import { en, ru } from './translations'

export type Lang = 'en' | 'ru'

export const languages = { en: 'English', ru: 'Русский' }

export const defaultLang: Lang = 'en'

export const ui = { en: en, ru: ru } as const

export const getLangFromUrl = (url: URL) => {
  const [, lang] = url.pathname.split('/')
  if (lang in ui) return lang as keyof typeof ui
  return defaultLang
}

export function getTranslation(lang: Lang) {
  if (lang === 'ru') return ru
  // default language
  return en
}

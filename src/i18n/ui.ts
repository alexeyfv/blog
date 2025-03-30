import en from './en.json'
import ru from './ru.json'

export type Lang = 'en' | 'ru'

export const languages = {
  en: 'English',
  ru: 'Русский',
}

export const defaultLang = 'en'

export const ui = {
  en: en,
  ru: ru,
} as const

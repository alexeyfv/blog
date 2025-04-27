type Translations = {
  menu: {
    home: string
    about: string
    tags: string
    navigation: string
  }
  tags: {
    title: string
  }
  blog: {
    title: string
    latestPosts: string
  }
  about: {
    title: string
    aboutMe: string
    aboutMeParagraphs: string[]
    aboutBlog: string
    aboutBlogParagraphs: string[]
  }
  published: string
  minutes: string
  share: string
  index: string
  relatedPosts: string
  noRelatedPosts: string
}

export const en: Translations = {
  menu: {
    home: 'Home',
    about: 'About',
    tags: 'Tags',
    navigation: 'Navigation',
  },
  tags: {
    title: 'Tags',
  },
  blog: {
    title: 'Blog',
    latestPosts: 'Latest Posts',
  },
  about: {
    title: 'About',
    aboutMe: '🧑‍💻 About Me',
    aboutMeParagraphs: [
      'Hi, I’m a Backend Developer who enjoys building things that actually matter.',
      'Most of my time I work with C# and .NET. It’s the first language I learned, and I still love it. I care about clean, simple code that solves real problems without overengineering.',
      'Lately, I’ve been exploring Python for Backend and Data Engineering. Sometimes I work with frontend using React and TypeScript... but only when someone pays me for it 😅',
    ],
    aboutBlog: '✍️ About This Blog',
    aboutBlogParagraphs: [
      'This blog started as a way to become a better engineer. I once heard: "If you want to understand something deeply, try explaining it to others." That’s what got me into writing.',
      'You’ll find a mix of everything here: short notes, performance experiments and benchmarks, thoughts, and deep dives into complex topics. I write mainly for myself, to document and revisit what I’ve learned. But I believe many posts are helpful to others too. If you find something useful, that’s already a win.',
      'Posts are published in both Russian and English so that as many readers as possible can access the same content.',
    ],
  },
  published: 'Published on',
  minutes: 'min read',
  share: 'Share',
  index: 'Index',
  relatedPosts: 'Related Posts',
  noRelatedPosts: 'There is no related posts yet :(',
}

export const ru: Translations = {
  menu: {
    home: 'Главная',
    about: 'О блоге',
    tags: 'Теги',
    navigation: 'Навигация',
  },
  tags: {
    title: 'Теги',
  },
  blog: {
    title: 'Блог',
    latestPosts: 'Последние публикации',
  },
  about: {
    title: 'Эбаут',
    aboutMe: '🧑‍💻 Обо мне',
    aboutMeParagraphs: [
      'Привет! Я Backend разработчик. Люблю создавать вещи, которые действительно полезны.',
      'Большую часть времени я работаю с C# и .NET. Это мой первый язык, который до сих пор мне очень нравится. Люблю простой и чистый код, решающий реальные задачи без оверинжиниринга.',
      'В последнее время изучаю Python для Backend и Data Engineering. Иногда работаю с фронтендом на React и TypeScript... но только когда за это платят 😅',
    ],
    aboutBlog: '✍️ О блоге',
    aboutBlogParagraphs: [
      'Я начал этот блог, чтобы лучше разбираться в технологиях. Кто-то сказал: «Хочешь глубоко понять тему, попробуй объяснить её другим». Так я и начал писать.',
      'Здесь всё понемногу: короткие заметки, эксперименты с производительностью и бенчмарки, размышления, разборы сложных тем. Я пишу для себя, чтобы фиксировать и переосмысливать то, что узнал. Но, думаю, многим эти материалы тоже будут полезны. Если вы нашли здесь что-то ценное, это уже победа.',
      'Посты публикуются на русском и английском, чтобы как можно больше читателей могли получить доступ к одному и тому же контенту.',
    ],
  },
  published: 'Опубликовано',
  minutes: 'мин чтения',
  share: 'Поделиться',
  index: 'Содержание',
  relatedPosts: 'Похожие публикации',
  noRelatedPosts: 'Похожих публикаций пока нет :(',
}

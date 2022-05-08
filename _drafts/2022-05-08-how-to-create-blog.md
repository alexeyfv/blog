---
layout: post
title: "Как создать свой блог на GitHub"
date: 2022-05-08
tags: blog github
---

Текст

## 0. Требования

Для того, чтобы создать блог нам понадобится следующее:

- `Ruby` - сборка и запуск блога локально
- `Jekyll` - конфигурирование блога
- `Markdown` - создание постов с разметкой
- `HTML`, `CSS`, `JavaScript` - редактирование макетов страниц, добавление скриптов
- `Git` - фиксирование изменений
- `GitHub` - хранение репозитория
- `GitHub Actions` - сборка и деплой блога
- `GitHub Pages` - хостинг блога

Большой список, но не надо его бояться. Быть экспертом во всём, что тут перечислено, не обязательно. Например `Ruby` нам понадобится только для того, чтобы запускать блог локально на своём компьютере. Теоретически, можно обойтись и без установки `Ruby` с `Jekyll`, но в таком случае, чтобы посмотреть на изменения, придётся каждый раз пушить изменения и ждать, пока блог соберётся и задеплоится. Согласитесь, это не очень удобно.

## 1. Ruby и Jekyll

### Установка Ruby

`Jekyll` - это статический генератор сайтов. Вкратце, работает он так: вы пишете посты с использованием разметки `Markdown`, а движок `Jekyll` преобразует их в статические `HTML`-страницы. Поскольку `Jekyll` написан на `Ruby`, то сперва нужно установить `Ruby`.[^1] В установке для Windows нет ничего сложного - классическое "Далее, далее, далее, установить".

### Установка Jekyll

После установки `Ruby`, нужно установить `Jekyll`. Делается это через пакетный менеджер для `Ruby`. Для установки нужно выполнить команду:

``` console
gem install jekyll bundler
```

### Создание проекта

После установки `Jekyll`, можно создать проект блога из шаблона. Для этого нужно выполнить команду:

``` console
jekyll new myblog
```

После выполнения команды, должна появится папка проекта блога с названием `myblog`:

<img src="{{site.baseurl}}/assets/2022/../../../../../../assets/2022/05/2022-05-08-how-to-create-blog/Screenshot_1.png" alt="first-response">

### Структура проекта

Посмотрим подробнее на созданные файлы.

#### _config.yml

Конфигурация `Jekyll`. Параметры, которые задаются в этом файле, влияют на весь блог. Информация на сайте `Jekyll` [^2] скудная, поэтому в качестве примера разберу конфигурацию моего блога: [^3]

``` yml  
# Задаёт название сайта, которое отображается в заголовке страницы браузера.
title: alexeyfv.blog
# Задаёт описание сайта, которое отображается в заголовке страницы браузера.
description: Articles about .NET, C# and much more
# Директория из которой будет загружаться блог. Можно оставить поле пустым.  
baseurl: ""
# Полный URL сайта
url: "http://www.alexeyfv.blog/"

# Тема блога.
theme: minima

# Думаю, тут всё понятно.
author:
  name: © 2022 Alexey Fedorov

# Параметры темы. Можно задать тёмный скин и добавить ссылки на свои социальные сети,
# которые будут отображаться в футере блога.
minima:
  skin: dark
  social_links:
    github: alexeyfv
    linkedin: alexeyfv
    telegram: alexeyfv  

# Страницы, которые будут отображаться в хедере блога.
header_pages:
  - _pages/tags.html
  - _pages/projects.md
#   - _pages/setup.md
  - _pages/about.

# Задаёт дополнительную папку, из которой будут загружаться страницы. 
# По-умолчанию, страницы грузятся только из корневой папки.
include: ['_pages']

# Включает отображение первого абзаца поста на главной странице.
show_excerpts: true
```

#### Gemfile и Gemfile.lock

Конфигурационные файлы для `Ruby`. В этих файлах указываются зависимости. Эти файлы редактировать не надо, т.к. `Bundler` (утилита для управления зависимостями) делает всё сам.

#### index.markdown, about.markdown, 404.html

Страницы блога. Тут можно написать всё что душе угодно, например создать кастомную заглушку для ошибки 404. `Jekyll` поддерживает как `HTML`-страницы, так и страницы с разметкой Markdown. Для удобства, все страницы, кроме `index.markdown` можно вынести в отдельную папку.

При необходимости как-то кастомизировать стили страниц или макеты, то можно поискать информацию в репозитории `minima`[^4].

#### Папка _posts

Папка для хранения постов. Посты, которые находятся в этой папке, будут отображаться на главной странице.

### Запуск блога локально

Чтобы собрать и запустить блог локально необходимо выполнить команду:

``` console
bundle exec jekyll serve
```

Если будет появляться ошибка с текстом `cannot load such file -- webrick (LoadError)`, то нужно добавить в `Gemfile` строку `gem "webrick", "~> 1.7"`

После запуска блог будет доступен по адресу `http://localhost:4000/`.

## 02. Посты

Теперь можно приступить к созданию постов. Документация по созданию постов на сайте `Jekyll`[^5] достаточно подробная, поэтому я не буду повторяться и рассмотрю только сложные моменты, с которыми столкнулся при продумывании функционала блога.

### Тэги

В `Jekyll` по-умолчанию нет функционала тэгов, поэтому для её реализации придётся вносить изменения в проект.

Для начала о том, какой функционал мне хотелось видеть в своём блоге:

- Отображение тэгов в посте.
- Просмотр списка существующих тэгов.
- Подсчёт тэгов.
- Фильтрация постов по тэгам.

Моя инструкция по реализации тэгов в `Jekyll` основана на двух других инструкциях, [^6] [^7] но с небольшими доработками.

#### Отображение тэгов в посте

Необходимо отредактировать макет поста. Для этого нужно скопировать файл `_layouts\post.html` из проекта `minima` [^8] в свой проект и добавить в конец элемента `header` следующий код:

``` html
{% raw %}{% for tag in page.tags %}
<a class="post" href="{{site.baseurl}}/tag/{{tag}}">#{{tag}}</a>
{% endfor %}{% endraw %}
```

#### Просмотр списка существующих тэгов и подсчёт тэгов

Во-первых, необходимо добавить страницу `_pages\tags.html` на которой будет отображаться список тэгов:

``` html
{% raw %}---
permalink: /tags/
layout: page
title: Tags
---

<ul>
    {% assign tags = site.posts | all_tags %}  
    {% for tag in tags %}
      <li>
        <a class="tag-link"
          href="{{site.baseurl}}/tag/{{tag['name']}}">
          #{{ tag['name'] }} ({{ tag['count'] }})
        </a>
      </li>
    {% endfor %}
  </ul>{% endraw %}
```

Во-вторых, необходимо добавить плагин в папку `_plugins`, который будет подсчитывать тэги по всем существующим постам:

``` ruby
module Jekyll
    module TagsCounter
    include Liquid::StandardFilters
  
    def all_tags(posts)
      counts = {}
  
      posts.each do |post|
        post['tags'].each do |tag|
          if counts[tag]
            counts[tag] += 1
          else
            counts[tag] = 1
          end
        end
      end
  
      tags = counts.keys
      tags.reject { |t| t.empty? }
        .map { |tag| { 'name' => tag, 'count' => counts[tag] } }
        .sort { |tag1, tag2| tag2['count'] <=> tag1['count'] }
    end
  end
end

Liquid::Template.register_filter(Jekyll::TagsCounter)
```

#### Фильтрация постов по тэгам

Во-первых, необходимо добавить макет страницы на которой будет отображаться список постов с выбранным тэгом `_layouts\tag.html`:

``` html
{% raw %}---
layout: default
---

<h1>#{{page.tag}}</h1>
<ul>
  {% for post in site.posts %} {% if post.tags contains page.tag %}
  <li>
    <a class="post" href="{{post.url}}">{{ post.title }}</a>
  </li>
  {% endif %} {% endfor %}
</ul>{% endraw %}
```

Во-вторых, необходимо добавить плагин в папку `_plugins`, который будет генерировать страницы для тэгов:

``` ruby
module Jekyll
    class TagPageGenerator < Generator
      safe true
  
      def generate(site)
        tags = site.posts.docs.flat_map { |post| post.data['tags'] || [] }.to_set
        tags.each do |tag|
          site.pages << TagPage.new(site, site.source, tag)
        end
      end
    end
  
    class TagPage < Page
      def initialize(site, base, tag)
        @site = site
        @base = base
        @dir  = File.join('tag', tag)
        @name = 'index.html'
  
        self.process(@name)
        self.read_yaml(File.join(base, '_layouts'), 'tag.html')
        self.data['tag'] = tag
        self.data['title'] = "Tag: #{tag}"
      end
    end
  end
```

Этот плагин при сборке блога создаст директорию `site\tag` в которой будут папки для каждого из тэгов. Каждая из таких папок будет содержать страницу `index.html`, которая содержит список постов с этим тэгом.

### Комментарии

В `Jekyll` по-умолчанию комментариев тоже нет, поэтому снова понадобится вносить изменения, правда не такие большие.

Вариантов виджетов [^9] для комментирования много. Я использую `utterances` [^10], потому что этот виджет основан на `GitHub issues` и для его использования нужен только аккаунт `GitHub`. Инструкция на сайте `utterances` очень простая. Всё что нужно сделать - пройти по шагам для конфигурации JS-скрипта, а затем скопировать получившийся JS-скрипт в конец файла `_layouts\post.html`.

## GitHub


## Ссылки и источники

[^1]: [Загрузить Ruby](https://www.ruby-lang.org/en/downloads/)
[^2]: [Конфигурация Jekyll](https://jekyllrb.com/docs/configuration/default/)
[^3]: [Конфигурация Jekyll для моего блога](https://github.com/alexeyfv/blog/blob/master/_config.yml)
[^4]: [Репозиторий темы minima](https://github.com/jekyll/minima)
[^5]: [Документация Jekyll по созданию постов](https://jekyllrb.com/docs/posts/)
[^6]: [Managing tags in Jekyll blog easily](https://blog.lunarlogic.io/2019/managing-tags-in-jekyll-blog-easily/)
[^7]: [Tags in Jekyll](https://vilcins.medium.com/tags-in-jekyll-3e1786ffc040)
[^8]: [Макет post.html из minima](https://github.com/jekyll/minima/blob/master/_layouts/post.html)
[^9]: [Обсуждение виджетов для комментирования на StackOverflow](https://stackoverflow.com/questions/59096243/adding-comments-in-blog-posts-on-github-pages)
[^10]: [Виджет utterances](https://utteranc.es/)

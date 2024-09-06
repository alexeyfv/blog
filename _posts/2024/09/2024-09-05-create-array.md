---
layout: post
title: "Создание массивов в C#: способы и производительность"
date: 2024-09-05
tags: csharp benchmark
---

Как создать массив в C#? Вопрос кажется простым. Но с каждой новой версией .NET появляются всё новые и новые фичи. На данный момент я знаю аж 7 способов создания массивов.

1. `new T[]`. Самый очевидный, простой и популярный способ создания объектов и массивов в частности. Этот оператор используется повсеместно и является основным для большинства сценариев.

<img src="{{site.baseurl}}/assets/2024/09/2024-09-05-create-array/image01.png" alt="content">

2. `stackalloc T[]`. Выделяет память в стеке для массива заданного размера и возвращает указатель. Когда-то давно оператор stackalloc требовал использования небезопасного (unsafe) контекста. С появлением `Span<T>` его можно применять и без unsafe. Этот способ ограничен размером доступной памяти в стеке и при необдуманном использовании может привести к `StackOverflowException`.

<img src="{{site.baseurl}}/assets/2024/09/2024-09-05-create-array/image02.png" alt="content">

Для небольших массивов stackalloc T[] быстрее new T[] в среднем на 20% и на 88% для больших массивов. Под небольшими массивами я подразумеваю массивы размером меньше 85 000 байт, т.е. размещаемые в куче малых объектов (SOH), а под большими – в куче больших объектов (LOH).

3. `ArrayPool<T>`. ArrayPool выделяет массив из пула, что минимизирует количество аллокаций памяти и уменьшает нагрузку на сборщик мусора. Массивы, возвращаемые из пула, могут быть больше запрошенного размера, например, для массива из 700 элементов будет возвращён массив длиной 1024. Использование пула полезно, для относительно больших временных массивов, которые часто создаются и уничтожаются.

`ArrayPool<T>` быстрее `new T[]` в среднем на 30% для небольших массивов и на 89% для больших массивов. Однако для массивов размером менее 300–400 байт использование пула может быть медленнее.

<img src="{{site.baseurl}}/assets/2024/09/2024-09-05-create-array/image03.png" alt="content">

4. `GC.AllocateUninitializedArray<T>`. Этот метод создаёт массив без инициализации его элементов значениями по умолчанию. Использование этого метода может быть небезопасным, так как массив содержит неинициализированные данные. Обязательно перезаписывайте все значения в созданном массиве.

`GC.AllocateUninitializedArray<T>` быстрее `new T[]` в среднем на 15% для массивов 2048 – 85 000 байт. В остальных случаях производительность с `new T[]` одинаковая.

<img src="{{site.baseurl}}/assets/2024/09/2024-09-05-create-array/image04.png" alt="content">

5. `Array.Initialize`. Позволяет создавать массивы, задавая тип во время выполнения. Например, когда тип неизвестен на этапе компиляции. Полезно для сценариев, связанных с динамической типизацией.

Производительность аналогична `new T[]`, либо хуже.

<img src="{{site.baseurl}}/assets/2024/09/2024-09-05-create-array/image05.png" alt="content">

6. `InlineArrayAttribute`. Относительно новая фича, появившаяся в C# 12. Позволяет объявить структуру с атрибутом `InlineArray`, которая затем будет вести себя как массив.

Быстрее `new T[]` в среднем на 39% для небольших массивов и на 91% для больших массивов.

<img src="{{site.baseurl}}/assets/2024/09/2024-09-05-create-array/image06.png" alt="content">

7. `collections expressions`. Синтаксический сахар, который позволяет записать массив в виде литерала. Например, `int[] array = [1, 2, 3]` создаёт массив в куче, аналогично использованию `new T[]`. А конструкция `Span<int> array = [1, 2, 3]` создаёт массив в стеке, аналогично `stackalloc`.

<img src="{{site.baseurl}}/assets/2024/09/2024-09-05-create-array/image07.png" alt="content">

Код бенчмарка и результаты [тут](https://github.com/alexeyfv/create-array).
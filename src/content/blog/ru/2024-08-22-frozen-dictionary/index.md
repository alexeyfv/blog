---
title: 'Заглядываем под капот FrozenDictionary'
description: 'Глубокий анализ производительности и внутреннего устройства FrozenDictionary в .NET 8'
pubDate: 'Aug 22 2024'
heroImage: 'cover.png'
tags: ['C#', 'FrozenDictionary', 'Dictionary', 'Performance', 'Benchmark', 'Hash Table', 'Algorithms']
---

С [релизом .NET 8](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8/runtime\#performance-focused-types) в арсенале C# разработчиков появилась новая коллекция – `FrozenDictionary`. Особенность этого словаря в том, что он неизменяемый, но при этом обеспечивает более быстрое чтение по сравнению с обычным `Dictionary`. Я неспроста разбил результаты на обложке по типам – используемые во `FrozenDictinoary` алгоритмы сильно зависят от типа ключа, размера словаря или даже, например, количества строковых ключей одинаковой длины. В этой статье подробно разберем, насколько `FrozenDictionary` быстрее и почему.

<img src="{{site.baseurl}}/assets/2024/08/2024-08-22-frozen-dictionary/image01.png" alt="Производительность FrozenDictionary по сравнению с Dictionary">

*English version is [here]({{site.baseurl}}/2024/10/09/frozen-dictionary.html)*.

<!--more-->

## Оглавление

- [Оглавление](#оглавление)
- [Dictionary, ты один приходи. Мы тоже один придём](#dictionary-ты-один-приходи-мы-тоже-один-придём)
- [Дисклеймер](#дисклеймер)
- [Группа 1. Словари по умолчанию](#группа-1-словари-по-умолчанию)
  - [Алгоритм поиска](#алгоритм-поиска)
  - [Бенчмарк](#бенчмарк)
- [Группа 2. Словарь для ключей типа Int32](#группа-2-словарь-для-ключей-типа-int32)
  - [Алгоритм поиска](#алгоритм-поиска-1)
  - [Бенчмарк](#бенчмарк-1)
- [Группа 3. Словарь с алгоритмом распределения строк по длине](#группа-3-словарь-с-алгоритмом-распределения-строк-по-длине)
  - [Алгоритм поиска](#алгоритм-поиска-2)
  - [Бенчмарк](#бенчмарк-2)
- [Группа 4. Словари с ключом типа string](#группа-4-словари-с-ключом-типа-string)
  - [Алгоритм поиска](#алгоритм-поиска-3)
  - [Бенчмарк](#бенчмарк-3)
- [Группа 5. Небольшие словари](#группа-5-небольшие-словари)
  - [Алгоритм поиска](#алгоритм-поиска-4)
  - [Бенчмарк](#бенчмарк-4)
- [Резюме](#резюме)

## Dictionary, ты один приходи. Мы тоже один придём

Прежде чем начать ~~битву~~ сравнение с `Dictionary`, важно заметить, что `FrozenDictionary<TKey, TValue>` – это абстрактный класс с [множеством реализаций](https://github.com/dotnet/runtime/tree/51e99e12a8a09c69e30fdcb004facf68f73173a6/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen). Точнее, их 18. Вместо объяснений, когда какая реализация используется, проще показать на схеме, поэтому смотрим рисунок 1.

<img src="{{site.baseurl}}/assets/2024/08/2024-08-22-frozen-dictionary/image02.png" alt="Выбор реализации FrozenDictionary">
<strong>Рисунок 1 – Выбор реализации FrozenDictionary</strong>

Пугаться не стоит, реализации можно разделить на 5 групп по принципу работы:

1. В [DefaultFrozenDictionary](https://github.com/dotnet/runtime/blob/8f74726e77b7ef4c00b90ad852b3917727e11e0c/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/DefaultFrozenDictionary.cs) и [ValueTypeDefaultComparerFrozenDictionary](https://github.com/dotnet/runtime/blob/8f74726e77b7ef4c00b90ad852b3917727e11e0c/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/ValueTypeDefaultComparerFrozenDictionary.cs) используется структура [FrozenHashTable](https://github.com/dotnet/runtime/blob/8f74726e77b7ef4c00b90ad852b3917727e11e0c/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/FrozenHashTable.cs).  
2. В Int32FrozenDictionary тоже используется FrozenHashTable, но нет расчёта хэш-кода, поскольку значение ключа и есть хэш-код.  
3. [LengthBucketsFrozenDictionary](https://github.com/dotnet/runtime/blob/8f74726e77b7ef4c00b90ad852b3917727e11e0c/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/LengthBucketsFrozenDictionary.cs) использует алгоритм, похожий на [блочную сортировку](https://ru.wikipedia.org/wiki/%D0%91%D0%BB%D0%BE%D1%87%D0%BD%D0%B0%D1%8F_%D1%81%D0%BE%D1%80%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%BA%D0%B0).  
4. Реализации [OrdinalStringFrozenDictionary](https://github.com/dotnet/runtime/blob/8f74726e77b7ef4c00b90ad852b3917727e11e0c/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/OrdinalStringFrozenDictionary.cs) тоже используют FrozenHashTable, но в них особенный алгоритм расчёт хэш-кода.  
5. [SmallValueTypeComparableFrozenDictionary](https://github.com/dotnet/runtime/blob/8f74726e77b7ef4c00b90ad852b3917727e11e0c/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/SmallValueTypeComparableFrozenDictionary.cs\#L18), [SmallValueTypeDefaultComparerFrozenDictionary](https://github.com/dotnet/runtime/blob/8f74726e77b7ef4c00b90ad852b3917727e11e0c/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/SmallValueTypeDefaultComparerFrozenDictionary.cs\#L12) и [SmallFrozenDictionary](https://github.com/dotnet/runtime/blob/8f74726e77b7ef4c00b90ad852b3917727e11e0c/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/SmallFrozenDictionary.cs\#L18) используют линейный поиск, так как размер словарей не превышает 10 элементов.

Выбор подходящей реализации зависит от множества параметров и происходит в методе [CreateFromDictionary статического класса FrozenDictionary](https://github.com/dotnet/runtime/blob/51e99e12a8a09c69e30fdcb004facf68f73173a6/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/FrozenDictionary.cs\#L113). Теперь подробно рассмотрим каждую группу по отдельности, изучим их алгоритмы и сделаем замеры.

## Дисклеймер

Результаты бенчмарков в этой статье очень условны и верны только при определённых условиях. Допускаю, что бенчмарк может показать другие результаты на другом ПК, с другим ЦП, с другим компилятором или при другом сценарии использования рассматриваемого функционала языка. Всегда проверяйте ваш код на конкретно вашем железе и не полагайтесь лишь на статьи из интернета.

Исходный код бенчмарков и сырые данные результатов можно найти в [этом репозитории](https://github.com/alexeyfv/frozen-dictionary).

## Группа 1. Словари по умолчанию

Как уже было сказано ранее, в `DefaultFrozenDictionary` и `ValueTypeDefaultComparerFrozenDictionary` используется структура `FrozenHashTable`. Эта структура, как можно догадаться из названия, представляет собой реализацию хэш-таблицы. Чтобы лучше понять, чем алгоритм в `FrozenHashTable` отличается от `Dictionary`, кратко вспомним, как устроен поиск в `Dictionary`. Если вы это помните, то можете пропустить объяснение.

Предположим, у нас есть следующий словарь:

```cs
var dictionary = new Dictionary<Fruit, string>()  
{  
    [new("apple")] = "APPLE",  
    [new("grape")] = "GRAPE",  
    [new("lemon")] = "LEMON",  
    [new("fig")] = "FIG",  
    [new("lime")] = "LIME",  
    [new("kiwi")] = "KIWI",  
};

public record Fruit(string Value);
```

Когда, например, мы ищем значение для ключа `Fruit("fig")`, в `Dictionary` происходит следующее (рисунок 2):

1. Вычисляется хэш код ключа `hashCode`.  
2. Рассчитывается индекса бакета `bucketIndex`.  
3. Если ключ в бакете равен искомому, то возвращается значение. Иначе переходим к следующему ключу с таким же хэш-кодом и повторяем п. 3.

<img src="{{site.baseurl}}/assets/2024/08/2024-08-22-frozen-dictionary/image03.png" alt="Как осуществляется поиск элементов в Dictionary">
<strong>Рисунок 2 – Пример поиска в Dictionary</strong>

### Алгоритм поиска

Иммутабельность `FrozenDictionary` позволяет иначе реализовать работу с бакетами в `FrozenHashTable`. Поскольку количество пар ключ-значение не меняется, то можно:

1. [Подобрать](https://github.com/dotnet/runtime/blob/c788546f9ad43ea17981d5dc9343b00b6f76d98f/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/FrozenHashTable.cs\#L47) количество бакетов так, что количество коллизий будет [не более 5%](https://github.com/dotnet/runtime/blob/3eba70227be23baee21c13a7ab9316d58d469b82/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/FrozenHashTable.cs\#L151) от количества уникальных хэшей.  
2. Разместить ключи и значения последовательно в массивах `_keys` и `_values`, вместо связного списка в `Dictionary`. Это сделает поиск более эффективным за счет более высокой локальности данных.

При использовании `FrozenDictionary` поиск значения для ключа `Fruit("fig")` выглядел бы следующим образом (рисунок 3):

1. Вычисляется хэш код ключа `hashCode`.  
2. Рассчитывается индекса бакета `bucketIndex`.
3. В массиве `bucket` получаем значения `start` и `end`, задающие границы в массиве `HashCodes`.  
4. Итерируем массив `HashCodes` от `start` до `end`, в поисках искомого ключа и возвращаем значение при нахождении.

<img src="{{site.baseurl}}/assets/2024/08/2024-08-22-frozen-dictionary/image04.png" alt="Как осуществляется поиск в DefaultFrozenDictionary">
<strong>
Рисунок 3 – Пример поиска в DefaultFrozenDictionary
</strong>

### Бенчмарк

Результаты бенчмарков для `DefaultFrozenDictionary` и `ValueTypeDefaultComparerFrozenDictionary` на рисунках 4 и 5.

<img src="{{site.baseurl}}/assets/2024/08/2024-08-22-frozen-dictionary/image05.png" alt="Скорость чтения из ValueTypeDefaultComparerFrozenDictionary по сравнению с Dictionary">
<strong>
Рисунок 4 – Скорость чтения из ValueTypeDefaultComparerFrozenDictionary по сравнению с Dictionary
</strong>

<img src="{{site.baseurl}}/assets/2024/08/2024-08-22-frozen-dictionary/image06.png" alt="Скорость чтения из DefaultFrozenDictionary по сравнению с Dictionary">
<strong>
Рисунок 5 – Скорость чтения из DefaultFrozenDictionary по сравнению с Dictionary
</strong>

Высокая скорость поиска в `Dictionary` по сравнению с `ValueTypeDefaultComparerFrozenDictionary` при размере словаря до 1000 элементов, вероятно, связана с агрессивным [инлайном](https://ru.wikipedia.org/wiki/%D0%92%D1%81%D1%82%D1%80%D0%B0%D0%B8%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5_%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B9) методов `Dictionary`. Почему граница именно в 1000 элементов я понять не смог, т.к. в [исходном коде](https://github.com/dotnet/runtime/blob/10107d3ca202bf1fda76a1bf575d782be4be27c3/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/Dictionary.cs) ничего об этом нет. Возможно это детали реализации JIT-компилятора. Если у вас есть идеи на этот счет, поделитесь в комментариях.

В остальных случаях, `FrozenDictionary` быстрее на 31-32% для значимых типов и 17-18% для ссылочных типов.

## Группа 2. Словарь для ключей типа Int32

`Int32FrozenDictionary` также использует `FrozenHashTable`. Особенность этой реализации в том, что если тип ключа – целое число, то его хэш равен его значению и коллизии в таком словаре не возможны в принципе. Нельзя, например, добавить 2 элемента с ключом 123 – будет выброшено исключение.

``` cs
var dict = new Dictionary<int, int>();  
dict.Add(123, 1);  
dict.Add(123, 2); // System.ArgumentException: An item with the same key has already been added.
```

### Алгоритм поиска

Такая особенность `Int32FrozenDictionary` позволяет при чтении пропустить расчёт хэша и [использовать значение ключа напрямую](https://github.com/dotnet/runtime/blob/eb455ec34c6709e487c19e52c29ec712a6fa4d7f/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/Int32/Int32FrozenDictionary.cs\#L35). В итоге, поиск значения выглядит так (рисунок 6):

1. Индекса бакета `bucketIndex` рассчитывается сразу по значению ключа.  
2. В массиве `bucket` получаем значения `start` и `end`, задающие границы в массиве `HashCodes`.  
3. Итерируем массив `HashCodes` от `start` до `end`, в поисках искомого ключа и возвращаем значение при нахождении.

<img src="{{site.baseurl}}/assets/2024/08/2024-08-22-frozen-dictionary/image07.png" alt="Как осуществляется поиск в Int32FrozenDictionary">
<strong>
Рисунок 6 – Пример поиска в Int32FrozenDictionary
</strong>

### Бенчмарк

Благодаря оптимизациям, чтение из `Int32FrozenDictionary` быстрее на 34-42% (рисунок 7).

<img src="{{site.baseurl}}/assets/2024/08/2024-08-22-frozen-dictionary/image08.png" alt="Скорость чтения из Int32FrozenDictionary по сравнению с Dictionary">
<strong>
Рисунок 7 – Скорость чтения из Int32FrozenDictionary по сравнению с Dictionary
</strong>

## Группа 3. Словарь с алгоритмом распределения строк по длине

При создании «замороженных» словарей со строковым ключом, `FrozenDictionary` в первую очередь попытается создать класс `LengthBucketsFrozenDictionary`. Этот класс оптимизирован для ситуаций, когда ключи имеют разную длину. Достигается это [распределением ключей по бакетам](https://github.com/dotnet/runtime/blob/25f82f314b07cc96dd3212ca4ef950b4220516d1/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/LengthBuckets.cs\#L17): для каждой уникальной длины ключа создаётся бакет вместимостью `MaxPerLength = 5` элементов. По сути, это реализация [блочной сортировки](https://ru.wikipedia.org/wiki/%D0%91%D0%BB%D0%BE%D1%87%D0%BD%D0%B0%D1%8F_%D1%81%D0%BE%D1%80%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%BA%D0%B0). Чтобы стало понятнее, рассмотрим пример:

``` cs
var dictionary = new Dictionary<Fruit, string>()  
{  
    ["apple"] = "APPLE",  
    ["grape"] = "GRAPE",  
    ["lemon"] = "LEMON",  
    ["fig"] = "FIG",  
    ["lime"] = "LIME",  
    ["kiwi"] = "KIWI",  
}  
var frozenDictionary = dictionary.ToFrozenDictionary();
```

В словаре есть ключи длиной 3, 4 и 5 символов. Следовательно, их можно распределить в 3 бакета (рисунок 8):

1. Бакет для ключей длиной 3: `fig`.  
2. Бакет для ключей длиной 4: `lime` и `kiwi`.  
3. Бакет для ключей длиной 5: `apple`, `grape` и `lemon`.

<img src="{{site.baseurl}}/assets/2024/08/2024-08-22-frozen-dictionary/image09.png" alt="Распределение строк по бакетам на основе их длины">
<strong>
Рисунок 8 – Распределение строк по бакетам на основе их длины
</strong>

Поскольку известна минимальная (3) и максимальная (5) длина ключей, нет смысла создавать 3 отдельных бакета. Можно всё хранить в одном массиве `_lengthBuckets`. В таком случае индекс рассчитывается так: `(key.Length - minLength) * MaxPerLength`.

### Алгоритм поиска

Поиск осуществляется в 3 шага (рисунок 9):

1. Определяется бакет в массиве `_lengthBuckets`.  
2. Линейным поиском в бакете определяется индекс искомого ключа в `_keys`.  
3. Возвращается значение.

<img src="{{site.baseurl}}/assets/2024/08/2024-08-22-frozen-dictionary/image10.png" alt="Как осуществляется поиск в LengthBucketsFrozenDictionary">
<strong>
Рисунок 9 – Пример поиска в LengthBucketsFrozenDictionary
</strong>

У `LengthBucketsFrozenDictionary` есть 2 ограничения:

1. Количество ключей с одинаковой длиной не должно превышать `MaxPerLength` ([принцип Дирихле](https://ru.wikipedia.org/wiki/%D0%9F%D1%80%D0%B8%D0%BD%D1%86%D0%B8%D0%BF_%D0%94%D0%B8%D1%80%D0%B8%D1%85%D0%BB%D0%B5_(%D0%BA%D0%BE%D0%BC%D0%B1%D0%B8%D0%BD%D0%B0%D1%82%D0%BE%D1%80%D0%B8%D0%BA%D0%B0))). Нельзя разместить 6 строк с одинаковой длиной в бакет вместимостью 5 элементов.  
2. Количество пустых бакетов должно быть < 20%. Иначе реализация становится неэффективна с точки зрения использования памяти.

Если одно из этих условий не выполняется, то будет выбрана одна из реализаций [OrdinalStringFrozenDictionary](https://github.com/dotnet/runtime/blob/e75fc2775a2c844ffd45e64b9a1b67b7e088959f/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/OrdinalStringFrozenDictionary.cs) (о ней далее).

### Бенчмарк

Результаты бенчмарка показывают, что чтение из `LengthBucketsFrozenDictionary` может быть до 99% быстрее обычного `Dictionary`. Но если в словаре количество ключей с одинаковой длиной достигает 5, то производительность небольших словарей (до 100 элементов) может быть хуже (рисунок 10).

<img src="{{site.baseurl}}/assets/2024/08/2024-08-22-frozen-dictionary/image11.png" alt="Скорость чтения из LengthBucketsFrozenDictionary по сравнению с Dictionary">
<strong>
Рисунок 10 – Скорость чтения из LengthBucketsFrozenDictionary по сравнению с Dictionary
</strong>

## Группа 4. Словари с ключом типа string  

Как мы уже знаем, у `LengthBucketsFrozenDictionary` есть ограничения. Поэтому, если невозможно распределить ключи по бакетам, используется одна из 11 реализаций абстрактного класса [OrdinalStringFrozenDictionary](https://github.com/dotnet/runtime/blob/e75fc2775a2c844ffd45e64b9a1b67b7e088959f/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/OrdinalStringFrozenDictionary.cs). Все они используют `FrozenHashTable`, но отличаются алгоритмом [расчёта хэш-кода строки](https://github.com/dotnet/runtime/blob/0378936909464c84cf207ffd1a21efa474fc34c0/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/Hashing.cs).

Выбор оптимальной реализации `OrdinalStringFrozenDictionary` зависит от результата анализа ключей [классом KeyAnalyzer](https://github.com/dotnet/runtime/blob/d25d42e6dba95016cc1af95367a50c6b8b26efdd/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/KeyAnalyzer.cs). На результат влияет длина ключей, наличие не-ASCII символов, заданные правила сравнения строк ([StringComparison](https://learn.microsoft.com/en-us/dotnet/api/system.stringcomparison)) и наличие в ключах уникальных подстрок.  

Очевидно, что чем длиннее строка, тем медленнее выполняется расчёт хэш-кода. Поэтому `KeyAnalyzer` пытается найти подстроки наименьшей длины, позволяющие однозначно идентифицировать ключ. Для лучшего понимания снова рассмотрим пример с фруктами: `apple`, `grape`, `fig`, `lime`, `lemon` и `kiwi`.

Сперва `KeyAnalyzer` анализирует подстроки длиной в 1 символ при левостороннем выравнивании ключей (рисунок 11).

<img src="{{site.baseurl}}/assets/2024/08/2024-08-22-frozen-dictionary/image12.png" alt="Подстроки длиной в 1 символ при левостороннем и правостороннем выравнивании ключей">
<strong>
Рисунок 11 – Подстроки длиной в 1 символ при левостороннем и правостороннем выравнивании ключей
</strong>

В нашем примере при левостороннем выравнивании есть повторяющиеся подстроки. Например, 0-й символ lime и lemon, 1-й символ fig и lime и 2-й символ в lime и lemon. То есть невозможно при таком выравнивании однозначно идентифицировать ключ по одному символу. Поэтому поиск подстроки продолжается при правостороннем выравнивании. В этом случае подстроки будут уникальны при использовании 2-го или 1-го символа с конца. Зная выравнивание, индекс начала и длину подстроки можно однозначно идентифицировать строку рассчитав хэш-код её подстроки.

Если уникальных подстрок длиной в 1 символ нет, то поиск продолжится для подстрок в 2 символа, 3 символа, вплоть до максимальной длины подстроки. Это значение рассчитывается как минимальное между `minLength` (минимальная длина ключа) и `MaxSubstringLengthLimit = 8`. Такое ограничение сделано специально, чтобы не анализировать слишком длинные подстроки, так как их использование не даёт прироста в производительности.

Если уникальных подстрок нет вообще, то расчёт хэш-кода будет производиться для всей строки.

Помимо наличия уникальных подстрок на реализацию также [влияют заданные параметры сравнения строк (StringComparison)](https://github.com/dotnet/runtime/blob/0378936909464c84cf207ffd1a21efa474fc34c0/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/KeyAnalyzer.cs\#L56) и наличие не-ASCII символов. В зависимости от этих параметров будет выбран более оптимальный компаратор.

### Алгоритм поиска

Поиск в словарях, основанных на `OrdinalStringFrozenDictionary`, происходит [следующим образом](https://github.com/dotnet/runtime/blob/98b165db27a3c15b9c0df208d1acca573b3dd15e/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/OrdinalStringFrozenDictionary.cs\#L83):

1. Проверяется, находится ли длина ключа в пределах допустимого диапазона. Это нужно для быстрого определения ключей, которые явно не подходят по длине.  
2. Далее, выполняются те же шаги, что мы ранее видели в других словарях с `FrozenHashTable`. Рассчитывается хэш-код подстроки и осуществляется поиск в хэш-таблице. В случае коллизии осуществляется линейный поиск.

### Бенчмарк

По результатам бенчмарка, `FrozenDictionary` размером до 75 тыс. элементов быстрее обычного `Dictionary`. Однако при дальнейшем увеличении размера словаря скорость поиска снижается (рисунок 12).

<img src="{{site.baseurl}}/assets/2024/08/2024-08-22-frozen-dictionary/image13.png" alt="Скорость чтения из OrdinalStringFrozenDictionary_LeftJustifiedSubstring по сравнению с Dictionary">
<strong>
Рисунок 12 – Скорость чтения из OrdinalStringFrozenDictionary_LeftJustifiedSubstring по сравнению с Dictionary
</strong>

Высокая скорость `FrozenDictionary` обусловлена быстрым расчётом хэш-кода ключей. Алгоритм, используемый в `FrozenDictionary`, на 75% – 90% быстрее алгоритма обычного `Dictionary` (рисунок 13).

<img src="{{site.baseurl}}/assets/2024/08/2024-08-22-frozen-dictionary/image14.png" alt="Сравнение скорости расчёта хэша">
<strong>
Рисунок 13 – Сравнение скорости расчёта хэша
</strong>

Падение производительности в словарях размером 75 тыс. элементов и более вызвано возрастающим количеством коллизий хэша при увеличении размера словаря (рисунок 14).

<img src="{{site.baseurl}}/assets/2024/08/2024-08-22-frozen-dictionary/image15.png" alt="Количество коллизий при расчёте хэшей">
<strong>
Рисунок 14 – Количество коллизий при расчёте хэшей
</strong>

Как видно из графиков, алгоритм, используемый в `FrozenDictionary`, позволяет ускорить расчёт хэш-кода строки, улучшая производительность до 70%. Однако такой подход негативно сказывается на производительности поиска в относительно больших словарях.

## Группа 5. Небольшие словари

`SmallValueTypeComparableFrozenDictionary`, `SmallValueTypeDefaultComparerFrozenDictionary` используются, когда в исходном словаре не более 10 элементов, а `SmallFrozenDictionary` – не более 4-х элементов. При этом, `SmallValueTypeComparableFrozenDictionary` применяется, если тип ключа – это [встроенный примитивный значимый тип](https://github.com/dotnet/runtime/blob/8e92aef5387fe1d4b9159b4a3657416ac7d0a05a/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/Constants.cs\#L44) (`int`, `long`, `double`, `enum` и т.д.). Если же тип ключа, к примеру, некоторая кастомная структура, то будет использован тип `SmallValueTypeDefaultComparerFrozenDictionary`. Такое разделение разработчики .NET объясняют тем, что у встроенных типов 100% реализован интерфейс IComparable и поэтому можно немного оптимизировать поиск, предварительно отсортировав массивы ключей и значений:

### Алгоритм поиска

Строго говоря, классы `SmallValueTypeComparableFrozenDictionary`, `SmallValueTypeDefaultComparerFrozenDictionary` и `SmallFrozenDictionary` – это не хэш-таблицы. Поиск значения в них осуществляется простым линейным поиском через `for` (рисунок 15).

<img src="{{site.baseurl}}/assets/2024/08/2024-08-22-frozen-dictionary/image16.png" alt="Как осуществляется поиск в SmallValueTypeComparableFrozenDictionary">
<strong>
Рисунок 15 – Пример поиска в SmallValueTypeComparableFrozenDictionary
</strong>

В `SmallValueTypeComparableFrozenDictionary`, поскольку массивы `_keys` и `_value` отсортированы, можно осуществлять поиск пока искомое значение ключа больше текущего значения `_keys[i]`.

Реализации `SmallValueTypeDefaultComparerFrozenDictionary` и `SmallFrozenDictionary` похожи на предыдущую, с тем лишь отличием, что в них не используется сортировка. Соответственно, линейный поиск по массиву ключей `_keys` будет осуществлён всегда.

### Бенчмарк

Несмотря на все оптимизации в этих классах, результаты бенчмарков не выглядят впечатляющими (рисунок 16). Даже то небольшое ускорение, которое могут дать эти классы, составляет всего лишь несколько десятков наносекунд.
<img src="{{site.baseurl}}/assets/2024/08/2024-08-22-frozen-dictionary/image17.png" alt="Скорость чтения из SmallValueTypeComparableFrozenDictionary, SmallValueTypeDefaultComparerFrozenDictionary и SmallFrozenDictionary по сравнению с Dictionary">
<strong>
Рисунок 16 – Скорость чтения из SmallValueTypeComparableFrozenDictionary, SmallValueTypeDefaultComparerFrozenDictionary и SmallFrozenDictionary по сравнению с Dictionary
</strong>

## Резюме

В этой статье я постарался разобрать основные моменты, связанные с `FrozenDictionary`. Мы убедились, что `FrozenDictionary` в большинстве случае действительно быстрее `Dictionary`.

На самом деле, в `FrozenDictionary` применяется ещё множество алгоритмов и оптимизаций. Например, использование пула массивов `ArrayPool`, оптимизированный алгоритм расчёта остатка от деления, использование массива целых чисел с битовыми сдвигами, вместо массива `bool` и т.д. Разбор всех деталей не получилось бы сделать в рамках одной статьи. Но я периодически делюсь подобными техническими тонкостями в коротких постах на [своём Telegram-канале](https://t.me/yet_another_dev). Если вам интересно, буду рад видеть вас среди читателей.
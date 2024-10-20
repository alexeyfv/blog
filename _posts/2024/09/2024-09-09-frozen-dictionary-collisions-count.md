---
layout: post
title: "Как в FrozenDictionary подсчитываются коллизии хэша"
date: 2024-09-07
tags: csharp frozendictionary benchmark hashtable algorithms
---

Второй короткий пост о деталях реализации `FrozenDictionary`, которые остались за кадром. Сегодня об [алгоритме подсчёта количества коллизий хэша](https://github.com/dotnet/runtime/blob/1c4755daf8f25f067a360c1dcae0d19df989e4e7/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/FrozenHashTable.cs#L277).

В `FrozenDictionary` хэш-коды всех ключей известны заранее. Это позволяет выбрать такое количество бакетов, при котором число коллизий не превышает допустимый порог — на данный момент это 5%. Делается это следующим образом:

1. Выбирается количество бакетов n из определённого диапазона. Этот диапазон [подобран разработчиками .NET эвристическим способом](https://github.com/dotnet/runtime/blob/1c4755daf8f25f067a360c1dcae0d19df989e4e7/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/FrozenHashTable.cs#L177).  
2. Для каждого хэш-кода рассчитывается остаток от деления на `n` и считается количество одинаковых результатов.  
3. Если количество коллизий слишком велико, то `n` увеличивается.

Вот пример с `bool[]`:

``` csharp
int[] hashCodes = [/*some hash codes*/];  
var seenBuckets = new bool[bucketsNumber];  
var collisionsCount = 0;

foreach (var hash in hashCodes) {  
    var bucketIndex = hash % bucketsCount;  
    if (seenBuckets[bucketIndex]) {  
        collisionsCount++;  
    }  
    else {  
        seenBuckets[bucketIndex] = true;  
    }  
}
```

Но в .NET сделали иначе и вместо `bool[]` используют `int[]` с битовыми сдвигами.

``` csharp
int[] hashCodes = [/*some hash codes*/];  
var seenBuckets = new int[bucketsNumber];  
var collisionsCount = 0;

foreach (var hash in hashCodes) {  
    var bucketIndex = hash % bucketsCount;  
    var i = bucketIndex / 32;  
    var bit = 1 << bucketIndex;  
    if ((seenBuckets[i] & bit) != 0) {  
        collisionsCount++;  
    }  
    else {  
        seenBuckets[i] |= bit;  
    }  
}
```

Такой подход позволяет значительно уменьшить размер массива (20% – 80%) и время его создания уменьшается в среднем на 70%. В то же время, скорость чтения и записи снижается в среднем на 50% и 198% соответственно (см. графики).

<img src="{{site.baseurl}}/assets/2024/09/2024-09-09-frozen-dictionary-collisions-count/image01.png" alt="content">

<img src="{{site.baseurl}}/assets/2024/09/2024-09-09-frozen-dictionary-collisions-count/image02.png" alt="content">

<img src="{{site.baseurl}}/assets/2024/09/2024-09-09-frozen-dictionary-collisions-count/image03.png" alt="content">

<img src="{{site.baseurl}}/assets/2024/09/2024-09-09-frozen-dictionary-collisions-count/image04.png" alt="content">

Получается, использование целых чисел с битовым сдвигом – компромиссное решение. Команда .NET видимо посчитала, что аллоцировать меньше памяти важнее, чем скорость алгоритма.

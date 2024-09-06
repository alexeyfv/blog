---
layout: post
title: "Быстрый расчёт остатка от деления"
date: 2024-08-29
tags: csharp benchmark algorithms
---

В процессе работы над [статьёй про FrozenDictionary]({{site.baseurl}}/2024/08/22/frozen-dictionary.html) заметил немало интересных деталей, о которых хочется рассказать. Начнём с простого, поэтому сегодня о быстром алгоритме расчёта остатка от деления.

Как известно, индекс бакета в словаре рассчитывается как остаток от деления `hashCode` на `bucketsCount`. В C# и многих других языках программирования для этого используется оператор `%`:

``` cs
var bucketNum = hashCode % bucketsCount;
```

В общем случае, эта операция включает в себя деление, которое [выполняется медленнее](https://stackoverflow.com/questions/15745819/why-is-division-more-expensive-than-multiplication), чем другие арифметические операции. Поэтому была придумана следующая формула:

``` cs
uint FastModLemier(uint hashcode, ulong multiplier, uint bucketsNum) => 
    (uint)((((UInt128)(hashcode * multiplier)) * bucketsNum) >> 64);
```

Идея этого подхода в том, что если количество бакетов известно заранее, то можно вычислить значение `multiplier` по формуле `ulong.MaxValue / bucketsNum + 1`. Это позволяет заменить деление на умножение и битовые сдвиги. Если интересны подробности и математическое обоснование формулы, то можете ознакомиться со [статьёй Дэниела Лемира](https://r-libre.teluq.ca/1633/1/Faster_Remainder_of_the_Division_by_a_Constant.pdf), разработчика данного метода. Для общего понимания достаточно прочитать главы 1 и 3.2.

В `FrozenDictionary` и `Dictionary` используется другой вариант [формулы](https://github.com/dotnet/runtime/blob/2aca5e53dba1a620ae5b57972c355eebed0cdb08/src/libraries/System.Private.CoreLib/src/System/Collections/HashHelpers.cs#L99), который, по [словам разработчиков Microsoft](https://github.com/dotnet/runtime/pull/406) немного быстрее, что подтверждается результатами бенчмарка (рисунок 1):

``` cs
uint FastModDotNet(uint hashcode, ulong multiplier, uint bucketsNum) => 
        (uint)(((((multiplier * hashcode) >> 32) + 1) * bucketsNum) >> 32);
```

Кроме того, JIT-компилятор способен оптимизировать код и заменить деление на несколько операций умножения и битовый сдвиг, если значение bucketsCount известно на этапе компиляции. В результате ASM-код для DefaultModConst будет идентичен коду FastModDotNet (рисунок 2).

Код бенчмарка и результаты [тут](https://github.com/alexeyfv/fastmod).

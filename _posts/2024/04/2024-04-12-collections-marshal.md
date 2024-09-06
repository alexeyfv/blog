---
layout: post
title: "Ускоряем Dictionary в C# при помощи структур и CollectionsMarshal"
date: 2024-04-12
tags: csharp benchmark dictionary
---

Если вы C# разработчик, то наверняка вам знаком класс Dictionary. В качестве значений вы, скорее всего, использовали классы. Но что если я скажу, что в Dictionary можно использовать структуры? Не стоит бояться того, что структуры копируются при передаче в метод или возврате из него. Есть способ этого избежать, и это работает быстро.

## Дисклеймер

Информация в этой статье верна только при определённых условиях. Я допускаю, что бенчмарк может показать другие результаты на другом железе, с другим компилятором, во время другой фазы луны или при другом сценарии использования рассматриваемого функционала языка. Всегда проверяйте ваш код и не полагайтесь лишь на статьи из интернета.

## Сценарий использования

Представим, что есть некоторый массив данных `data`. От нас требуется реализовать следующий функционал:

1. Преобразовать `data` в словарь для последующего поиска.  
2. По некоторому ключу найти в словаре объект и изменить его.  
3. Повторить п. 2 столько раз, сколько требуется.

Напишем код, который имитирует такое поведение:

``` cs
// Инициализация словаря  
var dict = new Dictionary<int, SomeClass>(Length);

// Заполнение словаря  
foreach (var (i, obj) in data) {  
    dict.Add(i, obj);  
}

// Поиск значения и изменение данных  
for (int i = 0; i < Length; i++) {  
    dict[i].DoWork(i);  
}
```

Код выше работает как задумано. Давайте попробуем его ускорить. Заменим класс SomeClass на структуру SomeStruct и сравним производительность обоих вариантов.

``` cs
// Инициализация словаря  
var dict = new Dictionary<int, SomeClass>(Length);

// Заполнение словаря  
foreach (var (i, obj) in data) {  
    dict.Add(i, obj);  
}

// Поиск значения и изменение данных  
for (int i = 0; i < Length; i++) {  
    var obj = dict[i];  
    obj.DoWork(i);  
    dict[i] = obj;  
}
```

## Бенчмарк

Замер производительности осуществлялся на массиве данных в 100 000 элементов. Размер классов (без заголовка) и структур менялся от 4 до 128 байт. Для замеров производительности я использовал библиотеку [BenchmarkDotNet](https://github.com/dotnet/BenchmarkDotNet). Код бенчмарка и результаты можно найти в [GitHub](https://github.com/alexeyfv/speed-up-the-dictionary).

<img src="{{site.baseurl}}/assets/2024/04/2024-04-12-collections-marshal/image01.png" alt="content">
<strong>Среднее время выполнения бенчмарка в зависимости от размера сущности</strong>

Результаты бенчмарка показывают ухудшение производительности при использовании структур размером больше 20 байт. В реализации со структурами происходит их многократное копирование, а поиск в словаре осуществляется дважды. Это негативно сказывается на производительности. Давайте разобьем замеры кода на части, чтобы понять, что можно улучшить.

### Инициализация словаря

Бенчмарк показал ожидаемые результаты. Время инициализации и размер словаря со структурами линейно возрастают с увеличением размера структур.

<img src="{{site.baseurl}}/assets/2024/04/2024-04-12-collections-marshal/image02.png" alt="content">
<strong>
Среднее время инициализации словаря в зависимости от размера сущности
</strong>

Связано это с тем, что массив [entries](https://github.com/dotnet/runtime/blob/552b5e9b3249e61f87ac5cc73976c55b104971de/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/Dictionary.cs#L27) в таком случае хранит непосредственно значения, а не ссылки. Соответственно, для хранения такого словаря нужно банально больше памяти.

Справедливости ради нужно отметить, что для классов CLR выделила памяти даже больше, просто это произошло ранее – во время инициализации массива `data`. Если замерять время, затраченное на инициализацию массива классов и структур, то результаты будут не в пользу классов. Но это выходит за рамки статьи.

### Заполнение словаря

И снова ожидаемые результаты. Время копирования структур, происходящее при заполнении словаря, линейно зависит от размера структур. Хотя разница между структурами и классами практически не заметна вплоть до 20 байт.

<img src="{{site.baseurl}}/assets/2024/04/2024-04-12-collections-marshal/image03.png" alt="content">
<strong>
Среднее время заполнения словаря в зависимости от размера сущности
</strong>

### Поиск значения и его изменение

И в третий раз результаты не в пользу структур.

<img src="{{site.baseurl}}/assets/2024/04/2024-04-12-collections-marshal/image04.png" alt="content">
<strong>
Среднее время поиска значения и его изменения в зависимости от размера сущности
</strong>

Связано это с тем, что поиск по ключу и копирование структур осуществляется дважды:

``` cs
SomeStruct s = dict[i]; // 1-й поиск по ключу и копирование структуры  
s.DoWork(i);  
d[i] = s; // 2-й поиск по ключу и копирование структуры
```

Вот тут нам и поможет класс `CollectionsMarshal`.

## Кто такой этот ваш CollectionsMarshal?

Если кратко, то это [класс](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.collectionsmarshal) с четырьмя extension-методами:

1. `AsSpan<T>` – возвращает `Span<T>` для элементов `List<T>`.  
2. `GetValueRefOrAddDefault<TKey, TValue>` – по ключу возвращает из словаря ссылку на элемент `TValue`, создавая `default` значение если элемента не существует.  
3. `GetValueRefOrNullRef<TKey, TValue>` – по ключу возвращает из словаря ссылку на элемент `TValue` или ссылку на `null`, если элемента не существует.  
4. `SetCount<T>` – устанавливает значение `Count` для `List<T>`.

Нас интересуют только `GetValueRefOrAddDefault` и `GetValueRefOrNullRef`. При помощи этих методов можно извлечь значения из словаря по ссылке, что позволит избежать двойного поиска по ключу и двойного копирования структуры. Например, код выше можно переписать следующим образом:

``` cs
ref SomeStruct s = ref CollectionsMarshal.GetValueRefOrNullRef(dict, i);  
s.DoWork(i);
```

## Ещё немного бенчмарков

Сделаем замеры реализации с `GetValueRefOrNullRef` и сравним с предыдущими результатами:

<img src="{{site.baseurl}}/assets/2024/04/2024-04-12-collections-marshal/image05.png" alt="content">
<strong>
Среднее время поиска значения и его изменения в зависимости от размера сущности
</strong>

Время выполнения кода с `CollectionsMarshal` даже быстрее, чем с классами. Чтобы компенсировать потери производительности при инициализации и заполнении словаря, количество операций поиска должно быть многократно больше, чем размер массива.


<img src="{{site.baseurl}}/assets/2024/04/2024-04-12-collections-marshal/image06.png" alt="content">
<strong>
Время выполнения бенчмарка. Графики разбиты по количеству операций поиска.
</strong>

## Особенности CollectionsMarshal

### Проверка на default и null

Как упоминалось ранее, методы GetValueRefOrAddDefault и GetValueRefOrNullRef возвращают ссылку на [default](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/default#default-literal) структуру и ссылку на null.

Проверить, дефолтная ли структура, т.е. все поля имеют дефолтное значение, довольно просто – нужно проверить флаг exists:

``` cs
ref var element = ref CollectionsMarshal.GetValueRefOrAddDefault(  
    dict, key, out bool exist);

if (exist) {  
    // some code here  
} 
```

Со ссылкой на `null` ситуация другая. Булевого флага нет, а при сравнении с `null` будет выброшено исключение NullReferenceException. Лучше воспользоваться методом [Unsafe.IsNullRef\<T\>(ref T source)](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.compilerservices.unsafe.isnullref?view=net-8.0).

``` cs
ref var element = ref CollectionsMarshal.GetValueRefOrNullRef(dict, key);  
if (Unsafe.IsNullRef<T>(ref element)) {  
    // some code here  
}
```

### Изменение словаря после получения ссылки на структуру

В документации к методам `GetValueRefOrAddDefault` и `GetValueRefOrNullRef` прямым текстом указано, что нельзя изменять словарь после того, как была получена ссылка на структуру. Почему так делать не надо продемонстрировано на примере ниже. После изменения словаря, любые изменения структуры, полученной по ссылке, не повлияют на значение в словаре.

``` cs
ref var element = ref CollectionsMarshal.GetValueRefOrNullRef(dict, key);

Console.WriteLine($"ref element: {element.Item1}"); // 30  
Console.WriteLine($"dict[key]: {dict[key].Item1}"); // 30

element.Item1 = 50; // change #1

Console.WriteLine($"ref element: {element.Item1}"); // 50  
Console.WriteLine($"dict[key]: {dict[key].Item1}"); // 50

dict.Add(100, new (100)); // add a new element  
element.Item1 = 60; // change #2

Console.WriteLine($"ref element: {element.Item1}"); // 60  
Console.WriteLine($"dict[key]: {dict[key].Item1}"); // 50
```

## Выводы

Структуры – недооценённые элементы C#, которые, при определённых условиях, способны ускорить ваше приложение. При использовании структур в качестве значений для `Dictionary` лучше воспользоваться классом `CollectionsMarshal`. Методы этого класса `GetValueRefOrAddDefault` и `GetValueRefOrNullRef` позволяют получать элементы словаря по ссылке. Это, в свою очередь, может положительно сказаться на производительности кода при относительно большом количестве операций поиска в словаре.

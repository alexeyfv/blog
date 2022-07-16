---
layout: post
title: "Частичная реализация — это внедрение зависимостей"
date: 2022-07-08
tags: dotnet fsharp csharp haskell functional_programming dependency_injection software_design
excerpt_separator: <!--more-->
---

*Эквивалент внедрению зависимостей в F# — частичная реализация функций, но этот подход не функциональный.*

Это перевод второй статьи Марка Симана из серии ["От внедрения зависимостей к отказу от зависимостей"](https://blog.ploeh.dk/2017/01/27/from-dependency-injection-to-dependency-rejection/).

Люди часто спрашивают меня о том, как внедрять зависимости в F#. Это нормально, поскольку я написал книгу [Внедрение зависимостей на платформе .NET](http://amzn.to/12p90MG) и с тех пор всё больше сосредотачиваю силы на F# и других функциональных языках программирования.

На протяжении многих лет я видел, как другие эксперты по F# отвечали на этот вопрос, и чаще всего ответ заключался в том, что частичная реализация функций — это способ внедрять зависимости на F#. В течение нескольких лет я тоже думал так. Это утверждение верно с одной стороны и не верно с другой. Частичная реализация функций эквивалентна внедрению зависимостей. Просто такой подход не является функциональным.

<!--more-->

Чтобы быть максимально ясным: Я не утверждаю, что частичная реализация функций не функциональна. Я утверждаю, что частичная реализация функций используемая для внедрения зависимостей не функциональна.

## Попытка внедрить зависимости используя функции

Возвращаясь к примеру из предыдущей статьи, перепишем `MaîtreD.TryAccept` как функцию:

``` fsharp
// int -> (DateTimeOffset -> Reservation list) -> (Reservation -> int) -> Reservation
// -> int option
let tryAccept capacity readReservations createReservation reservation =
    let reservedSeats =
        readReservations reservation.Date |> List.sumBy (fun x -> x.Quantity)
    if reservedSeats + reservation.Quantity <= capacity
    then createReservation { reservation with IsAccepted = true } |> Some
    else None
```

Представим, что функция `tryAccept` — часть модуля `MaîtreD`, чтобы примеры на F# и C# были максимально эквивалентными.

Функция принимает четыре аргумента. Первый — вместимость ресторана, простое целочисленное значение. Следующие два аргумента `readReservations` и `createReservation` выполняют роль интерфейса `IReservationsRepository` из предыдущей статьи. В том примере, метод `TryAccept` использовал два метода репозитория: `ReadReservations` и `Create`. Вместо этого, в реализации на F# я сделал так, чтобы функция принимала две независимые функции. Они имеют почти те же самые типы, что и аналоги на C#.

Первые три аргумента соответствуют внедрённым зависимостям класса `MaîtreD` из предыдущего примера. Четвёртый аргумент типа `Reservation` соответствует входному аргументу метода `TryAccept`.

Вместо того, чтобы возвращать nullable значение, функция на F# возвращает `int option`.

Реализация эквивалента примеру на C#: сначала происходит чтение бронирований из базы данных при помощи `readReservations` и суммируется количество уже забронированных мест. Исходя из этого значения, принимается решение, разрешить ли бронирование или нет. Если бронирование разрешено, то `IsAccepted` присваивается значение `true`, вызывается `createReservation` и полученный ID передаётся в `Some` через pipe-оператор. Если бронирование не разрешено, то возвращается `None`.

Обратите внимание, что первые три аргумента — зависимости, тогда как последний аргумент — "входные данные". Это означает, что можно использовать частичную реализацию функций для их компоновки.

## Реализация

Если вы помните определение интерфейса `IMaîtreD` из предыдущей статьи, метод `TryAccept` определен следующим образом:

``` csharp
int? TryAccept(Reservation reservation);
```

Можно определить аналогичную функцию с типом `Reservation -> int option`. Обычно, это делается ближе к границе приложения, но следующий пример демонстрирует, как внедрить операции с базой данных в функцию.

``` fsharp
module  =
    // string -> DateTimeOffset -> Reservation list
    let readReservations connectionString date = // ..
    // string -> Reservation -> int
    let createReservation connectionString reservation = // ..
```

Функция `readReservations` принимает строку подключения и дату и возвращает список бронирований на эту дату. Функция `createReservation` также принимает строку подключения и новое бронирование. Когда функция `createReservation` вызывается, то она создаёт новую запись и возвращает её ID. Такой подход нарушает CQS, поэтому можете рассмотреть [альтернативы](https://blog.ploeh.dk/2016/05/06/cqs-and-server-generated-entity-ids).

Если частично реализовать эти функции с валидной строкой подключения, то обе реализации будут соответствовать типам аргументов `tryAccept`. Это значит, что можно создать новую функцию:

``` fsharp
// Reservation -> int option
let tryAcceptComposition =
    let read = DB.readReservations connectionString  
    let create = DB.createReservation connectionString 
    tryAccept 10 read create
```

Функция `tryAccept` теперь частично реализована. Ей передаются только аргументы, соответствующие зависимостям из примера на C#, поэтому возвращаемое значение — функция, которая "ожидает" последний аргумент - бронирование. Как указано в комментарии над функцией в коде, тип возвращаемой функции `Reservation -> int option`.

## Эквивалентность

Частичная реализация функций используемая так - эквивалент внедрению зависимостей. Чтобы понять это, рассмотрим сгенерированный промежуточный код (IL).

F# - это язык платформы .NET, то есть он компилируется в IL. Можно декомпилировать этот IL в C# чтобы понять что происходит. Если сделать это с функцией `tryAcceptComposition`, то получим следующее:

``` csharp
internal class tryAcceptComposition@17 : FSharpFunc<Reservation, FSharpOption<int>>
{
    public int capacity;
    public FSharpFunc<Reservation, int> createReservation;
    public FSharpFunc<DateTimeOffset, FSharpList<Reservation>> readReservations;

    internal tryAcceptComposition@17(
    int capacity,
    FSharpFunc<DateTimeOffset, FSharpList<Reservation>> readReservations,
    FSharpFunc<Reservation, int> createReservation)
    {
        this.capacity = capacity;
        this.readReservations = readReservations;
        this.createReservation = createReservation;
    }

    public override FSharpOption<int>(Reservation reservation)
    {
        return MaîtreD.tryAccept<int>(
        this.capacity, this.readReservations, this.createReservation, reservation);
    }
}
```

Я немного почистил код, по большей части удалив все атрибуты. Заметьте, что это класс, у которого есть поля и конструктор, который принимает аргументы и сохраняет их в поля. Да это же *внедрение через конструктор*!

Частичная реализация функций — это внедрение зависимостей. Этот код компилируется и работает так, как предполагалось. Но является ли этот код функциональным?

## Оценка

Люди часто спрашивают меня: *Как понять, что мой код на F# функциональный?*

Я сам иногда задаюсь таким вопросом, но, к сожалению, каким бы хорошим языком F# не был, он мало чем помогает в том, чтобы ответить на этот вопрос. Его акцент делается на функциональном программировании, но он допускает мутабельность, объектно-ориентированное программирование и даже процедурное программирование. Это дружелюбный язык, прощающий ошибки, что делает его отличным функциональным языком для начинающих, потому что позволяет изучить концепции функционального программирования по частям.

С другой стороны, есть Haskell — строго функциональный язык. В Haskell можно писать код только в функциональном стиле.

К счастью, F# и Haskell довольно похожи, поэтому код на F# можно легко портировать на Haskell, при условии, что код на F# уже "достаточно функционален". Для того, чтобы оценить насколько мой код на F# функционален, я иногда переношу его на Haskell. Если я могу скомпилировать полученный код и запустить, я считаю это подтверждением того, что мой код функционален.

Я уже [показывал пример](https://blog.ploeh.dk/2016/03/18/functional-architecture-is-ports-and-adapters), похожий на этот, но всё же повторюсь. Будут ли работать функции `tryAccept` и `tryAcceptComposition` переписанные на Haskell?

Переписать функцию `tryAccept` — легко:

``` haskell
tryAccept :: Int -> (ZonedTime -> [Reservation]) -> (Reservation -> Int) -> Reservation -> Maybe Int
tryAccept capacity readReservations createReservation reservation =
    let reservedSeats = sum $ map quantity $ readReservations $ date reservation
    in  if reservedSeats + quantity reservation <= capacity
        then Just $ createReservation $ reservation { isAccepted = True }
        else Nothing
```

Очевидно, что тут есть отличия, но я уверен, что можно также заметить и схожие моменты. Главная особенность этой функции в том, что она [чистая](https://en.wikipedia.org/wiki/Pure_function). Все функции в Haskell чистые по-умолчанию, только если явно не объявить их нечистыми, но это явно не наш случай. Функция `tryAccept` — чистая, также как и `readReservations` и `createReservation`.

Версия `tryAccept` написанная на Haskell компилируется, но что насчёт `tryAcceptComposition`?

Как и в коде на F#, цель следующего примера увидеть, возможно ли "внедрить" функцию которая работает с базой данных. Код модуля `DB` на Haskell, эквивалентный примеру на F#:

``` haskell
readReservations :: ConnectionString -> ZonedTime -> IO [Reservation]
readReservations connectionString date = -- ..

createReservation :: ConnectionString -> Reservation -> IO Int
createReservation connectionString reservation = -- ..
```

Операции с базой данных по определению не могут быть чистыми и Haskell превосходно моделирует это при помощи системы типов. Можно заметить, что функции возвращают значения типа `IO`.

Если частично реализовать обе функции с валидной строкой подключения, то останется тип `IO`. Выражение `DB.readReservations connectionString` имеет тип `ZonedTime -> IO [Reservation]`, а `DB.createReservation connectionString` — `Reservation -> IO Int`. Можно попытаться передать `read` и `create` в `tryAccept`, но их типы не совпадают с тем, что ожидает получить `tryAccept`.

``` haskell
tryAcceptComposition :: Reservation -> IO (Maybe Int)
tryAcceptComposition reservation =
    let read   = DB.readReservations  connectionString
        create = DB.createReservation connectionString
    in tryAccept 10 read create reservation
```

Такой код не скомпилируется, потому что операции с базой данных не являются чистыми, а `tryAccept` ожидает чистые функции.

Короче говоря, частичная реализация функций используемая для внедрения зависимостей не является функциональной.

## Резюме

Частичная реализация функций в F# может быть использована для создания результата, эквивалентного внедрению зависимостей. Такой код компилируется и работает как предполагалось, но не является функциональным. Причина этого в том, что (большинство) зависимостей по своей природе не являются чистыми. Они либо недетерминированы, либо имеют побочные эффекты или всё сразу, и это часто ключевая причина того, что они в первую очередь учитываются как зависимости.

Чистые функции не могут вызывать нечистые функции. Если они это делают, то они сами становятся нечистыми. Это правило реализовано в Haskell, но не в F#.

Когда вы внедряете нечистые операции в функцию F#, эта функция тоже становится нечистой. Внедрение зависимостей делает нечистым всё, что объясняет почему такой подход не функционален.

Функциональное программирование решает проблему разделения побочных эффектов от бизнес логики другим путём. Это тема следующей статьи.

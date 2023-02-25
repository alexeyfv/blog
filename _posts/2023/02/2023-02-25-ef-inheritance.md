---
layout: post
title: "Impact of EF mapping strategy on SQL queries performance"
date: 2023-02-25
tags: csharp efcore sqlserver
---

Entity Framework (EF) is a popular object-relational mapping framework used to interact with databases in .NET applications. EF offers different mapping strategies, each of which affects the database schema and how EF interacts with the hierarchy of .NET types. In this article, we will examine how these mapping strategies affects performance in SQL Server.

## Mapping strategies in Entity Framework

The official Microsoft documentation [describes](https://learn.microsoft.com/en-us/ef/core/modeling/inheritance) 3 mapping strategies:

- Table-per-hierarchy (TPH);
- Table-per-class (TPC);
- Table-per-type (TPT).

In my experience, I have also encountered another mapping strategy that I refer to as `TPH with JSON`. The main idea behind this strategy is to convert properties from the derived classes to a JSON payload and add a discriminator column, similar to the default `TPH` strategy.

Let's have a look at the hierarchy below:

``` csharp
public class Root
{
    // Root properties
}

public class ChildA : Root
{
    // ChildA propertie
}

public class ChildB : Root
{
    // ChildB properties
}

public class ChildC : Root
{
    // ChildC properties
}
```

The database schemas for this hierarchy will be as follows:

| TPH                                                                                                 | TPC                                                                                                 | TPT                                                                                                 | TPH with JSON                                                                                           |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| <img src="{{site.baseurl}}/assets/2023/02/2023-02-25-ef-inheritance/diagram-tph.png" alt="content"> | <img src="{{site.baseurl}}/assets/2023/02/2023-02-25-ef-inheritance/diagram-tpc.png" alt="content"> | <img src="{{site.baseurl}}/assets/2023/02/2023-02-25-ef-inheritance/diagram-tpt.png" alt="content"> | <img src="{{site.baseurl}}/assets/2023/02/2023-02-25-ef-inheritance/diagram-tphjson.png" alt="content"> |

As shown below:

- `TPH` table contains all the properties from all the types.
- `TPC` child tables are non related to the parent `Roots` table.
- `TPT` child tables contains only type specific columns and related to the parent `Roots` table.
- `TPH with JSON` looks very similar to plain `TPH`, except all the columns for child properties replaced by one JSON column `Payload`. Column `PayloadType` corresponds to `Discriminator` column in `TPH`.

Now let's find out how all these mapping strategies affect on performance in SQL Server.

## Benchmark

The benchmark project has [4 instances](https://github.com/alexeyfv/ef-inheritance/blob/master/src/Demo/Contexts/Contexts.cs) of `DbContext` for each kind of mapping strategy. `TPH`, `TPC` and `TPT` are pretty simple. `TPH with JSON` requires [additional wrapper class](https://github.com/alexeyfv/ef-inheritance/blob/master/src/Demo/Models/Models.cs) to transform child DB objects to JSON payload:

``` csharp
public class RootWrapper : Root
{
    public string Payload { get; set; } = string.Empty;

    [NotMapped]
    public Root OriginalEntity
    {
        get
        {
            // code for deserializing JSON to ChildA, ChildB or ChildC
        }
        set
        {
            // code for serializing ChildA, ChildB or ChildC to JSON 
        }
    }


    public PayloadTypes PayloadType { get; set; }

    public enum PayloadTypes
    {
        Root,
        ChildA,
        ChildB,
        ChildC,
    }
}
```

I also used [`Bogus`](https://www.nuget.org/packages/Bogus) library for [generating fake data](https://github.com/alexeyfv/ef-inheritance/blob/master/src/Demo/Fakers/Fakers.cs) and [`BenchmarkDotNet`](https://www.nuget.org/packages/BenchmarkDotNet) library for [benchmarking itself](https://github.com/alexeyfv/ef-inheritance/tree/master/src/Demo/Benchmarks/Default).

There are 2 benchmarks in the projects - for [`INSERT`](https://github.com/alexeyfv/ef-inheritance/blob/master/src/Demo/Benchmarks/Default/InsertBenchmark.cs) and [`SELECT`](https://github.com/alexeyfv/ef-inheritance/blob/master/src/Demo/Benchmarks/Default/SelectBenchmark.cs) data. I didn't test `UPDATE` and `DELETE` because it requires to specify the filter predicate and it's little bit complicated due to randomized fake data.

### Results

Here are the benchmark [results](https://github.com/alexeyfv/ef-inheritance/tree/master/src/Demo/BenchmarkDotNet.Artifacts). As we can see from the figures below, `TPT` has the worst performance for `SELECT` as well as `INSERT`. This strategy is about 40-60% slower than `TPH` which is default for EF. `TPC` performs slightly better in selecting data, but slightly worse in inserting data compared to `TPH`. The most interesting fact is that `TPH with JSON` performance better than `TPH` performance.

<div class="glide">
  <div class="glide__track" data-glide-el="track">
    <ul class="glide__slides" style="padding-left: 0px">
      <li class="glide__slide">
        <img src="{{site.baseurl}}/assets/2023/02/2023-02-25-ef-inheritance/mapping-strategies-insert-ratio-entities.png" alt="Image 1">
        <strong>Figure 1 - Execution time for inserting data</strong>
      </li>
      <li class="glide__slide">
        <img src="{{site.baseurl}}/assets/2023/02/2023-02-25-ef-inheritance/mapping-strategies-select-ratio-entities.png" alt="Image 2">
        <strong>Figure 2 - Execution time for selecting data</strong>
      </li>
    </ul>
  </div>
  <div class="glide__arrows" data-glide-el="controls">
    <button class="glide__arrow glide__arrow--left" data-glide-dir="<"><</button>
    <button class="glide__arrow glide__arrow--right" data-glide-dir=">">></button>
  </div>
</div>

## `TPH` vs `TPH with JSON`

I was curious why `TPH with JSON` shows better performance that `TPH`, so I another benchmark. This benchmark [uses](https://github.com/alexeyfv/ef-inheritance/tree/master/src/Demo/Contexts) instances of `DbContext` with entities that have 3, 5, 8, 13 and 21 properties for each type of mapping strategy (10 in total).

As we can see from figure 3 and 4, `TPH with JSON` strategy has almost the same insertion time, while the `TPH` execution time increases with both the number of properties and the number of entities.

<div class="glide">
  <div class="glide__track" data-glide-el="track">
    <ul class="glide__slides" style="padding-left: 0px">
      <li class="glide__slide">
        <img src="{{site.baseurl}}/assets/2023/02/2023-02-25-ef-inheritance/tph-vs-tphjson-insert.png" />
        <strong>Figure 3 - Dependence of inserting time on the number of entities and the number of properties</strong>
      </li>
      <li class="glide__slide">
        <img src="{{site.baseurl}}/assets/2023/02/2023-02-25-ef-inheritance/tph-vs-tphjson-insert-ratio-entities.png" />
        <strong>Figure 4 - Ratio of `TPH` execution time to `TPH with JSON` execution time for inserting data</strong>
      </li>
      <li class="glide__slide">
        <img src="{{site.baseurl}}/assets/2023/02/2023-02-25-ef-inheritance/tph-vs-tphjson-insert-ratio-props.png" />
        <strong>Figure 5 - Ratio of `TPH` execution time to `TPH with JSON` execution time for inserting data</strong>
      </li>
    </ul>
  </div>
  <div class="glide__arrows" data-glide-el="controls">
    <button class="glide__arrow glide__arrow--left" data-glide-dir="<"><</button>
    <button class="glide__arrow glide__arrow--right" data-glide-dir=">">></button>
  </div>
</div>

Apparently, `TPH` has worse performance due to two things:

1. EF Core creates separate `INSERT` queries for each of type in the hierarchy.
2. EF Core creates parameters for each property.

In this particular example, EF Core created 4 `INSERT` queries and 82 parameters:

``` sql
INSERT INTO [tph21].[Roots] ([ChildAProp1], [ChildAProp10], [ChildAProp11], [ChildAProp12], [ChildAProp13], [ChildAProp14], [ChildAProp15], [ChildAProp16], [ChildAProp17], [ChildAProp18], [ChildAProp19], [ChildAProp2], [ChildAProp20], [ChildAProp21], [ChildAProp3], [ChildAProp4], [ChildAProp5], [ChildAProp6], [ChildAProp7], [ChildAProp8], [ChildAProp9], [Discriminator], [RootProp1], [RootProp2], [RootProp3], [RootProp4])
OUTPUT INSERTED.[Id]
VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12, @p13, @p14, @p15, @p16, @p17, @p18, @p19, @p20, @p21, @p22, @p23, @p24, @p25);

INSERT INTO [tph21].[Roots] ([ChildBProp1], [ChildBProp10], [ChildBProp11], [ChildBProp12], [ChildBProp13], [ChildBProp14], [ChildBProp15], [ChildBProp16], [ChildBProp17], [ChildBProp18], [ChildBProp19], [ChildBProp2], [ChildBProp20], [ChildBProp21], [ChildBProp3], [ChildBProp4], [ChildBProp5], [ChildBProp6], [ChildBProp7], [ChildBProp8], [ChildBProp9], [Discriminator], [RootProp1], [RootProp2], [RootProp3], [RootProp4])
OUTPUT INSERTED.[Id]
VALUES (@p26, @p27, @p28, @p29, @p30, @p31, @p32, @p33, @p34, @p35, @p36, @p37, @p38, @p39, @p40, @p41, @p42, @p43, @p44, @p45, @p46, @p47, @p48, @p49, @p50, @p51);

INSERT INTO [tph21].[Roots] ([ChildCProp1], [ChildCProp10], [ChildCProp11], [ChildCProp12], [ChildCProp13], [ChildCProp14], [ChildCProp15], [ChildCProp16], [ChildCProp17], [ChildCProp18], [ChildCProp19], [ChildCProp2], [ChildCProp20], [ChildCProp21], [ChildCProp3], [ChildCProp4], [ChildCProp5], [ChildCProp6], [ChildCProp7], [ChildCProp8], [ChildCProp9], [Discriminator], [RootProp1], [RootProp2], [RootProp3], [RootProp4])
OUTPUT INSERTED.[Id]
VALUES (@p52, @p53, @p54, @p55, @p56, @p57, @p58, @p59, @p60, @p61, @p62, @p63, @p64, @p65, @p66, @p67, @p68, @p69, @p70, @p71, @p72, @p73, @p74, @p75, @p76, @p77);
     
INSERT INTO [tph21].[Roots] ([Discriminator], [RootProp1], [RootProp2], [RootProp3], [RootProp4])
OUTPUT INSERTED.[Id]
VALUES (@p78, @p79, @p80, @p81, @p82);
```

For `TPH with JSON` EF Core created only one `INSERT` query because all types in hierarchy were converted into single wrapper class. The number of parameters is 23 which is also almost 4 times less:

``` sql
MERGE [tphjson21].[Roots] USING (
VALUES (@p0, @p1, @p2, @p3, @p4, @p5, 0),(@p6, @p7, @p8, @p9, @p10, @p11, 1),(@p12, @p13, @p14, @p15, @p16, @p17, 2),(@p18, @p19, @p20, @p21, @p22, @p23, 3)) AS i ([Payload], [PayloadType], [RootProp1], [RootProp2], [RootProp3], [RootProp4], _Position) ON 1=0
WHEN NOT MATCHED THEN
INSERT ([Payload], [PayloadType], [RootProp1], [RootProp2], [RootProp3], [RootProp4])
VALUES (i.[Payload], i.[PayloadType], i.[RootProp1], i.[RootProp2], i.[RootProp3], i.[RootProp4])
OUTPUT INSERTED.[Id], i._Position;
```

The situation for selecting data is a bit different. According to the benchmark results, `TPH` is slightly worse than `TPH with JSON` when properties count is less than 8. For all other cases, `TPH` has better execution time.

<div class="glide">
  <div class="glide__track" data-glide-el="track">
    <ul class="glide__slides" style="padding-left: 0px">
      <li class="glide__slide">
        <img src="{{site.baseurl}}/assets/2023/02/2023-02-25-ef-inheritance/tph-vs-tphjson-select.png" />
        <strong>Figure 6 - Dependence of selecting time on the number of entities and the number of properties</strong>
      </li>
      <li class="glide__slide">
        <img src="{{site.baseurl}}/assets/2023/02/2023-02-25-ef-inheritance/tph-vs-tphjson-select-ratio-entities.png" />
        <strong>Figure 7 - Ratio of `TPH` execution time to `TPH with JSON` execution time for selecting data</strong>
      </li>
      <li class="glide__slide">
        <img src="{{site.baseurl}}/assets/2023/02/2023-02-25-ef-inheritance/tph-vs-tphjson-select-ratio-props.png" />
        <strong>Figure 8 - Ratio of `TPH` execution time to `TPH with JSON` execution time for selecting data</strong>
      </li>
    </ul>
  </div>
  <div class="glide__arrows" data-glide-el="controls">
    <button class="glide__arrow glide__arrow--left" data-glide-dir="<"><</button>
    <button class="glide__arrow glide__arrow--right" data-glide-dir=">">></button>
  </div>
</div>

For both mapping strategies, EF Core created a single `SELECT` query. The only difference is in columns count. It seems that JSON serialization can only affect performance with a relatively large number of properties.

``` sql
SELECT [r].[Id], [r].[Discriminator], [r].[RootProp1], [r].[RootProp2], [r].[RootProp3], [r].[RootProp4], [r].[ChildAProp1], [r].[ChildAProp10], [r].[ChildAProp11], [r].[ChildAProp12], [r].[ChildAProp13], [r].[ChildAProp14], [r].[ChildAProp15], [r].[ChildAProp16], [r].[ChildAProp17], [r].[ChildAProp18], [r].[ChildAProp19], [r].[ChildAProp2], [r].[ChildAProp20], [r].[ChildAProp21], [r].[ChildAProp3], [r].[ChildAProp4], [r].[ChildAProp5], [r].[ChildAProp6], [r].[ChildAProp7], [r].[ChildAProp8], [r].[ChildAProp9], [r].[ChildBProp1], [r].[ChildBProp10], [r].[ChildBProp11], [r].[ChildBProp12], [r].[ChildBProp13], [r].[ChildBProp14], [r].[ChildBProp15], [r].[ChildBProp16], [r].[ChildBProp17], [r].[ChildBProp18], [r].[ChildBProp19], [r].[ChildBProp2], [r].[ChildBProp20], [r].[ChildBProp21], [r].[ChildBProp3], [r].[ChildBProp4], [r].[ChildBProp5], [r].[ChildBProp6], [r].[ChildBProp7], [r].[ChildBProp8], [r].[ChildBProp9], [r].[ChildCProp1], [r].[ChildCProp10], [r].[ChildCProp11], [r].[ChildCProp12], [r].[ChildCProp13], [r].[ChildCProp14], [r].[ChildCProp15], [r].[ChildCProp16], [r].[ChildCProp17], [r].[ChildCProp18], [r].[ChildCProp19], [r].[ChildCProp2], [r].[ChildCProp20], [r].[ChildCProp21], [r].[ChildCProp3], [r].[ChildCProp4], [r].[ChildCProp5], [r].[ChildCProp6], [r].[ChildCProp7], [r].[ChildCProp8], [r].[ChildCProp9]
FROM [tph21].[Roots] AS [r]
```

``` sql
SELECT [r].[Id], [r].[Payload], [r].[PayloadType], [r].[RootProp1], [r].[RootProp2], [r].[RootProp3], [r].[RootProp4]
FROM [tphjson21].[Roots] AS [r]
```

## Conclusion

In conclusion, the benchmark conducted in this article sheds light on the differences between various mapping strategies in EF Core. The summarized results are presented in the table below.

| Place | Mapping strategy | Pros                                                                                                                                | Cons                                                                                                                                                                                                                          |
| ----- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `TPH with JSON`  | Better performance when inserting and selecting data compared to other strategies almost in all cases                                      | - Requires additional coding to implement wrapper class <br> - Worse that `TPH` in selecting data from tables with relatively large number of columns <br> - Requires the creation of computed columns to create JSON indexes |
| 1     | `TPH`            | - Default EF Core strategy that doesn't require any additional configuration <br> - Relatively good performance almost in all cases | Performance degradation when there are many types in hierarchy                                                                                                                                                                |
| 2     | `TPC`            | Slightly better than `TPH` in inserting data                                                                                        | Slightly worse than `TPH` in selecting data                                                                                                                                                                                   |
| 3     | `TPT`            | ???                                                                                                                                 | The worst performance in all cases                                                                                                                                                                                            |

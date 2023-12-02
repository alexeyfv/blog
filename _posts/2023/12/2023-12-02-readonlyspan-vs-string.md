---
layout: post
title: "What is ReadOnlySpan<T> in C# and how fast is it comparing to strings?"
date: 2023-12-02
tags: csharp benchmark
---

I already wrote an article about the fastest way of extracting substrings in C#. Now I want to investigate Span structures more. Recently, Microsoft released the .NET 8 platform which has several new [extension methods](https://learn.microsoft.com/en-us/dotnet/api/system.memoryextensions?view=net-8.0) for `ReadOnlySpan<T>`. So I want to compare the performance of `MemoryExtensions` methods with counterparts in string class.

## Benchmark

All the benchmarks use a JSON-file with a string array of size 135 892 elements. Each array element represents the different permissions for different folders. Strings has the following template:

```
<permission> for Folder: \\server-name\path\to\folder\
```

For example:

```
DENY Permission for Folder: \\server-name\path\to\folder\
```

My employer won't be happy if I share the file, so you should trust me that this file contains such data. :)

In this benchmark, we'll consider the following 8 methods:

| `string`                                                                                                     | `ReadOnlySpan<T>`                                                                                             |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| [Contains](https://learn.microsoft.com/en-us/dotnet/api/system.string.contains?view=net-8.0)                 | [Contains](https://learn.microsoft.com/en-us/dotnet/api/system.memoryextensions.contains?view=net-8.0)        |
| [StartsWith](https://learn.microsoft.com/en-us/dotnet/api/system.string.startswith?view=net-8.0)             | [StartsWith](https://learn.microsoft.com/en-us/dotnet/api/system.memoryextensions.startswith?view=net-8.0)    |
| [IndexOf](https://learn.microsoft.com/en-us/dotnet/api/system.string.indexof?view=net-8.0)                   | [IndexOf](https://learn.microsoft.com/en-us/dotnet/api/system.memoryextensions.indexof?view=net-8.0)          |
| [Replace](https://learn.microsoft.com/en-us/dotnet/api/system.string.replace?view=net-8.0)                   | [Replace](https://learn.microsoft.com/en-us/dotnet/api/system.memoryextensions.replace?view=net-8.0)          |
| [Split](https://learn.microsoft.com/en-us/dotnet/api/system.string.split?view=net-8.0)                       | [Split](https://learn.microsoft.com/en-us/dotnet/api/system.memoryextensions.split?view=net-8.0)              |
| [ToLowerInvariant](https://learn.microsoft.com/en-us/dotnet/api/system.string.tolowerinvariant?view=net-8.0) | [ToLowerInvariant](https://learn.microsoft.com/en-us/dotnet/api/system.memoryextensions.tolower?view=net-8.0) |
| [Trim](https://learn.microsoft.com/en-us/dotnet/api/system.string.trim?view=net-8.0)                         | [Trim](https://learn.microsoft.com/en-us/dotnet/api/system.memoryextensions.trim?view=net-8.0)                |
| [Substring](https://learn.microsoft.com/en-us/dotnet/api/system.string.substring?view=net-8.0)               | [Slice](https://learn.microsoft.com/en-us/dotnet/api/system.span-1.slice?view=net-8.0)                        |

In the context of Span-based methods, we also take into account the \"Span + Allocation\" scenario, which involves string allocation using the ToString method where applicable. This scenario arises when Span-based methods are initially used, but the ultimate outcome includes the allocation of a string through the ToString method.

As usual, for benchmarking, I used the [BenchmarkDotNet](https://github.com/dotnet/BenchmarkDotNet) library. The whole code of the benchmark class can be found [here](https://gitlab.com/alexeyfv/readonlyspan-vs-string).

## Results

### Contains

The benchmark assesses whether each string in the provided collection contains the backslash character.

| **Benchmark**     | **Mean execution time, μs** | **Execution time ratio** | **Gen 0 collections per 1000 operations** | **Allocated memory, bytes** | **Allocated ratio** |
| ----------------- | --------------------------- | ------------------------ | ----------------------------------------- | --------------------------- | ------------------- |
| `String`          | 615.7                       | --                       | 0                                         | 1                           | --                  |
| `ReadOnlySpan<T>` | 624.1                       | -2%                      | 0                                         | 1                           | --                  |

### StartsWith

The benchmark evaluates whether each string in the given collection starts with the specified substring.

| **Benchmark**     | **Mean execution time, μs** | **Execution time ratio** | **Gen 0 collections per 1000 operations** | **Allocated memory, bytes** | **Allocated ratio** |
| ----------------- | --------------------------- | ------------------------ | ----------------------------------------- | --------------------------- | ------------------- |
| `String`          | 56 681.1                    | --                       | 0                                         | 82                          | --                  |
| `ReadOnlySpan<T>` | 329.6                       | -99.4%                   | 0                                         | 0                           | -100%               |

### IndexOf

The benchmark retrieves the index of the substring \"Folder\" within each string in the given collection.

| **Benchmark**     | **Mean execution time, μs** | **Execution time ratio** | **Gen 0 collections per 1000 operations** | **Allocated memory, bytes** | **Allocated ratio** |
| ----------------- | --------------------------- | ------------------------ | ----------------------------------------- | --------------------------- | ------------------- |
| `String`          | 224 182.4                   | --                       | 0                                         | 245                         | --                  |
| `ReadOnlySpan<T>` | 1 131.6                     | -99.5%                   | 0                                         | 1                           | -99.6%              |

### Split

This benchmark, designed as a synthetic test, utilizes the Split method to determine the maximum number of substrings between separators in each string within the provided collection.

| **Benchmark**     | **Mean execution time, μs** | **Execution time ratio** | **Gen 0 collections per 1000 operations** | **Allocated memory, bytes** | **Allocated ratio** |
| ----------------- | --------------------------- | ------------------------ | ----------------------------------------- | --------------------------- | ------------------- |
| `String`          | 16 241.3                    | --                       | 4468.75                                   | 56 127 351                  | --                  |
| `ReadOnlySpan<T>` | 9 977.2                     | -39%                     | 0                                         | 1060                        | -100%               |

### Replace

These benchmarks focus on replacing backslashes with forward slashes in each string within the provided collection, using different methods for string manipulation.

| **Benchmark**                     | **Mean execution time, μs** | **Execution time ratio** | **Gen 0 collections per 1000 operations** | **Allocated memory, bytes** | **Allocated ratio** |
| --------------------------------- | --------------------------- | ------------------------ | ----------------------------------------- | --------------------------- | ------------------- |
| `String`                          | 3 156.8                     | --                       | 2019.53                                   | 25 353 195                  | --                  |
| `ReadOnlySpan<T>`                 | 2 663.0                     | -16%                     | 0                                         | 3                           | -100%               |
| `ReadOnlySpan<T>` with allocation | 16 701.5                    | +430%                    | 2015.62                                   | 25 353 204                  | -0%                 |

### ToLowerInvariant

These benchmarks focus on converting each string within the provided collection to lowercase, utilizing different methods for case transformation.

| **Benchmark**                     | **Mean execution time, μs** | **Execution time ratio** | **Gen 0 collections per 1000 operations** | **Allocated memory, bytes** | **Allocated ratio** |
| --------------------------------- | --------------------------- | ------------------------ | ----------------------------------------- | --------------------------- | ------------------- |
| `String`                          | 3 771.3                     | --                       | 2019.53                                   | 25 353 195                  | --                  |
| `ReadOnlySpan<T>`                 | 3 884.3                     | +3%                      | 0                                         | 3                           | -100%               |
| `ReadOnlySpan<T>` with allocation | 17 938.6                    | +374%                    | 2015.62                                   | 25 353 204                  | -0%                 |

### Trim

These benchmarks focus on trimming trailing backslashes from the specified substring in each string within the provided collection, utilizing various approaches to achieve the desired result.

| **Benchmark**                     | **Mean execution time, μs** | **Execution time ratio** | **Gen 0 collections per 1000 operations** | **Allocated memory, bytes** | **Allocated ratio** |
| --------------------------------- | --------------------------- | ------------------------ | ----------------------------------------- | --------------------------- | ------------------- |
| `String`                          | 687.4                       | --                       | --                                        | 553                         | --                  |
| `ReadOnlySpan<T>`                 | 469.1                       | -32%                     | --                                        | --                          | -99.8%              |
| `ReadOnlySpan<T>` with allocation | 2 968.1                     | +332%                    | 2019.53                                   | 25 353 195                  | +4 584 565%         |

### Substring

These benchmarks focus on extracting a substring between specific markers in each string within the provided collection, using different methods to achieve the desired substring extraction.

| **Benchmark**                     | **Mean execution time, μs** | **Execution time ratio** | **Gen 0 collections per 1000 operations** | **Allocated memory, bytes** | **Allocated ratio** |
| --------------------------------- | --------------------------- | ------------------------ | ----------------------------------------- | --------------------------- | ------------------- |
| `String`                          | 1 523.8                     | --                       | 779.3                                     | 9784225                     | --                  |
| `ReadOnlySpan<T>`                 | 347.9                       | -77%                     | --                                        | --                          | -100%               |
| `ReadOnlySpan<T>` with allocation | 1 694.5                     | +11%                     | 779.3                                     | 9784225                     | +0%                 |

## Conclusion

### `ReadOnlySpan<T>` without allocation

<img src="{{site.baseurl}}/assets/2023/12/2023-12-02-readonlyspan-vs-string/image1.png" alt="content">
<strong>ReadOnlySpan execution ratio</strong>

As we can see from the figure above, almost all extension methods for `ReadOnlySpan<T>` are faster than analogues from string class. The only exception is the `ReadOnlySpan<T>.ToLower` method. I assume that It is because [this method copies the characters from the source span into the destination](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/MemoryExtensions.Globalization.cs#L223).

### `ReadOnlySpan<T>` with allocation

<img src="{{site.baseurl}}/assets/2023/12/2023-12-02-readonlyspan-vs-string/image2.png" alt="content">
<strong>ReadOnlySpan with allocation execution ratio</strong>

The string.Replace, string.ToLower, string.TrimEnd, string.Substring methods outperform the combination of `ReadOnlySpan<T>` methods and [`ReadOnlySpan<T>.ToString`](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/ReadOnlySpan.cs#L332). This difference is likely due to efficient implementations of these methods. For example, invoking the [`string.TrimEnd`](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/String.Manipulation.cs#L2198) leads to a call of the [`Buffer.Memmove`](https://github.com/microsoft/referencesource/blob/master/mscorlib/system/buffer.cs#L299) method. It appears that the string allocation process using `Buffer.Memmove` is more efficient than the implementation of `ReadOnlySpan<T>.ToString`.

### Memory consumption

Span-based methods exhibit superior memory efficiency, with zero memory allocations and no observed Gen 0 collections. String methods, particularly in operations like `Split`, `Replace`, and `ToLower`, tend to incur more significant memory allocations and, in some cases, Gen 0 collections. Therefore, for memory-conscious applications, utilizing Span-based methods may offer performance advantages in terms of reduced memory footprint and improved garbage collection behavior.

Notice almost the same or even worse results for the "Span + Allocation" column. Despite the utilization of Span-based methods in the intermediate steps, the inclusion of string allocation in the final outcome appears to negate some of the memory efficiency gained by using Span. This indicates that, in this specific context, the allocation of strings during or after Span-based operations may mitigate the potential memory benefits associated with using Span.

Generation 0 collections per 1000 operations

| Categories   | String    | Span | Span + Allocation |
| ------------ | --------- | ---- | ----------------- |
| `Contains`   | 0         | 0    | -                 |
| `StartsWith` | 0         | 0    | -                 |
| `IndexOf`    | 0         | 0    | -                 |
| `Split`      | 4468.75   | 0    | -                 |
| `Replace`    | 2019.5313 | 0    | 2015.625          |
| `ToLower`    | 2019.5313 | 0    | 2015.625          |
| `Trim`       | 1333.3333 | 0    | 2019.5313         |
| `Substring`  | 779.3     | 0    | 779.3             |

Memory allocated, Mb

| Categories   | String | Span | Span + Allocation |
| ------------ | ------ | ---- | ----------------- |
| `Contains`   | 0.00   | 0.00 | -                 |
| `StartsWith` | 0.00   | 0.00 | -                 |
| `IndexOf`    | 0.00   | 0.00 | -                 |
| `Split`      | 53.53  | 0.00 | -                 |
| `Replace`    | 24.18  | 0.00 | 24.18             |
| `ToLower`    | 24.18  | 0.00 | 24.18             |
| `Trim`       | 0.00   | 0.00 | 24.17             |
| `Substring`  | 9.33   | 0.00 | 9.33              |

## Further reading

1. [MemoryExtensions Class](https://learn.microsoft.com/en-us/dotnet/api/system.memoryextensions?view=net-8.0).
2. [Spanification](https://adamsitnik.com/files/Spanification_Prague.pdf).
3. [Pro .NET Memory Management](https://prodotnetmemory.com/).

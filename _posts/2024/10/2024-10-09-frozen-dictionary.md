---
layout: post
title: "FrozenDictionary under the hood: how fast is it comparing to Dictionary and why"
date: 2024-10-09
tags: csharp benchmark hashtable algorithms
excerpt_separator: <!--more-->
---

With [.NET 8 release](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8/runtime#performance-focused-types), C# developers received a new type of generic collections – `FrozenDictionary`. The main feature of this dictionary is that it’s immutable, but allows reading the data faster comparing to a plain `Dictionary`. I split the results on the cover by a reason: the algorithms used in `FrozenDictionary` are highly depended on key type, the size of the array or even the number of the string keys with the same length. In this article, we’ll look into details how fast is `FrozenDictionary` and why.

<img src="{{site.baseurl}}/assets/2024/10/2024-10-09-frozen-dictionary/image01.png" alt="content">

*Версия на русском [тут]({{site.baseurl}}/2024/08/22/frozen-dictionary.html)*.

<!--more-->

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Before we get started](#before-we-get-started)
- [Disclaimer](#disclaimer)
- [Group 1. Default dictoinaries](#group-1-default-dictoinaries)
  - [Search algorithm](#search-algorithm)
  - [Benchmark](#benchmark)
- [Group 2. Dictionary for Int32 keys](#group-2-dictionary-for-int32-keys)
  - [Search algorithm](#search-algorithm-1)
  - [Benchmark](#benchmark-1)
- [Group 3. Dictionary with bucket sort algorithm](#group-3-dictionary-with-bucket-sort-algorithm)
  - [Search algorithm](#search-algorithm-2)
  - [Benchmark](#benchmark-2)
- [Group 4. Dictionary with string keys](#group-4-dictionary-with-string-keys)
  - [Search algorithm](#search-algorithm-3)
  - [Benchmark](#benchmark-3)
- [Group 5. Small dictionaries](#group-5-small-dictionaries)
  - [Search algorithm](#search-algorithm-4)
  - [Benchmark](#benchmark-4)
- [Conclusion](#conclusion)

## Before we get started

It’s important to notice, that `FrozenDictionary<TKey, TValue>` is an abstract class with [multiple derived classes](https://github.com/dotnet/runtime/tree/51e99e12a8a09c69e30fdcb004facf68f73173a6/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen). To be precise, there are 18 classes. Instead of explaining which implementation is used when, just look at the diagram in Figure 1.

<img src="{{site.baseurl}}/assets/2024/10/2024-10-09-frozen-dictionary/image02.png" alt="content">
<strong>
Figure 1 – Choosing a FrozenDictionary implementation
</strong>

Don’t be afraid, because all these 18 implementations can be combined into 5 groups:

1. In [DefaultFrozenDictionary](https://github.com/dotnet/runtime/blob/8f74726e77b7ef4c00b90ad852b3917727e11e0c/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/DefaultFrozenDictionary.cs) and [ValueTypeDefaultComparerFrozenDictionary](https://github.com/dotnet/runtime/blob/8f74726e77b7ef4c00b90ad852b3917727e11e0c/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/ValueTypeDefaultComparerFrozenDictionary.cs) a [FrozenHashTable](https://github.com/dotnet/runtime/blob/8f74726e77b7ef4c00b90ad852b3917727e11e0c/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/FrozenHashTable.cs) is used.  
2. In Int32FrozenDictionary the FrozenHashTable is also used, but there is no hash code calculation, because the key is hash code itself.  
3. [LengthBucketsFrozenDictionary](https://github.com/dotnet/runtime/blob/8f74726e77b7ef4c00b90ad852b3917727e11e0c/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/LengthBucketsFrozenDictionary.cs) uses an algorithm which is similar to a [bucket sort](https://en.wikipedia.org/wiki/Bucket_sort).  
4. All 11 [OrdinalStringFrozenDictionary](https://github.com/dotnet/runtime/blob/8f74726e77b7ef4c00b90ad852b3917727e11e0c/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/OrdinalStringFrozenDictionary.cs) implementations are also use FrozenHashTable, but they have a specific hash code calculation algorithm.  
5. [SmallValueTypeComparableFrozenDictionary](https://github.com/dotnet/runtime/blob/8f74726e77b7ef4c00b90ad852b3917727e11e0c/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/SmallValueTypeComparableFrozenDictionary.cs#L18), [SmallValueTypeDefaultComparerFrozenDictionary](https://github.com/dotnet/runtime/blob/8f74726e77b7ef4c00b90ad852b3917727e11e0c/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/SmallValueTypeDefaultComparerFrozenDictionary.cs#L12) and [SmallFrozenDictionary](https://github.com/dotnet/runtime/blob/8f74726e77b7ef4c00b90ad852b3917727e11e0c/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/SmallFrozenDictionary.cs#L18) use linear search, because their size is not greater than 10 elements.

The choosing of the appropriate implementation depends on the multiple parameters and done in [CreateFromDictionary method of a FrozenDictionary static class](https://github.com/dotnet/runtime/blob/51e99e12a8a09c69e30fdcb004facf68f73173a6/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/FrozenDictionary.cs#L113). Now, let’s take a look at each group separately and their algorithms, and run benchmarks.

## Disclaimer

The results of the benchmarks are very conditional. I admit, that the benchmark may show different results on a different computer, with a different CPU, with a different compiler or in a different scenario. Always check your code in your specific conditions and don’t trust to the articles from the internet.

The source code and raw results are located in [this repo](https://github.com/alexeyfv/frozen-dictionary).

## Group 1. Default dictoinaries

As I said earlier, the `FrozehHashTable` structure is used in `DefaultFrozenDictionary` and `ValueTypeDefaultComparerFrozenDictionary`. This structure, as you may guess from its name, is a hash table implementation. For better understanding how `FrozenHashTable` differs from `Dictionary`, need to remember how search is implemented in `Dictionary`. If you already know this part, you may skip the following explanation.

Let’s consider the following dictionary:

``` csharp
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

When, for example, we search a value for `Fruit("fig")` key, the following are happened in `Dictionary` (Figure 2):

1. Calculate the key `hashcode`.  
2. Calculate the index of the bucket (`bucketIndex`).  
3. If the key in the entry is equal to the searchable key, then we return the related value. Otherwise, we go to the next entry and repeat step 3.

<img src="{{site.baseurl}}/assets/2024/10/2024-10-09-frozen-dictionary/image03.png" alt="content">
<strong>
Figure 2 – Search in Dictionary
</strong>

### Search algorithm

`FrozenDictionary` immutability allows working with buckets differently. Since the number of key-value pairs don’t change, it’s possible to:

1. [Select the number of buckets](https://github.com/dotnet/runtime/blob/c788546f9ad43ea17981d5dc9343b00b6f76d98f/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/FrozenHashTable.cs#L47) so that the number of collisions will be [no more than 5%](https://github.com/dotnet/runtime/blob/3eba70227be23baee21c13a7ab9316d58d469b82/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/FrozenHashTable.cs#L151).  
2. Place keys and values in the `_keys` and `_values` ​​arrays, instead of a linked list in the `Dictionary`. This makes search more efficient due to higher data locality.

Using `FrozenDictionary`, searching for a value for the key `Fruit("fig")` would look like this (Figure 3):

1. Calculate the `hashCode` of the key.  
2. Calculate the `bucketIndex`.
3. In a `bucket` array, receive values `start` and `end`. These values are boundaries in a `HashCodes` array.  
4. Iterate the `HashCodes` array from `start` to `end` and search the key. If found, return the value. Otherwise, return null.

<img src="{{site.baseurl}}/assets/2024/10/2024-10-09-frozen-dictionary/image04.png" alt="content">
<strong>
Figure 3 – Search in DefaultFrozenDictionary
</strong>

### Benchmark

The benchmarks results for `DefaultFrozenDictionary` and `ValueTypeDefaultComparerFrozenDictionary` are on Figure 4 and 5.

<img src="{{site.baseurl}}/assets/2024/10/2024-10-09-frozen-dictionary/image05.png" alt="content">
<strong>
Reading speed from ValueTypeDefaultComparerFrozenDictionary comparing to Dictionary
</strong>

<img src="{{site.baseurl}}/assets/2024/10/2024-10-09-frozen-dictionary/image06.png" alt="content">
<strong>
Reading speed from DefaultFrozenDictionary comparing to Dictionary
</strong>

The high search speed in `Dictionary` compared to `ValueTypeDefaultComparerFrozenDictionary` for dictionaries with up to 1000 elements is probably due to aggressive [method inlining](https://en.wikipedia.org/wiki/Inline_function) in Dictionary. I couldn't understand why the limit is exactly 1000 elements, as there’s nothing about this in the [source code](https://github.com/dotnet/runtime/blob/10107d3ca202bf1fda76a1bf575d782be4be27c3/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/Dictionary.cs). It might be related to the JIT compiler’s implementation. If you have any ideas on this, feel free to share them in the comments.

In other cases, `FrozenDictionary` is 31-32% faster for value types and 17-18% faster for reference types.

## Group 2. Dictionary for Int32 keys

`Int32FrozenDictionary` also uses `FrozenHashTable`. The main feature of this class is that if the key type is an integer, its hash is equal to its value, so collisions in such a dictionary are impossible. For example, you can't add two elements with the key 123 – an exception will be thrown.

``` cs
var dict = new Dictionary<int, int>();  
dict.Add(123, 1);  
dict.Add(123, 2); // System.ArgumentException: An item with the same key has already been added.
```

### Search algorithm

This allows skipping the hash calculation during reads and [using the key’s value directly](https://github.com/dotnet/runtime/blob/eb455ec34c6709e487c19e52c29ec712a6fa4d7f/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/Int32/Int32FrozenDictionary.cs#L35). As a result, value lookup works like this (Figure 6):

1. The bucket index is calculated directly from the key's value.  
2. From the `bucket` array, we get the `start` and `end` values, which define the boundaries in the HashCodes array.  
3. We iterate through the `HashCodes` array from `start` to `end`, looking for the target key and return the value when found.

<img src="{{site.baseurl}}/assets/2024/10/2024-10-09-frozen-dictionary/image07.png" alt="content">
<strong>
Figure 6 – Search in Int32FrozenDictionary
</strong>

### Benchmark

Because of optimizations, reading from `Int32FrozenDictionary` is 34-42% faster (Figure 7).

<img src="{{site.baseurl}}/assets/2024/10/2024-10-09-frozen-dictionary/image08.png" alt="content">
<strong>
Figure 7 – Reading speed from Int32FrozenDictionary comparing to Dictionary
</strong>

## Group 3. Dictionary with bucket sort algorithm

When creating "frozen" dictionaries with string keys, `FrozenDictionary` tries to create the `LengthBucketsFrozenDictionary` class. This class is optimized for situations where keys have different lengths. It achieves this by [distributing the keys into buckets](https://github.com/dotnet/runtime/blob/25f82f314b07cc96dd3212ca4ef950b4220516d1/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/LengthBuckets.cs#L17): for each unique key length, a bucket with a capacity of MaxPerLength = 5 elements is created. Essentially, this is an implementation of [block sorting](https://en.wikipedia.org/wiki/Bucket_sort). To make it clearer, let's look at an example:

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

There are keys with length of 3, 4 and 5 in the dictionary. Therefore, they can be distributed between 3 buckets (Figure 8):

1. Bucket for keys of length 3: `fig`.  
2. Bucket for keys of length 4: `lime` and `kiwi`.  
3. Bucket for keys of length 5: `apple`, `grape`, and `lemon`.

<img src="{{site.baseurl}}/assets/2024/10/2024-10-09-frozen-dictionary/image09.png" alt="content">
<strong>
Figure 8 – Distribution of the strings based on their length
</strong>

Since we know the minimum (3) and maximum (5) lengths of the keys, there's no need to create three separate buckets. We can store everything in a single array called `lengthBuckets`. In this case, the index is calculated like this: `(key.Length - minLength) * MaxPerLength`.

### Search algorithm

The search is done in 3 steps (Figure 9):

1. The bucket is determined in the `_lengthBuckets` array.  
2. A linear search in the bucket finds the index of the desired key in `_keys`.  
3. The value is returned.

<img src="{{site.baseurl}}/assets/2024/10/2024-10-09-frozen-dictionary/image10.png" alt="content">
<strong>
Figure 9 – Search in LengthBucketsFrozenDictionary
</strong>

`LengthBucketsFrozenDictionary` has two limitations:

1. The number of keys with the same length must not exceed `MaxPerLength` ([Pigeonhole Principle](https://en.wikipedia.org/wiki/Pigeonhole_principle)). You can't place 6 strings of the same length in a bucket with a capacity of 5 elements.  
2. The number of empty buckets must be less than 20%. Otherwise, the implementation becomes inefficient in terms of memory usage.

If either of these conditions is not met, one of the [OrdinalStringFrozenDictionary](https://github.com/dotnet/runtime/blob/e75fc2775a2c844ffd45e64b9a1b67b7e088959f/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/OrdinalStringFrozenDictionary.cs) implementations will be chosen (more on that later).

### Benchmark

The benchmark results show that reading from a `LengthBucketsFrozenDictionary` can be up to 99% faster than a regular `Dictionary`. However, if the dictionary has 5 or more keys with the same length, the performance of small dictionaries (up to 100 items) can be worse (see Figure 10).

<img src="{{site.baseurl}}/assets/2024/10/2024-10-09-frozen-dictionary/image11.png" alt="content">
<strong>
Figure 10 – Reading speed LengthBucketsFrozenDictionary comparing to Dictionary
</strong>

## Group 4. Dictionary with string keys

As we already know, `LengthBucketsFrozenDictionary` has limitations. When it's not possible to distribute keys into buckets, one of 11 implementations of the abstract class [OrdinalStringFrozenDictionary](https://github.com/dotnet/runtime/blob/e75fc2775a2c844ffd45e64b9a1b67b7e088959f/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/OrdinalStringFrozenDictionary.cs) is used. All of them use `FrozenHashTable`, but differ in the [algorithm for calculating the string's hash code](https://github.com/dotnet/runtime/blob/0378936909464c84cf207ffd1a21efa474fc34c0/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/Hashing.cs).

The choice of the optimal `OrdinalStringFrozenDictionary` implementation depends on the key analysis by the [KeyAnalyzer class](https://github.com/dotnet/runtime/blob/d25d42e6dba95016cc1af95367a50c6b8b26efdd/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/KeyAnalyzer.cs). In turn, the result of the analysis depends on key length, the presence of non-ASCII characters, specified [string comparison](https://learn.microsoft.com/en-us/dotnet/api/system.stringcomparison) rules and the presence of unique substrings in the keys.

Obviously, the longer the string, the slower the hash code calculation. Therefore, `KeyAnalyzer` tries to find the shortest substrings that allow the key to be uniquely identified. To better understand this, let's revisit the example with fruits: `apple`, `grape`, `fig`, `lime`, `lemon`, and `kiwi`.

First, `KeyAnalyzer` analyzes substrings of length 1 with left-aligned keys (see Figure 11).

<img src="{{site.baseurl}}/assets/2024/10/2024-10-09-frozen-dictionary/image12.png" alt="content">
<strong>
Figure 11 – Single-char substrings with left and right algnment
</strong>

In this example, with left-aligned keys, there are repeating substrings. For instance, the 0th character of "lime" and "lemon" is the same, as well as the 1st character of "fig" and "lime" and the 2nd character of "lime" and "lemon." This means that it is impossible to uniquely identify a key by a single character with such alignment. Therefore, the search for a substring continues with right-aligned keys. In this case, the substrings will be unique when using the 2nd or 1st character from the end. Knowing the alignment, starting index, and length of the substring, the string can be uniquely identified by calculating the hash code of its substring.

If there are no unique substrings of length 1, the search will continue for substrings of 2 characters, 3 characters, and so on, up to the maximum substring length. This value is calculated as the minimum between `minLength` (the shortest key length) and `MaxSubstringLengthLimit` = 8. This limitation is specifically set to avoid analyzing long substrings, as using them doesn't improve performance.

If there is no unique substrings at all, the hash code will be calculated for the entire string.

In addition to the presence of unique substrings, the implementation is also [affected by the specified string comparison](https://github.com/dotnet/runtime/blob/0378936909464c84cf207ffd1a21efa474fc34c0/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/KeyAnalyzer.cs#L56) parameters and the presence of non-ASCII characters. Based on these parameters, a more optimal comparator will be chosen.

### Search algorithm

Search in dictionaries based on `OrdinalStringFrozenDictionary` is [performed as follows](https://github.com/dotnet/runtime/blob/98b165db27a3c15b9c0df208d1acca573b3dd15e/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/String/OrdinalStringFrozenDictionary.cs#L83):

1. First, it checks whether the key length is within the acceptable range. This allows for quickly discarding keys that clearly do not match due to their length.

2. Next, the same steps that we've seen earlier in other dictionaries with `FrozenHashTable` are performed. The hash code of the substring is calculated, and a search is performed in the hash table. In case of a collision, a linear search is performed.

### Benchmark

According to the benchmark results, a `FrozenDictionary` with up to 75,000 elements is faster than a regular `Dictionary`. However, as the dictionary size increases, the search speed becomes worse (see Figure 12).

<img src="{{site.baseurl}}/assets/2024/10/2024-10-09-frozen-dictionary/image13.png" alt="content">
<strong>
Рисунок 12 – Reading speed from OrdinalStringFrozenDictionary_LeftJustifiedSubstring comparing to Dictionary
</strong>

The high speed of `FrozenDictionary` is due to the fast hash code calculation of keys. The algorithm used in `FrozenDictionary` is 75% to 90% faster than the one in a regular `Dictionary` (see Figure 13).

<img src="{{site.baseurl}}/assets/2024/10/2024-10-09-frozen-dictionary/image14.png" alt="content">
<strong>
Figure 13 – Hash calculation speed
</strong>

The performance drop in dictionaries with 75,000 elements or more is caused by the increasing number of hash collisions as the dictionary size grows (see Figure 14).

<img src="{{site.baseurl}}/assets/2024/10/2024-10-09-frozen-dictionary/image15.png" alt="content">
<strong>
Figure 14 – Hash collisions count
</strong>

As shown in the figures, the algorithm used in `FrozenDictionary` significantly speeds up hash code calculation, improving performance by up to 70%. However, this approach negatively impacts search performance in relatively large dictionaries.

## Group 5. Small dictionaries

`SmallValueTypeComparableFrozenDictionary` and `SmallValueTypeDefaultComparerFrozenDictionary` are used when the original dictionary has no more than 10 elements, while `SmallFrozenDictionary` is used when it has no more than 4 elements. `SmallValueTypeComparableFrozenDictionary` is applied if the key type is a [built-in primitive value type](https://github.com/dotnet/runtime/blob/8e92aef5387fe1d4b9159b4a3657416ac7d0a05a/src/libraries/System.Collections.Immutable/src/System/Collections/Frozen/Constants.cs#L44) (e.g., `int`, `long`, `double`, `enum`, etc.). If the key type is a custom structure, then `SmallValueTypeDefaultComparerFrozenDictionary` will be used. Developers on .NET explain this by noting that built-in types always implement the IComparable interface, allowing for a slight optimization in search by sorting the key and value arrays in advance.

### Search algorithm

Strictly speaking, the classes `SmallValueTypeComparableFrozenDictionary`, `SmallValueTypeDefaultComparerFrozenDictionary`, and `SmallFrozenDictionary` are not hash tables. The search for a value in these classes is performed using a simple linear search via a `for` loop (Figure 15).

<img src="{{site.baseurl}}/assets/2024/10/2024-10-09-frozen-dictionary/image16.png" alt="content">
<strong>
Figure 15 – Search in SmallValueTypeComparableFrozenDictionary
</strong>

In `SmallValueTypeComparableFrozenDictionary`, since the `_keys` and `_values` arrays are sorted, the search can continue as long as the searched key is greater than the current value of `_keys[i]`.

The implementations of `SmallValueTypeDefaultComparerFrozenDictionary` and `SmallFrozenDictionary` are similar to the previous one, except that sorting is not used. Therefore, a linear search through the `_keys` array will always be performed.

### Benchmark

Despite all the optimizations in these classes, the benchmark results do not look impressive (see Figure 16). Even the slight speedup that these classes can provide amounts to just a few tens of nanoseconds.

<img src="{{site.baseurl}}/assets/2024/10/2024-10-09-frozen-dictionary/image17.png" alt="content">
<strong>
Figure 16 – Reading speed from SmallValueTypeComparableFrozenDictionary, SmallValueTypeDefaultComparerFrozenDictionary and SmallFrozenDictionary comparing to Dictionary
</strong>

## Conclusion

In this article, I tried to explain the main implementation features of `FrozenDictionary`. We made sure that in most cases `FrozenDictionary` is faster than `Dictionary`.

Actually, there are lots of another algorithms and optimizations. For example, usage of `ArrayPool`, fast algorithm for modulus calculation, integer array with bit shift instead of boolean array etc. It would be impossible to do more detailed analysis in a single article. But from time to time I make such posts in my [Telegram channel](https://t.me/yet_another_dev). If you are interested, I will be glad to see you among the readers.

---
title: 'What''s wrong with the Options pattern in C#?'
description: 'An analysis of the challenges with Options pattern in .NET when working with database configurations, and proposing practical solutions'
pubDate: 'Jan 09 2024'
heroImage: 'cover.png'
tags: ['C#', 'ASP.NET', 'Design Patterns']
---

In .NET, there is a so-called [Options](https://learn.microsoft.com/en-us/dotnet/core/extensions/options) pattern that simplifies the way we handle application configuration. To use it, developers just need to follow three steps. First, add the necessary [configuration provider](https://learn.microsoft.com/en-us/dotnet/core/extensions/configuration-providers). Second, set up Service Provider using [`Configure`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.optionsconfigurationservicecollectionextensions.configure) extension method. Third, inject either `IOptions<T>`, or `IOptionsMonitor<T>`, or `IOptionsSnapshot<T>`  into the target class through constructor injecting.

Microsoft provides default configuration providers, like the JSON configuration provider with the [`AddJsonFile`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.configuration.jsonconfigurationextensions.addjsonfile) extension method. However, there are no providers for obtaining the configuration from database. In this article, we will consider several approaches to how to do it.

## The problem

Let's imagine the implementation of the following application scenario. We have a `Configuration Updater` responsible for updating configuration in the database. On the other side, there's a `Configuration Consumer` that retrieves configuration when needed.

<img src="{{site.baseurl}}/assets/2024/01/2024-01-09-whats-wrong-with-options-pattern/image1.png" alt="content">

Below is `AppConfig` class that defines configuration.

``` cs
public class AppConfig
{
    public int Id { get; init; }
    public int Version { get; private set; }
    public required string Guid { get; set; }

    public void Update(string guid)
    {
        Guid = guid;
        Version++;
    }
}
```

The configuration in the database is updated by the Configuration Updater service every second.

``` cs
var db = new DatabaseContext("DataSource=./../Database/db.sqlite");

while (true)
{
    var guid = Guid.NewGuid().ToString();

    var appConfig = db.AppConfigs.FirstOrDefault();

    if (appConfig is null)
    {
        db.AppConfigs.Add(new AppConfig() { Guid = guid, });
    }
    else
    {
        appConfig.Update(guid);
    }

    db.SaveChanges();

    Console.WriteLine("Configuration updated: {0}", guid);

    await Task.Delay(1000);
}
```

In the same time, the Configuration Consumer service reads the configuration every second.

``` cs
public class ConsumerClass(IOptionsMonitor<AppConfig> _optionsMonitor)
{
    public async Task DoWork()
    {
        while (true)
        {
            var config = _optionsMonitor.CurrentValue;
            Console.WriteLine("Consume config: {0}", config.Guid);
            await Task.Delay(1000);
        }
    }
}
```

Now we should implement the functionality that obtains configuration from the database. There are examples, that show how to achieve this using custom configuration providers, for instance:

1. [Implement a custom configuration provider - .NET \| Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/extensions/custom-configuration-provider)
2. [Implement a Custom Configuration Provider in .NET 7 \| by Goker Akce \| Medium](https://medium.com/@gokerakce/implement-a-custom-configuration-provider-in-net-7-c0a195dcd05f)
3. [A Refreshable SQL Server Configuration Provider for .NET Core \| Morteza Mousavi](https://mousavi310.github.io/posts/a-refreshable-sql-server-configuration-provider-for-net-core/)

The main idea of all these examples is to implement 2 custom classes: configuration source and configuration provider. Let’s take a look at the possible implementation.

The `DatabaseConfigurationProvider` class retrieves the configuration from the database, converts it to a JSON string, and loads into the `Data` dictionary using the internal implementation of `JsonConfigurationProvider.`

``` cs
public class DatabaseConfigurationProvider(string _connectionString, JsonConfigurationSource source) : JsonConfigurationProvider(source)
{
    public static string Prefix => nameof(AppConfig);

    public override void Load()
    {
        using var db = new DatabaseContext(_connectionString);

        var appConfig = db.AppConfigs.FirstOrDefault() ?? throw new InvalidOperationException("Configuration");

        var json = JsonSerializer.Serialize(new { AppConfig = appConfig });

        if (string.IsNullOrWhiteSpace(json)) return;

        var bytes = Encoding.UTF8.GetBytes(json);

        using var stream = new MemoryStream(bytes);

        Load(stream);
    }
}
```

The `DatabaseConfigurationSource` class serves for building the provider. It should be added to the `ConfigurationBuilder` instance when defining dependencies in the [composition root](https://blog.ploeh.dk/2011/07/28/CompositionRoot/).

``` cs
public class DatabaseConfigurationSource(string _connectionString) : JsonConfigurationSource
{
    public override IConfigurationProvider Build(IConfigurationBuilder builder)
    {
        Console.WriteLine("Build configuration source");
        EnsureDefaults(builder);
        return new DatabaseConfigurationProvider(_connectionString, this);
    }
}

public static class DatabaseConfigurationExtensions
{
    public static IConfigurationBuilder AddDatabaseConfiguration(this IConfigurationBuilder builder, string connectionString) =>
        builder.Add(new DatabaseConfigurationSource(connectionString));
}
```

This solution compiles and works well, but only once. The reason is that the `DatabaseConfigurationSource` will read the configuration only on application startup. The examples we mentioned earlier propose a solution to this problem based on [`Timer`](https://learn.microsoft.com/en-us/dotnet/api/system.timers.timer) or [`ChangeToken`](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/change-tokens) class. The idea is to periodically update configuration. However, there are several issues with this approach:

1. **Unnecessary database calls:** The configuration provider makes a call to the database even if the database state hasn't changed.
2. **Data consistency:** The configuration in the database may be updated, but the timer is not triggered yet, and the configuration provider hasn't obtained the updated version. Therefore, the Consumer Service may receive an outdated version of the configuration.

## Proposed solution

If the Consumer Service has to have the latest version of the configuration, a simpler solution is just to implement `IOptionsMonitor<AppConfig>` and register it as a singleton:

``` cs
public class DatabaseConfigurationMonitor(string _connectionString) : IOptionsMonitor<AppConfig>
{
    public AppConfig CurrentValue => Get();

    public AppConfig Get(string? name) => Get();

    private AppConfig Get() =>
        new DatabaseContext(_connectionString)
            .AppConfigs
            .FirstOrDefault() ?? throw new InvalidOperationException("Configuration");

    public IDisposable? OnChange(Action<AppConfig, string?> listener)
    {
        throw new NotImplementedException();
    }
}

public static class DatabaseConfigurationExtensions
{
    public static IServiceCollection ConfigureDatabaseOptionsMonitor(this IServiceCollection collection, string connectionString) =>
        collection.AddSingleton<IOptionsMonitor<AppConfig>>(provider => new DatabaseConfigurationMonitor(connectionString));
}
```

In this scenario, accessing `_optionsMonitor.CurrentValue` will consistently provide the most up-to-date configuration from the database.

But this approach also has a drawback: if you decide to switch from `IOptionsMonitor<T>` to `IOptions<T>`, you will also need to implement `IOptions<T>`.

## Conclusion

In applications using the Options pattern, there's a missing feature for fetching configuration directly from databases. Developers often need to create custom solutions, typically through custom classes based on the `ConfigurationProvider` class. However, this approach can lead to issues such as unnecessary database calls and data inconsistency.

For a straightforward solution that always fetches the latest configuration, implementing the `IOptionsMonitor<T>` or `IOptions<T>` interfaces proves to be simpler and more effective.

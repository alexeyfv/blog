---
title: 'Simplify Integration Testing with Testcontainers'
description: 'Learn how to use Testcontainers to simplify database integration testing in C# by running PostgreSQL in Docker containers'
pubDate: 'Feb 12 2024'
heroImage: 'cover.png'
tags: ['C#', 'Testing']
---

Integration tests play an important role in software development. They help us see how the system works with volatile dependencies, such as databases. To run the integration test with the database, we need somewhere to create this database. It can be deployed on a virtual machine or even on a local host. However, it's best to use [Testcontainers framework](https://testcontainers.com/).

## What is Testcontainers?

Testcontainers is a library that provides easy and lightweight APIs for bootstrapping local development and test dependencies with real services wrapped in Docker containers. Using Testcontainers, you can write tests that depend on the same services you use in production without mocks or in-memory services (stolen from this [page](https://testcontainers.com/getting-started/)).

## Usage example

Consider the `UserInfoService` class below. Basically, the service tries to get `UserInfo` from the memory cache. If this fails, the service tries to extract the data from the database. If this also fails, the service returns `null`.

``` cs
public record UserInfo(string Id, string Name, string Address);

public class UserInfoService(IRepository _repository)
{
    private readonly ConcurrentDictionary<string, UserInfo> _cache = new();

    public async Task<UserInfo?> Get(string id, CancellationToken ct)
    {
        // The fastest way - get userinfo from memory cache
        if (_cache.TryGetValue(id, out var userInfo)) return userInfo;

        // Slower way - get userinfo from database
        userInfo = await _repository.Get(id, ct);

        if (userInfo is not null)
        {
            _cache.TryAdd(id, userInfo);
            return userInfo;
        }

        return null;
    }
}
```

Now let's consider the following scenario. If the key doesn’t exist in the cache, the service calls a database. Knowing that information, we can implement the integration tests with Testcontainers. But before that, we also need implementation of `IRepository` and migrations.

### Repository implementation

We’re going to use PostgreSQL, so let's add it to the project.

``` sh
dotnet add package Npgsql --version 8.0.2
```

I also prefer to use Dapper to avoid [the boilerplate code with SqlCommand](https://www.learndapper.com/#what-does-dapper-do).

``` sh
dotnet add package Dapper --version 2.1.28
```

The implementation of the repository is pretty simple.

``` cs
public interface IRepository
{
    public Task<UserInfo?> Get(string id, CancellationToken ct);

    public Task Add(UserInfo userInfo);
}

public class Repository(string _connectionString) : IRepository
{
    private readonly NpgsqlConnection connection = new(_connectionString);

    private readonly string _selectQuery = @"SELECT ""Id"", ""Name"", ""Address"" FROM ""Users"" WHERE ""Id"" = @Id";
    private readonly string _insertQuery = @"INSERT INTO ""Users"" (""Id"", ""Name"", ""Address"") VALUES (@Id, @Name, @Address)";

    public async Task Add(UserInfo userInfo)
    {
        await connection.ExecuteAsync(_insertQuery, new { userInfo.Id, userInfo.Name, userInfo.Address });
    }

    public async Task<UserInfo?> Get(string id, CancellationToken ct)
    {
        var row = await connection.QueryFirstOrDefaultAsync<UserInfo>(_selectQuery, new { Id = id });
        return row;
    }
}
```

### Database migrations

For migrations, we’re going to use [FluentMigrator](https://github.com/fluentmigrator/fluentmigrator) library.

``` sh
dotnet add package FluentMigrator --version 5.0.0
dotnet add package FluentMigrator.Runner.Postgres --version 5.0.0
```

The initial migration creates a `Users` table.

``` cs
[Migration(20240212, "Creates Users table")]
public class InitialMigration : Migration
{
    public override void Up()
    {
        Create.Table("Users")
            .WithColumn("Id").AsString().PrimaryKey()
            .WithColumn("Name").AsString()
            .WithColumn("Address").AsString();
    }

    public override void Down()
    {
        Delete.Table("Users");
    }
}
```

To run the migration, we need

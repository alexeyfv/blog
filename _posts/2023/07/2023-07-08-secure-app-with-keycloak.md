---
layout: post
title: "Create secure React SPA + ASP.NET Web API with Keycloak OAuth2"
date: 2023-07-30
tags: csharp aspnet typescript react docker oauth2 keycloak
---

This is a step-by-step guide how to create a full stack secure application with OAuth2 authentication.

## Table of contents

- [Table of contents](#table-of-contents)
- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Initialize the app](#initialize-the-app)
  - [Create ASP.NET Web API service](#create-aspnet-web-api-service)
  - [Create React SPA](#create-react-spa)
  - [Connect client with server](#connect-client-with-server)
  - [Dockerize the app](#dockerize-the-app)
- [Secure the app](#secure-the-app)
  - [Setup Keycloak](#setup-keycloak)
  - [Change the client](#change-the-client)
  - [Change the server](#change-the-server)
  - [Run it all together](#run-it-all-together)
- [Source code](#source-code)
- [Summary](#summary)

## Introduction

[Keycloak](https://www.keycloak.org/) is an open-source identity and access management (IAM) solution. It provides user authentication, authorization, and user management. Keycloak allows you to secure web applications by providing a centralized authentication and authorization mechanism. It supports various authentication methods, including username/password, social login (e.g., Google, Facebook), and more. Keycloak is based on standard protocols such as [OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749) and OpenID Connect, making it compatible with a wide range of applications and services.

## Prerequisites

Since we are going to create a full stack application I assume that you have knowledge of:

1. C# and ASP.NET Web API.
2. TypeScript and React.
3. Docker.

You also have to have the following software on your machine:

1. .NET SDK
2. Node.js with npm
3. Docker

## Initialize the app

### Create ASP.NET Web API service

Let’s start with the backend part. We’re going to create an ASP.NET Web API service using the following command:

``` bash
dotnet new webapi --no-openapi --use-minimal-apis
```

I used 2 options to simplify the source code:

- `–-no-openapi` disables OpenAPI specification generation.
- `–-use-minimal-apis` generates minimalistic version of HTTP requests handlers.

The result is below.

``` csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
app.UseHttpsRedirection();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast = Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
});

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
```

The service has only one endpoint `/weatherforecast`. Right now it is not secured, so anyone can call it and receive the data.

<img src="{{site.baseurl}}/assets/2023/07/2023-07-08-secure-app-with-keycloak/image01.png" alt="content">
<strong>The endpoint /weatherforecast is not secured</strong>

### Create React SPA

Create the client via:

``` bash
npx create-react-app client -—template typescript
```

This command generates a bunch of files we don’t need, so I removed them to simplify the code.

Now project looks like:

<img src="{{site.baseurl}}/assets/2023/07/2023-07-08-secure-app-with-keycloak/image02.png" alt="content">
<strong>Initial project</strong>

### Connect client with server

Right now, the project contains two different applications (client and server) which don’t communicate with each other. Let’s connect them, so that the client will be able to call `/weatherforecast` endpoint:

1. At the server side a [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) policy should be added. The policy allows any header, any method and any origin. Don't do it in production, but for development purposes it's ok.

    ``` csharp
    builder.Services.AddCors();

    // other code

    if (builder.Environment.IsDevelopment())
    {
        app.UseCors(config =>
        {
            config.AllowAnyHeader();
            config.AllowAnyMethod();
            config.AllowAnyOrigin();
        });
    }
    ```

2. At the client side `WeatherForecastView` component should be created. This component calls `/weatherforecast` endpoint and renders the received data.

    ``` tsx
    // App.tsx
    export default function App() {
        return (
            <div className="App">
                <WeatherForecastView />
            </div>
        );
    }

    // WeatherForecast.ts
    export interface WeatherForecast {
        date: Date;
        temperatureC: number;
        summary: string;
    }

    // WeatherForecastView.tsx
    import { useEffect, useState } from "react";
    import { useApi } from "./hooks/useApi";
    import { WeatherForecast } from "./types/WeatherForecast";

    export default function WeatherForecastView() {
        const [get] = useApi();
        const [forecast, setForecast] = useState<WeatherForecast[]>([]);

        useEffect(() => {
            get().then((wf) => setForecast(wf));
        }, []);

        return (
            <table>
            <thead>
                <tr>
                <th>Date</th>
                <th>Temperature</th>
                <th>Summary</th>
                </tr>
            </thead>
            <tbody>
                {forecast.map((f) => (
                <tr>
                    <td>{new Date(f.date).toDateString()}</td>
                    <td>{f.temperatureC}</td>
                    <td>{f.summary}</td>
                </tr>
                ))}
            </tbody>
            </table>
        );
    }
    ```

### Dockerize the app

Now we are going to put both applications in a single Docker container. The dockerfile is pretty straightforward. It uses Node.js and .NET SDK images to build both of the applications and then makes the final container using an ASP.NET image. Note that built client application will be copied to the `wwwroot` folder.

``` dockerfile
# Stage 1: Frontend - React SPA (https://hub.docker.com/_/node)
FROM node:18-alpine AS frontend-build
WORKDIR /
COPY ./client ./
RUN npm i && npm run build

# Stage 2: Backend - ASP.NET Core Web API (https://hub.docker.com/_/microsoft-dotnet-sdk/)
FROM mcr.microsoft.com/dotnet/sdk:7.0-alpine AS backend-build
WORKDIR /

# Copy projects and restore dependencies
COPY ./server/*.csproj ./server/
RUN dotnet restore ./server/

# Copy everything else
COPY . .

# Build app
WORKDIR /server
RUN dotnet publish -c release -o /app

# Stage 3: Create final container
FROM mcr.microsoft.com/dotnet/aspnet:7.0-alpine
WORKDIR /app
COPY --from=frontend-build /build ./wwwroot
COPY --from=backend-build /app ./
ENTRYPOINT ["dotnet", "server.dll"]

```

I also created `docker-compose.yml` file to quickly run the container.

``` yml
version: "3.9"

services:
  webapp:
    container_name: secure-app
    image: secure-app
    ports:
      - 5000:80
    environment:
      - ASPNETCORE_URLS=http://+:80
```

To make the client and the server work together we should do a small change in `Program.cs` file. This сhange allows the server to return a built client application i.e. static HTML-page.

``` csharp
if (builder.Environment.IsDevelopment())
{
    // other code
}
else
{
    app.UseStaticFiles(); // Enables static files serving from wwwroot folder
    app.MapFallbackToFile("index.html"); // Maps to index.html from wwwroot folder
}

// other code
```

To build and run the dockerized application execute the following commands.

``` bash
docker build -t secure-app .
docker compose up 
```

## Secure the app

### Setup Keycloak

The easiest way to run Keycloak instance is run it in docker container using the following command.

``` bash
docker run -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:21.1.2 start-dev
```

Or, what is easier, using `docker compose up` command with `docker-compose.yml` file.

``` yml
version: "3.9"

services:
  webapp:
    container_name: secure-app
    image: secure-app
    ports:
      - 5000:80
    environment:
      - ASPNETCORE_URLS=http://+:80
  keycloak:
    container_name: keycloak
    image: quay.io/keycloak/keycloak:21.1.2
    ports:
      - "8080:8080"
    environment:
      - KEYCLOAK_ADMIN=admin
      - KEYCLOAK_ADMIN_PASSWORD=admin
    command: ["start-dev"]
```

Basic Keycloak setup consist of the following steps:

1. Go to [http://localhost:8080/admin](http://localhost:8080/admin) and log in as admin.
2. Create realm.

    <img src="{{site.baseurl}}/assets/2023/07/2023-07-08-secure-app-with-keycloak/image03.png" alt="content">

3. Put some name for realm.

    <img src="{{site.baseurl}}/assets/2023/07/2023-07-08-secure-app-with-keycloak/image04.png" alt="content">

4. Go to `Users`, press `Create new user` and create a new user.

    <img src="{{site.baseurl}}/assets/2023/07/2023-07-08-secure-app-with-keycloak/image05.png" alt="content">

5. Go to `Credentials` tab, press `Set password` and create a creadentials for the user. You can uncheck `Temporary` so that you don't have to change the password the first time you log in.

    <img src="{{site.baseurl}}/assets/2023/07/2023-07-08-secure-app-with-keycloak/image06.png" alt="content">

6. Go to `Clients` and select `account`.

    <img src="{{site.baseurl}}/assets/2023/07/2023-07-08-secure-app-with-keycloak/image07.png" alt="content">

7. On the `Settings` tab, add a new valid redirect URI and enter a value in the `Web Origin` field.

    <img src="{{site.baseurl}}/assets/2023/07/2023-07-08-secure-app-with-keycloak/image08.png" alt="content">

8. Go to `Client scopes`, press `Create client scope` button and create `audience` scope. Note, that the     type should be `Default`.

    <img src="{{site.baseurl}}/assets/2023/07/2023-07-08-secure-app-with-keycloak/image09.png" alt="content">

9. In the new `audience` scope go to the `Mappers` tab, press `Configure a new mapper` and select `Audience` mapper.

    <img src="{{site.baseurl}}/assets/2023/07/2023-07-08-secure-app-with-keycloak/image10.png" alt="content">

10. Fill in the fields and press `Save`.

    <img src="{{site.baseurl}}/assets/2023/07/2023-07-08-secure-app-with-keycloak/image11.png" alt="content">

11. Return to the `Client`, select `account` scope, go to the `Client scopes` tab and press `Add client scope`. Select from the list the `audience` scope and add it as a default.

    <img src="{{site.baseurl}}/assets/2023/07/2023-07-08-secure-app-with-keycloak/image12.png" alt="content">

You can [export and import](https://www.keycloak.org/server/importExport) realms. For example, a configuration for the realm above can be found [here](https://gitlab.com/alexeyfv/secure-app/-/blob/main/keycloak/realm-export.json).

### Change the client

1. Install [`react-oidc-context`](https://www.npmjs.com/package/react-oidc-context) npm package. This library simplifies the process of OAuth2 authentication for React applications. More info can be found [here](https://github.com/authts/react-oidc-context).

    ``` bash
    npm i react-oidc-context
    ```

2. After installation we should wrap `App` by `AuthProvider` and add an authentication check to the `App`. The client shows a `Log In` button if the user is not authenticated. Otherwise it shows a `WeatherForecast` component. Note, that I also added `bootstrap` just to make the UI more fancy.

    ``` tsx
    // index.tsx
    import "bootstrap/dist/css/bootstrap.min.css";
    import { AuthProvider } from "react-oidc-context";

    const root = ReactDOM.createRoot(
    document.getElementById("root") as HTMLElement
    );
    root.render(
    <React.StrictMode>
        <AuthProvider
        authority={"http://localhost:8080/realms/secure-app"}
        client_id={"account"}
        redirect_uri={window.location.origin}
        scope="openid profile"
        automaticSilentRenew={true}
        loadUserInfo={true}
        >
        <App />
        </AuthProvider>
    </React.StrictMode>
    );

    // App.tsx
    import WeatherForecastView from "./WeatherForecastView";
    import { useAuth } from "react-oidc-context";

    export default function App() {
    const auth = useAuth();

    return (
        <div className="container mt-5 mb-5">
            {auth.isAuthenticated ? (
                <div className="App">
                <WeatherForecastView />
                </div>
            ) : (
                <div className="row">
                <div className="col text-center">
                    {auth.isLoading ? (
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    ) : auth.error ? (
                    <div className="alert alert-danger" role="alert">
                        Error
                    </div>
                    ) : (
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => void auth.signinRedirect()}
                    >
                        Log in
                    </button>
                    )}
                </div>
                </div>
            )}
            </div>
        );
    }
    ```

3. The last thing to change in the client is to update `useApi` hook. The hook will handle the authentication and authorization aspects by including the user's access token in the request headers.

    ``` tsx
    // useApi.tsx
    import { useAuth } from "react-oidc-context";
    import { WeatherForecast } from "../types/WeatherForecast";

    export function useApi() {
    const auth = useAuth();
    const get = (): Promise<WeatherForecast[]> => {
        const url = "http://localhost:5000/weatherforecast";
        const options = {
        method: "GET",
        headers: {
            Authorization: `Bearer ${auth.user?.access_token}`,
            "Content-Type": "application/json",
        },
        };
        const request = async (): Promise<WeatherForecast[]> => {
        const resp = await fetch(url, options);
        const response = (await resp.json()) as WeatherForecast[];
        return response;
        };
        return request();
    };

    return [get];
    }
    ```

### Change the server

1. Install NuGet package [Microsoft.AspNetCore.Authentication.JwtBearer](https://www.nuget.org/packages/Microsoft.AspNetCore.Authentication.JwtBearer). This library enables support for JWT bearer based authentication.

    ``` bash
    dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer --version 7.0.9
    ```

2. Set up JWT Bearer authentication, configure the necessary options for token validation, and add authorization support to the application. The application will now be able to authenticate users using JWT tokens and enforce authorization rules based on the received tokens.

    ``` csharp
    // other code 

    services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.ConfigurationManager =
                new ConfigurationManager<OpenIdConnectConfiguration>("http://keycloak:8080/realms/secure-app/.well-known/openid-configuration",
                    new OpenIdConnectConfigurationRetriever(),
                    new HttpDocumentRetriever(new HttpClient()) { RequireHttps = false });
            options.RequireHttpsMetadata = false;
            options.SaveToken = true;
            options.Authority = "";
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidIssuer = "http://localhost:8080/realms/secure-app",
                ValidAudience = "account"
            };
        });
    services.AddAuthorization();

    // other code
    ```

3. Enable authentication and authorization support using `UseAuthentication()` and `UseAuthorization()` middlewares.

    ``` csharp
    // other code 

    app.UseAuthentication();
    app.UseAuthorization();

    // other code
    ```

4. Apply authorization to the `/weatherforecast` endpoint using `RequireAuthorization()` method. By using `RequireAuthorization()` at the endpoint, you are making sure that authorization is enforced for the endpoint.

    ``` csharp
    app.MapGet("/weatherforecast", () => 
    {
        // some code
    }).RequireAuthorization();
    ```

### Run it all together

The secured application now can be launched. Execute `docker compose up` and go to [localhost:5000](localhost:5000/).

<img src="{{site.baseurl}}/assets/2023/07/2023-07-08-secure-app-with-keycloak/image14.png" alt="content">

<img src="{{site.baseurl}}/assets/2023/07/2023-07-08-secure-app-with-keycloak/image15.png" alt="content">

## Source code

The code can be found [here](https://gitlab.com/alexeyfv/secure-app/-/tree/main).

## Summary

This step-by-step guide demonstrates how to create a secure full-stack application with OAuth2 authentication using Keycloak. Of course the provided example is pretty basic and lacks a lot of things that should be done for a production-level application. For example, the following things can be improved:

1. Hardcoded parameters should be extracted into `.env` file for the client or to the environment variables for the server.
2. Automatic realm configuration export to avoid manual configuration of Keycloak instance.

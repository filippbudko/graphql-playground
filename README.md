<p align="center"><img src="https://imgur.com/5fzMbyV.png" width="269"></p>

[![npm version](https://badge.fury.io/js/graphql-playground-react.svg)](https://badge.fury.io/js/graphql-playground-react) [![Build Status](https://travis-ci.org/prismagraphql/graphql-playground.svg?branch=master)](https://travis-ci.org/prismagraphql/graphql-playground) [![CircleCI](https://circleci.com/gh/prismagraphql/graphql-playground.svg?style=shield)](https://circleci.com/gh/prismagraphql/graphql-playground)

GraphQL IDE for better development workflows (GraphQL Subscriptions, interactive docs & collaboration). <br />
**You can download the [desktop app](https://github.com/graphcool/graphql-playground/releases) or use the web version at graphqlbin.com: [Demo](https://www.graphqlbin.com/RVIn)**

[![](https://i.imgur.com/AE5W6OW.png)](https://www.graphqlbin.com/RVIn)

## Installation

```sh
$ brew cask install graphql-playground
```

## Features

* ✨ Context-aware autocompletion & error highlighting
* 📚 Interactive, multi-column docs (keyboard support)
* ⚡️ Supports real-time GraphQL Subscriptions
* ⚙ GraphQL Config support with multiple Projects & Endpoints
* 🚥 Apollo Tracing support

## FAQ

### How is this different from [GraphiQL](https://github.com/graphql/graphiql)?

GraphQL Playground uses components of GraphiQL under the hood but is meant as a more powerful GraphQL IDE enabling better (local) development workflows. Compared to GraphiQL, the GraphQL Playground ships with the following additional features:

* Interactive, multi-column schema documentation
* Automatic schema reloading
* Support for GraphQL Subscriptions
* Query history
* Configuration of HTTP headers
* Tabs

See the following question for more additonal features.

### What's the difference between the desktop app and the web version?

The desktop app is the same as the web version but includes these additional features:

* Support for [graphql-config](https://github.com/graphcool/graphql-config) enabling features like multi-environment setups.
* Double click on `*.graphql` files.

### How does GraphQL Bin work?

You can easily share your Playgrounds with others by clicking on the "Share" button and sharing the generated link. You can think about GraphQL Bin like Pastebin for your GraphQL queries including the context (endpoint, HTTP headers, open tabs etc).

![](https://imgur.com/H1n64lL.png)

> You can also find the announcement blog post [here](https://blog.graph.cool/introducing-graphql-playground-f1e0a018f05d).

## Usage

### Properties

All interfaces, the React component `<Playground />` and all middlewares expose the same set of options:

* `properties`
  * `endpoint` [`string`] - the GraphQL endpoint url.
  * `subscriptionEndpoint` [`string`] - the GraphQL subscriptions endpoint url.
  * `setTitle` [`boolean`] - reflect the current endpoint in the page title

### As HTML Page

If you simply want to render the Playground HTML on your own, for example when implementing a GraphQL Server, there are 2 options for you:

1.  [The bare minimum HTML needed to render the Playground](https://github.com/graphcool/graphql-playground/blob/master/packages/graphql-playground-html/minimal.html)
2.  [The Playground HTML with full loading animation](https://github.com/graphcool/graphql-playground/blob/master/packages/graphql-playground-html/withAnimation.html)

### As React Component

#### Install

```sh
yarn add graphql-playground-react
```

#### Use

GraphQL Playground provides a React component responsible for rendering the UI and Session management.
There are **3 dependencies** needed in order to run the `graphql-playground-react` React component.

1.  _Open Sans_ and _Source Code Pro_ fonts
2.  Including `graphql-playground-react/playground.css`
3.  Rendering the `<Playground />` component

The GraphQL Playground requires **React 16**.

Including Fonts (`1.`)

```html
<link href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700|Source+Code+Pro:400,700" rel="stylesheet">
```

Including stylesheet and the component (`2., 3.`)

```js
import React from 'react'
import ReactDOM from 'react-dom'
import Playground from 'graphql-playground-react'
import 'graphql-playground-react/playground.css'

ReactDOM.render(
  <Playground endpoint="https://api.graph.cool/simple/v1/swapi" />,
  document.body,
)
```

### As Server Middleware

#### Install

```sh
# Pick the one that matches your server framework
yarn add graphql-playground-middleware-express  # for Express or Connect
yarn add graphql-playground-middleware-hapi
yarn add graphql-playground-middleware-koa
yarn add graphql-playground-middleware-lambda
```

#### Usage with example

We have a full example for each of the frameworks below:

* **Express:** See [packages/graphql-playground-middleware-express/examples/basic](https://github.com/graphcool/graphql-playground/tree/master/packages/graphql-playground-middleware-express/examples/basic)

* **Hapi:** See [packages/graphql-playground-middleware-hapi](https://github.com/graphcool/graphql-playground/tree/master/packages/graphql-playground-middleware-hapi)

* **Koa:** See [packages/graphql-playground-middleware-koa](https://github.com/graphcool/graphql-playground/tree/master/packages/graphql-playground-middleware-koa)

* **Lambda (as serverless handler):** See [serverless-graphql-apollo](https://github.com/serverless/serverless-graphql-apollo) or a quick example below.

### As serverless handler

#### Install

```sh
yarn add graphql-playground-middleware-lambda
```

#### Usage

`handler.js`

```js
import lambdaPlayground from 'graphql-playground-middleware-lambda'
// or using require()
// const lambdaPlayground = require('graphql-playground-middleware-lambda').default

exports.graphqlHandler = function graphqlHandler(event, context, callback) {
  function callbackFilter(error, output) {
    // eslint-disable-next-line no-param-reassign
    output.headers['Access-Control-Allow-Origin'] = '*'
    callback(error, output)
  }

  const handler = graphqlLambda({ schema: myGraphQLSchema })
  return handler(event, context, callbackFilter)
}

exports.playgroundHandler = lambdaPlayground({
  endpoint: '/dev/graphql',
})
```

`serverless.yml`

```yaml
functions:
  graphql:
    handler: handler.graphqlHandler
    events:
    - http:
        path: graphql
        method: post
        cors: true
  playground:
    handler: handler.playgroundHandler
    events:
    - http:
        path: playground
        method: get
        cors: true
```

## Development

```sh
$ cd packages/graphql-playground-react
$ yarn
$ yarn start
```

Open
[localhost:3000/localDev.html?endpoint=https://api.graph.cool/simple/v1/swapi](http://localhost:3000/localDev.html?endpoint=https://api.graph.cool/simple/v1/swapi) for local development!

### Versions

This is repository is a "mono repo" and contains multiple packages using [Yarn workspaces](https://yarnpkg.com/lang/en/docs/workspaces/). Please be aware that versions are **not** synchronised between packages. The versions of the [release page](https://github.com/graphcool/graphql-playground/releases) refer to the electron app.

### Packages

In the folder `packages` you'll find the following packages:

* `graphql-playground-electron`: Cross-platform electron app which uses `graphql-playground-react`
* `graphql-playground-html`: Simple HTML page rendering a version of `graphql-playground-react` hosted on JSDeliver
* `graphql-playground-middleware-express`: Express middleware using `graphql-playground-html`
* `graphql-playground-middleware-hapi`: Hapi middleware using `graphql-playground-html`
* `graphql-playground-middleware-koa`: Koa middleware using `graphql-playground-html`
* `graphql-playground-middleware-lambda`: AWS Lambda middleware using `graphql-playground-html`
* `graphql-playground-react`: Core of GraphQL Playground built with ReactJS

<a name="help-and-community" />

## Help & Community [![Slack Status](https://slack.graph.cool/badge.svg)](https://slack.graph.cool)

Join our [Slack community](http://slack.graph.cool/) if you run into issues or have questions. We love talking to you!

<p align="center"><a href="https://oss.prisma.io"><img src="https://imgur.com/IMU2ERq.png" alt="Prisma" height="170px"></a></p>

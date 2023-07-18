// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Engine } from "../engine.ts";
import { baseUrl } from "./middlewares.ts";

export const handlePlaygroundGraphQL = (
  request: Request,
  engine: Engine,
): Response => {
  const url = `${baseUrl(request)}/${engine.name}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script crossorigin src="https://unpkg.com/react@17/umd/react.development.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>
        <link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css" />
        <style>
          body {
            margin: 0;
            height: 100%;
            width: 100%;
            overflow: hidden;
          }
          #graphiql {
            height: 100vh;
          }
          .graphiql-container .graphiql-session-header {
            z-index: 1;
          }
          .graphiql-container .graphiql-ddl-typegraphs {
            margin: auto 15px;
            padding: 0 15px;
            background: #b7c2d7;
            border: none;
            height: 35px;
            border-radius: 6px;
            cursor: pointer;
          }
          .graphiql-container .graphiql-logo {
            display: flex;
            align-items: center;
            padding: 0 !important;
            margin: 0 15px 0 0;
          }
          .graphiql-container .graphiql-logo a {
            text-decoration: none;
            color: inherit;
          }
          .graphiql-container .graphiql-logo .graphiql-logo-link {
            width: 40px;
            height: 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-left: auto;
          }
          .graphiql-container .graphiql-logo a img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .graphiql-container .graphiql-session-header-right {
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div id="graphiql">Loading...</div>
        <script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>
        <script src="https://unpkg.com/graphiql/graphiql.min.js" type="application/javascript"></script>
        <script data-plugins="transform-es2015-modules-umd" type="text/babel">
          const fetcher = GraphiQL.createFetcher({
            url: "${url}"
          });
          const app = (
            <GraphiQL shouldPersistHeaders={true} fetcher={fetcher}>
              <GraphiQL.Logo>
                <a href="https://metatype.dev/docs/reference" target="_blank">
                  <div className="graphiql-logo-link">
                    <img src="https://metatype.dev/images/logo.svg" alt="Metatype logo" />
                    <div>Docs</div>
                  </div>
                </a>
              </GraphiQL.Logo>
            </GraphiQL>
          );
          ReactDOM.render(app, document.getElementById('graphiql'));
        </script>
      </body>
    </html>
    `;

  return new Response(html, {
    headers: { "content-type": "text/html" },
  });
};

export const handlePlaygroundRestAPI = (
  specUrl: string,
): Response => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Redoc</title>
        <!-- needed for adaptive design -->
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    
        <!--
        Redoc doesn't change outer page styles
        -->
        <style>
          body {
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>
        <redoc spec-url='${specUrl}'></redoc>
        <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"> </script>
      </body>
    </html>
    `;
  return new Response(html, {
    headers: { "content-type": "text/html" },
  });
};

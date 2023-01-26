// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

export const renderPlayground = (
  url: string,
  headers: Record<string, string> = {},
  version?: string,
  logoUrl?: string,
  documentationUrl?: string,
  typegraphList?: { name: string, url: string }[]
) => {
  const strOptions = (typegraphList || []).map(tg => `
    <option key={${tg.url}} value={${tg.url}}>{${tg.name}}</option>)
  `);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            height: 100%;
            margin: 0;
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
          .graphiql-container .graphiql-logo a{
            text-decoration: none;
            color: inherit;
          }
          .graphiql-container .graphiql-logo .graphiql-logo-link {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            margin-left: auto;
          }
          .graphiql-container .graphiql-logo a img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .graphiql-container .graphiql-logo .graphiql-logo-version {
            font-size: 11px;
          }
          .graphiql-container .graphiql-session-header-right {
            margin-top: 20px;
          }
        </style>
        <script crossorigin src="https://unpkg.com/react@17/umd/react.development.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>
        <link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css" />
      </head>
      <body>
        <div id="graphiql">Loading...</div>
        <script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>
        <script src="https://unpkg.com/graphiql/graphiql.min.js" type="application/javascript"></script>
        <script data-plugins="transform-es2015-modules-umd" type="text/babel">
          const fetcher =  GraphiQL.createFetcher({
            url: ${url}
          });
          const logoLink = ${logoUrl || 'https://graphql.org/img/logo.svg'}
          const documentationLink = ${documentationUrl || 'https://github.com/graphql/graphiql'}

          ReactDOM.render(<GraphiQL fetcher={fetcher}>
            <GraphiQL.Logo>
              <select className="graphiql-ddl-typegraphs" onChange={(e => window.location = e.target.value)}>
                ${strOptions}
              </select>
              <a href={documentationLink} target="_blank" rel="noreferrer">
                <span className="graphiql-logo-link"><img src={logoLink} alt="logo" className="logo" /></span>
                <span className="graphiql-logo-version">${version || ''}</span>
              </a>
            </GraphiQL.Logo>
          </GraphiQL>, document.getElementById('graphiql'));
        </script>
      </body>
    </html>
    `
};

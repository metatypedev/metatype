// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

export const renderPlayground = (
  url: string,
  headers: Record<string, string> = {},
  version?: string,
  logoUrl?: string,
  documentationUrl?: string,
  typegraphList?: { name: string, url: string }[]
) => {
  const strOptions = (typegraphList || []).map(element => `
    const option = document.createElement("option");
    option.value = ${element.url}/${element.name}
    
    const tgLink = document.createElement("a");
    tgLink.href = ${element.url}/${element.name}
    tgLink.innerHTML = element.name
    option.append(tgLink)

    ddlTypegraphs.add(option);
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
            padding: 0 !important;
            margin: 0 15px 0 0;
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
          .graphiql-container .graphiql-logo p {
            margin: 0;
            font-size: 11px;
          }
          .graphiql-container .graphiql-session-header-right {
            margin-top: 20px;
          }
        </style>
        <script
          crossorigin
          src="https://unpkg.com/react@17/umd/react.development.js"
        ></script>
        <script
          crossorigin
          src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"
        ></script>
        <link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css" />
      </head>
      <body>
        <div id="graphiql">Loading...</div>
        <script
          src="https://unpkg.com/graphiql/graphiql.min.js"
          type="application/javascript"
        ></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/domready/1.0.8/ready.min.js"></script>
        <script>
          ReactDOM.render(
            React.createElement(GraphiQL, {
              fetcher: GraphiQL.createFetcher({
                url: '${url}',
                headers: ${JSON.stringify(headers)}
              }),
              defaultEditorToolsVisibility: true,
            }),
            document.getElementById('graphiql'),
          );
        </script>
        <script>
          domready(function () {
            const logoLink = document.querySelector('.graphiql-logo-link')
            logoLink.href = '${documentationUrl} || ""'
            logoLink.innerHTML = '<img src="${logoUrl || "https://graphql.org/img/logo.svg"}" alt="logo" class="logo" />'

            const logoContainer = document.querySelector('.graphiql-logo');
            const p = document.createElement('p');
            p.innerHTML = '${version} || ""';
            logoContainer.appendChild(p);

            const ddlTypegraphs = document.createElement("select");
            ddlTypegraphs.classList.add("graphiql-ddl-typegraphs")
            ddlTypegraphs.onchange = function (event) { 
              window.location = event.target.value
            };
            
            const defaultOption = document.createElement("option");
            defaultOption.value = "file:///home/zohary/dev/test/graphiql.html"
            defaultOption.text = "Select a typegraph"
            ddlTypegraphs.add(defaultOption);

            ${strOptions}

            const headerRight = document.querySelector('.graphiql-session-header-right');
            headerRight.insertBefore(ddlTypegraphs, logoContainer)
          })
        </script>
      </body>
    </html>
    `
};

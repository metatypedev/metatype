// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

export const handleInfo = (
  _request: Request,
): Response => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script crossorigin src="https://unpkg.com/react@17/umd/react.development.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        <div id="info"></div>
        <script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>
        <script src="https://unpkg.com/graphiql/graphiql.min.js" type="application/javascript"></script>
        <script data-plugins="transform-es2015-modules-umd" type="text/babel">
          const app = (
            <a href="https://metatype.dev/docs" target="_blank" class="block">
                <div class="mx-auto my-4 flex flex-col w-min">
                    <img src="https://metatype.dev/images/logo.svg" width="150" height="150" alt="Metatype logo" />
                    <div>Documentation</div>
                </div>
            </a>
          );
          ReactDOM.render(app, document.getElementById('info'));
        </script>
      </body>
    </html>
    `;

  return new Response(html, {
    headers: { "content-type": "text/html" },
  });
};

/* eslint-disable @typescript-eslint/no-var-requires */

/** @type {import('@docusaurus/types').PluginModule} */
module.exports = () => ({
  name: "pyloader",
  configureWebpack() {
    return {
      externals: {
        canvas: {}, // https://github.com/facebook/docusaurus/issues/8589: BrowserOnly is not enough
      },
      module: {
        rules: [
          {
            test: /\.py$/i,
            use: ["code-loader"],
          },
          {
            test: /\.(graphql|gql)$/,
            exclude: /node_modules/,
            use: ["graphql-tag/loader"],
          },
        ],
      },
      resolveLoader: {
        alias: {
          "code-loader": require.resolve("./code-loader-transform.js"),
        },
      },
    };
  },
});

/* eslint-disable @typescript-eslint/no-var-requires */

/** @type {import('@docusaurus/types').PluginModule} */
module.exports = () => ({
  name: "pyloader",
  configureWebpack() {
    return {
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

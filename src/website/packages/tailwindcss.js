/* eslint-disable @typescript-eslint/no-var-requires */

const tailwindcss = require("tailwindcss");
const autoprefixer = require("autoprefixer");

/** @type {import('@docusaurus/types').PluginModule} */
module.exports = () => ({
  name: "tailwindcss",
  configurePostCss(postCssOptions) {
    postCssOptions.plugins.push(tailwindcss);
    postCssOptions.plugins.push(autoprefixer);
    return postCssOptions;
  },
});

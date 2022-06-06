module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "@docusaurus"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@docusaurus/recommended",
  ],
  env: {
    browser: true,
    amd: true,
    node: true,
  },
};

/* eslint-disable @typescript-eslint/no-var-requires */
// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Metatype",
  tagline: "Types are cool",
  url: "https://metatype.dev",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",
  organizationName: "metatypedev",
  projectName: "metatype",
  trailingSlash: false,
  stylesheets: [
    {
      href: "https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap",
      type: "text/css",
    },
  ],
  plugins: [
    () => ({
      name: "pyLoader",
      configureWebpack() {
        return {
          module: {
            rules: [
              {
                test: /\.py$/i,
                loader: "raw-loader",
              },
            ],
          },
        };
      },
    }),
    require.resolve("docusaurus-lunr-search"),
  ],
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: "https://github.com/metatypedev/metatype/tree/main/website/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: "METATYPE",
        logo: {
          alt: "Metatype Logo",
          src: "img/logo.svg",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "useCases",
            position: "left",
            label: "Use cases",
          },
          {
            type: "docSidebar",
            sidebarId: "tutorials",
            position: "left",
            label: "Tutorials",
          },
          {
            type: "docSidebar",
            sidebarId: "howToGuides",
            position: "left",
            label: "Guides",
          },
          {
            type: "docSidebar",
            sidebarId: "concepts",
            position: "left",
            label: "Concepts",
          },
          {
            type: "docSidebar",
            sidebarId: "references",
            position: "left",
            label: "References",
          },
          {
            href: "https://github.com/metatypedev/metatype",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Docs",
            items: [
              {
                label: "Quickstart",
                to: "/docs/tutorials/quickstart",
              },
            ],
          },
          {
            title: "Community",
            items: [
              {
                label: "Stack Overflow",
                href: "https://stackoverflow.com/questions/tagged/metatype",
              },
              {
                label: "Discord",
                href: "https://discord.gg/PSyYcEHyw5",
              },
              {
                label: "Twitter",
                href: "https://twitter.com/metatypedev",
              },
            ],
          },
          {
            title: "More",
            items: [
              {
                label: "GitHub",
                href: "https://github.com/metatypedev/metatype",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Metatype.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;

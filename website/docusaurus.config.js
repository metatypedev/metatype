/* eslint-disable @typescript-eslint/no-var-requires */
// @ts-check

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

const organizationName = "metatypedev";
const projectName = "metatype";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Metatype",
  // prettier-ignore
  tagline: "Open-source, low-code backend platform for developers — build modular APIs with zero-trust and serverless deployment, no matter where and how (legacy) systems are.",
  url: "https://metatype.dev",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "images/favicon.ico",
  organizationName,
  projectName,
  trailingSlash: false,
  customFields: {
    tgUrl: process.env.TG_URL,
  },
  stylesheets: [
    {
      href: "https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap",
      type: "text/css",
    },
  ],
  plugins: [
    "docusaurus-plugin-sass",
    require("./packages/tailwindcss"),
    require("./packages/code-loader"),
    require("./packages/changelog"),
    [
      "docusaurus-graphql-plugin",
      {
        id: "typegate",
        schema: "http://localhost:7890/typegate",
        routeBasePath: "/docs/reference/typegate/internal-api/typegate",
      },
    ],
    [
      "docusaurus-graphql-plugin",
      {
        id: "prisma-migration",
        schema: "http://localhost:7890/typegate/prisma_migration",
        routeBasePath: "/docs/reference/typegate/internal-api/prisma-migration",
      },
    ],
    [
      "posthog-docusaurus",
      {
        apiKey: "phc_xeoqjAATkOtdpBmixBDIbLp6wCDSo87kAjdKCILQc8U",
        appUrl: "https://eu.posthog.com",
        enableInDevelopment: false,
        persistence: "memory",
      },
    ],
    [
      "docusaurus-plugin-sentry",
      {
        DSN: "d951b2e2b71d43e0b2fc41555cf8bf75@sentry.triage.dev/5",
      },
    ],
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "marketing",
        path: "use-cases",
        routeBasePath: "/use-cases",
        sidebarPath: require.resolve("./use-cases/sidebars.js"),
        editUrl: "https://github.com/metatypedev/metatype/tree/main/website/",
      },
    ],
    "docusaurus-lunr-search",
  ],
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  presets: [
    [
      "@docusaurus/preset-classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          id: "docs",
          path: "docs",
          routeBasePath: "/docs",
          sidebarPath: require.resolve("./docs/sidebars.js"),
          editUrl: "https://github.com/metatypedev/metatype/tree/main/website/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.scss"),
        },
        sitemap: {
          changefreq: "weekly",
          filename: "sitemap.xml",
        },
      }),
    ],
  ],
  themes: ["docusaurus-theme-frontmatter"],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: "light",
        disableSwitch: true,
      },
      navbar: {
        title: "Metatype",
        logo: {
          alt: "Metatype Logo",
          src: "images/logo.svg",
        },
        items: [
          {
            type: "docSidebar",
            docsPluginId: "marketing",
            sidebarId: "useCases",
            position: "left",
            label: "Use cases",
          },
          {
            type: "docSidebar",
            docsPluginId: "docs",
            sidebarId: "docs",
            position: "left",
            label: "Docs",
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
                label: "Getting started",
                to: "/docs/tutorials/getting-started",
              },
              {
                label: "Concepts",
                to: "/docs/concepts/overview",
              },
              {
                label: "Changelog",
                to: "/docs/reference/changelog",
              },
            ],
          },
          {
            title: "Community",
            items: [
              {
                label: "GitHub",
                href: "https://github.com/metatypedev/metatype/discussions",
              },
              {
                label: "Stack Overflow",
                href: "https://stackoverflow.com/questions/tagged/metatype",
              },
              {
                label: "Twitter",
                href: "https://twitter.com/metatypedev",
              },
              {
                label: "LinkedIn",
                href: "https://www.linkedin.com/company/91505656/admin/",
              },
            ],
          },
          {
            title: "Company",
            items: [
              {
                label: "Terms & conditions",
                href: "/legal/terms",
              },
              {
                label: "Privacy policy",
                href: "/legal/privacy-policy",
              },
            ],
          },
        ],
        copyright: `Copyright © Metatype OÜ.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;

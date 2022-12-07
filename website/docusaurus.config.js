/* eslint-disable @typescript-eslint/no-var-requires */
// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion
const fs = require("fs/promises");

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

const organizationName = "metatypedev";
const projectName = "metatype";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Metatype",
  tagline: "Free and open ecosystem for API composition.",
  url: "https://metatype.dev",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",
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
    "docusaurus-tailwindcss",
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
    () => ({
      name: "releases",
      async loadContent() {
        const file = "docs/reference/changelog.mdx";
        const content = await fs.readFile(file, "utf8");
        const { ctime } = await fs.stat(file);
        if (new Date() - ctime < 24 * 60 * 60 * 1000) {
          console.log("cached releases");
          return content;
        }

        const res = await fetch(
          `https://api.github.com/repos/${organizationName}/${projectName}/releases?per_page=100&page=1`
        ).then((r) => r.json());

        const changelog = res
          .filter((r) => !r.draft)
          .map(
            ({ html_url, name, tag_name, body, prerelease, created_at }) =>
              `## [${name !== "" ? name : tag_name}](${html_url}) (${
                prerelease ? "Prerelease, " : ""
              }${new Date(created_at).toLocaleDateString("en-US")})\n\n${body}`
          )
          .join("\n\n");

        const header = content.split("# Changelog")[0];
        await fs.writeFile(file, `${header}\n\n# Changelog\n\n${changelog}`);
        console.log("freshly loaded release");
      },
    }),
    [
      "posthog-docusaurus",
      {
        apiKey: "phc_xeoqjAATkOtdpBmixBDIbLp6wCDSo87kAjdKCILQc8U",
        appUrl: "https://eu.posthog.com",
        enableInDevelopment: false,
        persistence: "memory",
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
          sidebarPath: require.resolve("./sidebars.js"),
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
            sidebarId: "guides",
            position: "left",
            label: "Guides",
          },
          {
            type: "docSidebar",
            sidebarId: "reference",
            position: "left",
            label: "Reference",
          },
          {
            type: "docSidebar",
            sidebarId: "concepts",
            position: "left",
            label: "Concepts",
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
                to: "/docs/tutorials/getting-started",
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
                label: "Privacy policy",
                href: "/legal/privacy-policy",
              },
              {
                label: "Terms & conditions",
                href: "/legal/terms",
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

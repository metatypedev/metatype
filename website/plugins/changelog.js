/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require("fs/promises");

const plugin = (context) => ({
  name: "changelog",
  extendCli(cli) {
    const { organizationName, projectName } = context.siteConfig;
    cli
      .command(["docs", "generate", "changelog"].filter(Boolean).join(":"))
      .description("Generate the changelog based on Github releases.")
      .action(async () => {
        const file = "docs/reference/changelog.mdx";
        const content = await fs.readFile(file, "utf8").catch(() => "");
        const header = content.split("# Changelog")[0];

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

        await fs.writeFile(file, `${header}\n\n# Changelog\n\n${changelog}`);
        console.log("freshly loaded release");
      });
  },
});

module.exports = plugin;

/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require("fs/promises");

module.exports = (context) => ({
  name: "changelog",
  extendCli(cli) {
    const { organizationName, projectName } = context.siteConfig;
    cli
      .command(["docs", "generate", "changelog"].filter(Boolean).join(":"))
      .description("Generate the changelog based on Github releases.")
      .action(async () => {
        const file = "docs/reference/changelog.mdx";
        const content = await fs.readFile(file, "utf8").catch(() => "");
        const header = content.split("\n\n<!-- vale off -->")[0];

        const res = await fetch(
          `https://api.github.com/repos/${organizationName}/${projectName}/releases?per_page=100&page=1`
        );

        if (res.status !== 200) {
          console.error(
            "failed to load releases, got ${res.status} from Github"
          );
          return;
        }

        const changelog = (await res.json())
          .filter((r) => !r.draft)
          .map(({ html_url, name, tag_name, body, created_at }) => {
            const releaseName = name !== "" ? name : tag_name;
            const date = new Date(created_at).toLocaleDateString("en-US");
            const content = body
              .replaceAll(/\n(#[^\n]+)(?=\n)/g, "\n#$1\n")
              .replaceAll(
                /(https:\/\/github.com\/.+\/pull\/([0-9]+))/g,
                "[#$2]($1)"
              )
              .replaceAll(
                /(https:\/\/github.com\/.+\/compare\/(.+))/g,
                "[$2]($1)"
              );
            return `## [${releaseName}](${html_url}) (${date})\n\n${content}`;
          })
          .join("\n\n");

        const doc = `
${header}

<!-- vale off -->

${changelog}

<!-- vale on -->
        `.trim();

        await fs.writeFile(file, doc);
        console.log("freshly loaded release");
      });
  },
});

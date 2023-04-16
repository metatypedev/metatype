/* eslint-disable @typescript-eslint/no-var-requires */

const path = require("path");

const projectDir = path.resolve(__dirname, "../..");

module.exports = function (source) {
  const content = JSON.parse(
    source
      .trim()
      .replace(/^module\.exports *= */, "")
      .replace(/;$/, "")
  );
  const relPath = path.relative(projectDir, this.resourcePath);
  const exp = `${relPath}\n${content}`;
  return `module.exports = ${JSON.stringify(exp)};`;
};

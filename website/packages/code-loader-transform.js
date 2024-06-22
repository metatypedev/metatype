/* eslint-disable @typescript-eslint/no-var-requires */
const deindent = require("de-indent");
const path = require("path");
const { spawn } = require("child_process");

const projectDir = path.resolve(__dirname, "../..");

const commentsPrefix = {
  py: "#",
  ts: "//",
};

const postTransformations = {
  py: (source) => source.replaceAll(/ {4}/g, "  "),
  ts: (source) => source,
};

module.exports = async function (source) {
  const relPath = path.relative(projectDir, this.resourcePath);
  const ext = relPath.split(".").pop();
  const prefix = commentsPrefix[ext];

  if (ext === "py") {
    source = await new Promise((resolve, reject) => {
      const child = spawn("ruff", ["format", "--line-length", "70", "-"]);
      child.stdin.write(source);
      child.stdin.end();
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (data) => {
        stdout += data;
      });
      child.stderr.on("data", (data) => {
        stderr += data;
      });
      child.on("exit", function () {
        if (stderr.length > 0) {
          reject(new Error(`Failed to format python code: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });
    console.log(this.resourcePath, source);
  }

  const ret = [];
  let skipping = false;
  const lines = source.split("\n");
  for (let cursor = 0; cursor < lines.length; cursor += 1) {
    const line = lines[cursor];
    if (line.trim().startsWith(prefix)) {
      if (line.includes("skip:start")) {
        if (skipping) {
          throw new Error("skip:start without skip:end");
        }
        skipping = true;
        continue;
      } else if (line.includes("skip:end")) {
        if (!skipping) {
          throw new Error("skip:end without skip:start");
        }
        skipping = false;
        continue;
      } else if (line.includes("skip:next-line")) {
        if (skipping) {
          throw new Error("skip:next-line without skip:end");
        }
        cursor += 1;
        continue;
      }
    }
    if (!skipping) {
      ret.push(line);
    }
  }

  const transformation = postTransformations[ext] ?? ((src) => src);
  const content = transformation(deindent(ret.join("\n"))).trim();

  return `module.exports = ${JSON.stringify({
    content,
    path: relPath,
  })};`;
};

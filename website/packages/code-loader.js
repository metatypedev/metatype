// eslint-disable-next-line @typescript-eslint/no-var-requires
const deindent = require("de-indent");

const commentsPrefix = {
  py: "#",
  ts: "//",
};

const postTransformations = {
  py: (source) => source.replaceAll(/ {4}/g, "  "),
  ts: (source) => source,
};

function loader(source) {
  const ext = this.resourcePath.split(".").pop();
  const prefix = commentsPrefix[ext];

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

  const transformation = postTransformations[ext];

  const exp = transformation(deindent(ret.join("\n"))).trim();
  return `module.exports = ${JSON.stringify(exp)};`;
}

module.exports = loader;

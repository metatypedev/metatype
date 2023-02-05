const commentsPrefix = ["#", "//"];

const loader = (source) => {
  const ret = [];
  let skipping = false;
  const lines = source.split("\n");
  for (let cursor = 0; cursor < lines.length; cursor += 1) {
    const line = lines[cursor];
    if (commentsPrefix.some((prefix) => line.trim().startsWith(prefix))) {
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
  const exp = ret.join("\n").replaceAll(/ {4}/g, "  ");
  return `module.exports = ${JSON.stringify(exp)};`;
};

module.exports = loader;

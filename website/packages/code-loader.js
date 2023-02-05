const commentsPrefix = ["#", "//"];

const loader = (source) => {
  const ret = [];
  let skipping = false;
  for (const line of source.split("\n")) {
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
      }
    }
    if (!skipping) {
      ret.push(line);
    }
  }
  return `export default ${JSON.stringify(ret.join("\n"))};`;
};

module.exports = loader;

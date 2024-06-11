// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";

// isort: off
// skip:end
// highlight-next-line
import { HttpRuntime } from "@typegraph/sdk/runtimes/http.js";

await typegraph(
  {
    name: "http-example",
    // skip:next-line
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    // highlight-next-line
    const facts = new HttpRuntime("https://uselessfacts.jsph.pl/api/v2/facts");
    const pub = Policy.public();

    g.expose(
      {
        facts: facts.get(
          t.struct({
            language: t.enum_(["en", "de"]),
          }),
          t.struct({
            id: t.string(),
            text: t.string(),
            source: t.string(),
            source_url: t.string(),
            language: t.string(),
            permalink: t.string(),
          }),
          {
            path: "/random",
          }
        ),
        facts_as_text: facts.get(
          t.struct({
            header_accept: t.string().set("text/plain"),
            language: t.enum_(["en", "de"]),
          }),
          t.string(),
          { path: "/random", headerPrefix: "header_" }
        ),
      },
      pub
    );
  }
);

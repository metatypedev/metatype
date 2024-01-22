// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { HttpRuntime } from "@typegraph/sdk/runtimes/http.js";

// skip:end

typegraph({
  name: "graphql-server",
  // skip:next-line
  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
}, (g) => {
  const pub = Policy.public();

  const github = new HttpRuntime("https://api.github.com");

  const stargazer = t.struct(
    {
      "login": t.string().rename("login"),
      "user": github.get(
        t.struct({ "user": t.string().fromParent("login") }),
        t.struct({ "name": t.string().optional() }),
        { path: "/users/{user}" },
      ),
    },
  );

  g.expose({
    stargazers: github.get(
      t.struct({}),
      t.list(stargazer),
      { path: "/repos/metatypedev/metatype/stargazers?per_page:2" },
    ),
  }, pub);
});

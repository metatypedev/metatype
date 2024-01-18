// skip:start

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { Auth } from "@typegraph/sdk/params.js";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma.js";
import { HttpRuntime } from "@typegraph/sdk/runtimes/http.js";

// skip:end

typegraph({
  name: "homepage",
}, (g) => {
  // every field may be controlled by a policy
  const pub = Policy.public();
  const metaOnly = Policy.context("email", /.+@metatype.dev/);
  const publicWriteOnly = Policy.on({ create: pub, read: metaOnly });

  // define runtimes where your queries are executed
  const github = new HttpRuntime("https://api.github.com");
  const db = new PrismaRuntime("demo", "POSTGRES_CONN");

  // a feedback object stored in Postgres
  const feedback = t.struct(
    {
      "id": t.uuid({ asId: true, config: { "auto": true } }),
      "email": t.email().withPolicy(publicWriteOnly),
      "message": t.string({ min: 1, max: 2000 }, {}),
    },
  ).rename("feedback");

  // a stargazer object from Github
  const stargazer = t.struct(
    {
      "login": t.string({}, { name: "login" }),
      // link with the feedback across runtimes
      "user": github.get(
        t.struct({ "user": t.string().fromParent("login") }),
        t.struct({ "name": t.string().optional() }),
        { path: "/users/{user}" },
      ),
    },
  );

  // skip:next-line
  // out of the box authenfication support
  g.auth(Auth.oauth2Github("openid email"));

  // expose part of the graph for queries
  g.expose({
    stargazers: github.get(
      t.struct({}),
      t.list(stargazer),
      { path: "/repos/metatypedev/metatype/stargazers?per_page:2" },
    ),
    // automatically generate crud operations
    send_feedback: db.create(feedback),
    list_feedback: db.findMany(feedback),
  }, pub);
});

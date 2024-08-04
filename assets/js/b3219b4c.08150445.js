"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[3099],{83890:e=>{e.exports=JSON.parse('{"archive":{"blogPosts":[{"id":"/2024/05/09/programmatic-deployment","metadata":{"permalink":"/blog/2024/05/09/programmatic-deployment","editUrl":"https://github.com/metatypedev/metatype/tree/main/website/blog/2024-05-09-programmatic-deployment/index.mdx","source":"@site/blog/2024-05-09-programmatic-deployment/index.mdx","title":"Programmatic deployment (v0.4.x)","description":"A new approach to deploying typegraphs has been introduced starting with version 0.4.0. This aims to facilitate the development of automation tools around the APIs you build within the Metatype ecosystem.","date":"2024-05-09T00:00:00.000Z","tags":[],"readingTime":3.405,"hasTruncateMarker":false,"authors":[],"frontMatter":{},"unlisted":false,"nextItem":{"title":"The Node/Deno SDK is now available","permalink":"/blog/2023/11/27/node-compatibility"}},"content":"import SDKTabs from \\"@site/src/components/SDKTabs\\";\\nimport TabItem from \\"@theme/TabItem\\";\\nimport UpgradePythonSDK from \\"../../shared/upgrade/python-sdk.mdx\\";\\nimport UpgradeTsSDK from \\"../../shared/upgrade/typescript-sdk.mdx\\";\\n\\n\\nA new approach to deploying typegraphs has been introduced starting with version 0.4.0. This aims to facilitate the development of automation tools around the APIs you build within the Metatype ecosystem.\\n\\n## What has changed?\\n\\nBefore v0.4.x, we had to entirely rely on the [meta cli](/docs/reference/meta-cli) to deploy typegraphs to a typegate instance.\\n\\nThis is no longer the case, as all core logic has been moved to the TypeScript/Python typegraph SDKs, both of which share the same WebAssembly-based **typegraph-core** behind the scenes. This provides some degree of assurance that you will have nearly identical experiences with each SDK.\\n\\n## What are the use-cases?\\n\\nSince typegraphs can be written using the programming language your preferred SDK is based on, you can dynamically create typegraphs with ease.\\n\\nThe missing piece was having an interface natively backed inside the SDK for doing deployment programmatically.\\n\\n### Programmatic deployment\\n\\n### Initial setup\\n\\nJust like any other dependency in your favorite programming language, each SDKs can be installed with your favorite package manager.\\n\\nYou can use one of the commands below to get started with the latest available version.\\n\\n<SDKTabs>\\n  <TabItem value=\\"typescript\\">\\n    <UpgradeTsSDK />\\n  </TabItem>\\n  <TabItem value=\\"python\\">\\n    <UpgradePythonSDK />\\n  </TabItem>\\n</SDKTabs>\\n\\n#### Configuration\\n\\nThis is analoguous to the yaml configuration file when you are using [meta cli](/docs/reference/meta-cli).\\n\\nIt\'s the place where you tell which typegate you want to deploy to, how you want the artifacts to be resolved, among other settings.\\n\\n<SDKTabs>\\n    <TabItem value=\\"python\\">\\n\\n```python\\nconfig: TypegraphDeployParams = TypegraphDeployParams(\\n        typegate=TypegateConnectionOptions(url=\\"<TYPEGATE_URL>\\", auth=BasicAuth(\\"<USERNAME>\\", \\"<PASSWORD>\\")),\\n        typegraph_path=os.path.join(cwd, \\"path-to-typegraph\\"),\\n        prefix=\\"\\",\\n        secrets={},\\n        migrations_dir=path.join(\\"prisma-migrations\\", example.name),\\n        migration_actions=None,\\n        default_migration_action=MigrationAction(\\n            apply=True,\\n            reset=True,  # allow destructive migrations\\n            create=True,\\n        ),\\n    )\\n```\\n\\n    </TabItem>\\n    <TabItem value=\\"typescript\\">\\n\\n```typescript\\nconst config = {\\n  typegate: {\\n    url: \\"<TYPEGATE_URL>\\",\\n    auth: new BasicAuth(\\"<USERNAME>\\", \\"<PASSWORD>\\"),\\n  },\\n  typegraphPath: path.join(cwd, \\"path-to-typegraph.ts\\"),\\n  prefix: \\"\\",\\n  secrets: { POSTGRES: \\"<DB_URL>\\" },\\n  migrationsDir: path.join(\\"prisma-migrations\\", tg.name),\\n  defaultMigrationAction: {\\n    create: true,\\n    reset: true, // allow destructive migrations\\n  },\\n};\\n```\\n\\n    </TabItem>\\n\\n</SDKTabs>\\n\\n### Deploy/remove\\n\\nNow, picture this, you have a lot of typegraphs and one or more typegate instance(s) running, you can easily make small scripts that does any specific job you want.\\n\\n```typescript\\n// ..\\nimport { tgDeploy, tgRemove } from \\"@typegraph/sdk/tg_deploy.js\\";\\n// ..\\n\\nconst BASIC_AUTH = loadMyAuthsFromSomeSource();\\nconst TYPEGATE_URL = \\"...\\";\\n\\nexport async function getTypegraphs() {\\n  // Suppose we have these typegraphs..\\n  // Let\'s enumerate them like this to simplify\\n  return [\\n    {\\n      tg: await import(\\"path/to/shop-finances\\"),\\n      location: \\"path/to/shop-finances.ts\\",\\n    },\\n    {\\n      tg: await import(\\"path/to/shop-stats\\"),\\n      location: \\"path/to/shop-stats.ts\\",\\n    },\\n  ];\\n}\\n\\nexport function getConfig(tgName: string, tgLocation: string) {\\n  // Note: You can always develop various ways of constructing the configuration,\\n  // like loading it from a file.\\n  return {\\n    typegate: {\\n      url: \\"<TYPEGATE_URL>\\",\\n      auth: new BasicAuth(\\"<USERNAME>\\", \\"<PASSWORD>\\"),\\n    },\\n    typegraphPath: path.join(cwd, \\"path-to-typegraph.ts\\"),\\n    prefix: \\"\\",\\n    secrets: { POSTGRES: \\"<DB_URL>\\" },\\n    migrationsDir: path.join(\\"prisma-migrations\\", tg.name),\\n    defaultMigrationAction: {\\n      create: true,\\n      reset: true, // allow destructive migrations\\n    },\\n  };\\n}\\n\\nexport async function deployAll() {\\n  const typegraphs = await getTypegraphs();\\n  for (const { tg, location } of typegraphs) {\\n    try {\\n      const config = getConfig(tg.name, location);\\n      // use tgDeploy to deploy typegraphs, it will contain the response from typegate\\n      const { typegate } = await tgDeploy(tg, config);\\n      const selection = typegate?.data?.addTypegraph;\\n      if (selection) {\\n        const { messages } = selection;\\n        console.log(messages.map(({ text }) => text).join(\\"\\\\n\\"));\\n      } else {\\n        throw new Error(JSON.stringify(typegate));\\n      }\\n    } catch (e) {\\n      console.error(\\"[!] Failed deploying\\", tg.name);\\n      console.error(e);\\n    }\\n  }\\n}\\n\\nexport async function undeployAll() {\\n  const typegraphs = await getTypegraphs();\\n  for (const { tg } of typegraphs) {\\n    try {\\n      // use tgRemove to remove typegraphs\\n      const { typegate } = await tgRemove(\\"<TYPEGRAPH_NAME>\\", {\\n        baseUrl: TYPEGATE_URL,\\n        auth: BASIC_AUTH,\\n      });\\n      console.log(typegate);\\n    } catch (e) {\\n      console.error(\\"Failed removing\\", tg.name);\\n      console.error(e);\\n    }\\n  }\\n}\\n```\\n\\n### Going beyond\\n\\nWith these new additions, you can automate virtually anything programmatically on the typegraph side. Starting from having highly dynamic APIs to providing ways to deploy and configure them, you can even build a custom framework around the ecosystem!\\n\\nPlease tell us what you think and report any issues you found on [Github](https://github.com/metatypedev/metatype/issues).\\n\\n:::info Notes\\n\\nYou can check the [Programmatic deployment](/docs/guides/programmatic-deployment) reference page for more information.\\n\\n:::"},{"id":"/2023/11/27/node-compatibility","metadata":{"permalink":"/blog/2023/11/27/node-compatibility","editUrl":"https://github.com/metatypedev/metatype/tree/main/website/blog/2023-11-27-node-compatibility/index.mdx","source":"@site/blog/2023-11-27-node-compatibility/index.mdx","title":"The Node/Deno SDK is now available","description":"We are happy to announce that we have redesigned our SDKs to support Node/Deno and facilitate the integration of future languages. Most of the typegraph SDK is now written in Rust and shaped around a core interface running in WebAssembly.","date":"2023-11-27T00:00:00.000Z","tags":[],"readingTime":1.7,"hasTruncateMarker":false,"authors":[],"frontMatter":{},"unlisted":false,"prevItem":{"title":"Programmatic deployment (v0.4.x)","permalink":"/blog/2024/05/09/programmatic-deployment"},"nextItem":{"title":"Programmable glue for developers","permalink":"/blog/2023/06/18/programmable-glue"}},"content":"We are happy to announce that we have redesigned our SDKs to support Node/Deno and facilitate the integration of future languages. Most of the [typegraph SDK](/docs/reference/typegraph) is now written in Rust and shaped around a core interface running in WebAssembly.\\n\\n## Meet `wit`\\n\\nIn the realm of WebAssembly, the [wit-bindgen](https://github.com/bytecodealliance/wit-bindgen) project emerges as the most mature tool to create and maintain the language bindings for WebAssembly modules. This tool introduces WIT (WebAssembly Interface Types) as an Interface Definition Language (IDL) to describe the imports, exports, and capabilities of WebAssembly components seamlessly.\\n\\nFor example, Metatype implements the reactor pattern to handle requests as they come and delegate part of their execution in correct WASM runtime. The wit-bindgen helps there to define the interfaces between the guest (the Metatype runtime) and the host (the typegate) to ensure the correct serialization of the payloads. The `wit` definition could look like this:\\n\\n```\\npackage metatype:wit-wire;\\n\\ninterface typegate-wire {\\n  hostcall: func(op-name: string, json: string) -> result<string, string>;\\n}\\n\\ninterface mat-wire {\\n  record handle-req {\\n    op-name: string,\\n    in-json: string,\\n  }\\n\\n  handle: func(req: handle-req) -> result<string, string>;\\n}\\n\\nworld wit-wire {\\n  import typegate-wire;\\n\\n  export mat-wire;\\n}\\n```\\n\\nThe `wit` file is then used to generate the bindings for the host and the guest in Rust, TypeScript, Python, and other languages. The host bindings are used in the typegate to call the WASM runtime, and the guest bindings are used in the WASM runtime to call the typegate.\\n\\n## Install the v0.2.x series\\n\\nThe documentation contains now examples for Node and Deno.\\n\\n### Upgrade with Node\\n\\n```bash\\nnpm install @typegraph/sdk\\nmeta new --template node .\\n```\\n\\n### Upgrade with Deno\\n\\n```bash\\nmeta new --template deno .\\n```\\n\\n```typescript\\nimport { typegraph } from \\"npm:@typegraph/sdk/index.js\\";\\n```\\n\\n### Upgrade with Python\\n\\n```python\\npip3 install --upgrade typegraph\\npoetry add typegraph@latest\\n```\\n\\n## Give us feedback!\\n\\nThis new release enables us to provide a consistent experience across all languages and reduce the work to maintain the existing Python SDK.\\n\\nAs always, report issues and let us know what you think on [GitHub](https://github.com/metatypedev/metatype/discussions)."},{"id":"/2023/06/18/programmable-glue","metadata":{"permalink":"/blog/2023/06/18/programmable-glue","editUrl":"https://github.com/metatypedev/metatype/tree/main/website/blog/2023-06-18-programmable-glue/index.mdx","source":"@site/blog/2023-06-18-programmable-glue/index.mdx","title":"Programmable glue for developers","description":"We are introducing Metatype, a new project that allows developers to build modular and strongly typed APIs using typegraph as a programmable glue.","date":"2023-06-18T00:00:00.000Z","tags":[],"readingTime":1.295,"hasTruncateMarker":false,"authors":[],"frontMatter":{},"unlisted":false,"prevItem":{"title":"The Node/Deno SDK is now available","permalink":"/blog/2023/11/27/node-compatibility"},"nextItem":{"title":"Emulating your server nodes locally","permalink":"/blog/2023/03/15/emulating-servers"}},"content":"import { CompareLandscape } from \\"@site/src/components/CompareLandscape\\";\\nimport Metatype from \\"@site/shared/metatype-intro.mdx\\";\\nimport TGExample from \\"@site/src/components/TGExample\\";\\n\\n\\nWe are introducing Metatype, a new project that allows developers to build modular and strongly typed APIs using typegraph as a programmable glue.\\n\\n## What is Metatype?\\n\\n<Metatype />\\n\\n## What are virtual graphs?\\n\\nTypegraphs are a declarative way to expose all APIs, storage and business logic of your stack as a single graph. They take inspiration from domain-driven design principles and in the idea that the relation between of the data is as important as data itself, even though they might be in different locations or shapes.\\n\\n<TGExample\\n  python={require(\\"!!code-loader!../../../examples/typegraphs/index.py\\")}\\n  typescript={require(\\"!!code-loader!../../../examples/typegraphs/index.ts\\")}\\n  typegraph=\\"homepage\\"\\n  variables={{ email: \\"fill-me\\", message: \\"Great tool!\\" }}\\n  defaultMode=\\"typegraph\\"\\n  query={require(\\"../../src/pages/index.graphql\\")}\\n/>\\n\\nThese elements can then be combined and composed together similarly on how you would compose web components to create an interface in modern frontend practices. This allows developers to build modular and strongly typed APIs using typegraph as a programmable glue.\\n\\n## Where does this belong in the tech landscape?\\n\\nBefore Metatype, there was a gap in the technological landscape for a solution that specifically addressed the transactional, short-lived use cases. While there were existing tools for analytical or long-running use cases, such as Trino and Temporal, there was no generic engine for handling transactional, short-lived tasks.\\n\\n    <CompareLandscape />\\n\\n## Give it a try!\\n\\nLet us know what you think! Metatype is open source and we welcome any feedback or contributions. The community primarily lives on [GitHub](https://github.com/metatypedev/metatype).\\n\\n:::info Next steps\\n\\n[Build your first typegraph](/docs/tutorials/metatype-basics) or read more about the [concepts behind Metatype](/docs/concepts/mental-model).\\n\\n:::"},{"id":"/2023/03/15/emulating-servers","metadata":{"permalink":"/blog/2023/03/15/emulating-servers","editUrl":"https://github.com/metatypedev/metatype/tree/main/website/blog/2023-03-15-emulating-servers/index.mdx","source":"@site/blog/2023-03-15-emulating-servers/index.mdx","title":"Emulating your server nodes locally","description":"Introducing the Embedded Typegate","date":"2023-03-15T00:00:00.000Z","tags":[],"readingTime":3.205,"hasTruncateMarker":false,"authors":[],"frontMatter":{},"unlisted":false,"prevItem":{"title":"Programmable glue for developers","permalink":"/blog/2023/06/18/programmable-glue"}},"content":"import BlogIntro from \\"@site/src/components/BlogIntro\\";\\nimport UpgradeMetatype from \\"../../shared/upgrade/index.mdx\\";\\n\\n\\n<BlogIntro text=\\"Metatype is a platform which allows developers to solely focus on functional aspect of their applications by powering them with rich declarative API development tools to program and deploy in a cloud first environment. One component of Metatype is the Typegate, a serverless GraphQL/REST gateway for processing queries. This post is about how we in metatype made a dev friendly access to a typegate instance namely Embedded Typegate.\\" />\\n\\n## Introducing the Embedded Typegate\\n\\nThe embedded typegate is a feature that comes with the [Meta CLI](/docs/reference/meta-cli) which provides the option of spinning a typegate instance from the CLI with minimum configurations and installations needed from the developer. All that is required to access the _Embedded Typegate_ is to install _Meta CLI_. The spawned typegate instance behaves similarly to cloud-deployed typegates.\\n\\n## The motive\\n\\nThere are more than a couple of reasons why a developer would be tempted to use an emedded typegate. While developers can start a typegate instance using docker compose, the developer needs to install docker as a dependency to run the typegate container. Even though docker is familiar among many developers, it can sometimes be tricky and unbeknownst to some developers. We at metatype highly value the developer experience and one reason for adding the _embedded typegate_ feature to the _Meta CLI_ is for users to have a smooth experience with our system by providing a docker compose free experience.\\nThis feature provides a great utility for developers to author and test typegraphs in their local machine before deploying them to production level typegate instances on the cloud.\\nAdditionally, developers need not concern themselves with deployment configurations which are needed only during deployment. The only need to focus their energy and time in developing the right application and easily test them on _embedded typegate_ running from the terminal. To add more to what is said, as the typegate engine keeps evolving, users will be abstracted away from the different configurations which might be added on the future. The _Meta CLI_ will abstract much of what\'s not needed in a dev environment. Thus, leaving less headaches to developers on new changes.\\nUltimately, The _embedded typegate_ is designed to be a good dev environment friendly tool which faciliates development time.\\n\\n## Quick First hand example\\n\\n### Install the v0.3.x series\\n\\nEither of the two [Typegraph](/docs/reference/typegraph) SDKs are needed to author typegraphs. For this example, the node SDK will be used.\\n\\nFirst, make sure the _Meta CLI_ is installed.\\n\\n```shell\\ncurl -fsSL https://raw.githubusercontent.com/metatypedev/metatype/main/installer.sh | bash\\n```\\n\\nNext, create a new node project using this command.\\n\\n```shell\\nmeta new --template node\\n```\\n\\nThe above command will create a sample typegraph which you can use to test the embedded typegate.\\n\\nNow, you need to install the typegraph SDK by running the command down below. The previous command generates a `package.json` with the SDK specified as a dependency.\\n\\n```shell\\nnpm install\\n```\\n\\nBefore deploying the typegraph to the embedded typegate, Run the following commands below.\\n\\nExecute this command to set `tg_secret` and `tg_admin_password` environment variables, which are neccessary for the typegate to run.\\n\\n```shell\\nexport tg_secret=a4lNi0PbEItlFZbus1oeH/+wyIxi9uH6TpL8AIqIaMBNvp7SESmuUBbfUwC0prxhGhZqHw8vMDYZAGMhSZ4fLw== tg_admin_password=password\\n```\\n\\nStart the typegate instance.\\n\\n```shell\\nmeta typegate\\n```\\n\\nNow that there is running instance of a typegate, you can deploy the example typegraph. From another terminal, run the command below.\\n\\n```shell\\nmeta deploy -f api/example.ts --allow-dirty --create-migration --target dev --gate http://localhost:7890\\n```\\n\\nThe typegate runs on port 7890 by default. If you access [http://localhost:7890/example](http://localhost:7890/example) on your browser, you can see an GraphQL interface to interact with the deployed typegraph. You can test the example typegraph using the following graphql query below.\\n\\n```graphql\\nquery {\\n  multilpy(first: 3, second: 5)\\n}\\n```\\n\\n<UpgradeMetatype />\\n\\n## Learn more about Metatype\\n\\nWanna dive deep into the basics of _Metaype_? check our interactive [tutorial](/docs/tutorials/metatype-basics) revolving around the core features of the system."}]}}')}}]);
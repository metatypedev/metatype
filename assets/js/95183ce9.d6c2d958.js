(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[6574],{28350:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>h,contentTitle:()=>l,default:()=>d,frontMatter:()=>i,metadata:()=>c,toc:()=>g});var r=t(86070),o=t(25710),p=t(65480),a=t(27676),s=t(7871);const i={},l="Programmatic deployment",c={id:"guides/programmatic-deployment/index",title:"Programmatic deployment",description:"The SDKs are complete enough to enable deploying typegraphs without using meta cli, the later being built as a convenience tool for everyday use.",source:"@site/docs/guides/programmatic-deployment/index.mdx",sourceDirName:"guides/programmatic-deployment",slug:"/guides/programmatic-deployment/",permalink:"/docs/guides/programmatic-deployment/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/docs/metatype.dev/docs/guides/programmatic-deployment/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Importing External Modules",permalink:"/docs/guides/import-external-modules/"},next:{title:"Test typegraphs",permalink:"/docs/guides/test-your-typegraph/"}},h={},g=[{value:"Deploy typegraphs",id:"deploy-typegraphs",level:2},{value:"Undeploy typegraphs",id:"undeploy-typegraphs",level:2}];function y(e){const n={a:"a",br:"br",code:"code",h1:"h1",h2:"h2",li:"li",p:"p",ul:"ul",...(0,o.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.h1,{id:"programmatic-deployment",children:"Programmatic deployment"}),"\n",(0,r.jsxs)(n.p,{children:["The SDKs are complete enough to enable deploying typegraphs without using ",(0,r.jsx)(n.a,{href:"/docs/reference/meta-cli",children:"meta cli"}),", the later being built as a convenience tool for everyday use."]}),"\n",(0,r.jsx)(n.p,{children:"Common use cases:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Testing"}),"\n",(0,r.jsx)(n.li,{children:"Manage everything programmatically"}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"deploy-typegraphs",children:"Deploy typegraphs"}),"\n",(0,r.jsxs)(n.p,{children:["This can be done using the ",(0,r.jsx)(n.code,{children:"tgDeploy"}),"/",(0,r.jsx)(n.code,{children:"tg_deploy"})," function.",(0,r.jsx)(n.br,{}),"\n","You are required to provide the configurations and also handle migrations by yourself (if any)."]}),"\n",(0,r.jsxs)(p.Ay,{children:[(0,r.jsx)(a.A,{value:"python",children:(0,r.jsx)(s.A,{language:"python",children:t(79796).content})}),(0,r.jsx)(a.A,{value:"typescript",children:(0,r.jsx)(s.A,{language:"typescript",children:t(80066).content})})]}),"\n",(0,r.jsx)(n.h2,{id:"undeploy-typegraphs",children:"Undeploy typegraphs"}),"\n",(0,r.jsxs)(n.p,{children:["Similarly to the above, you can undeploy typegraphs using the ",(0,r.jsx)(n.code,{children:"tgRemove"}),"/",(0,r.jsx)(n.code,{children:"tg_remove"})," function."]}),"\n",(0,r.jsxs)(p.Ay,{children:[(0,r.jsx)(a.A,{value:"python",children:(0,r.jsx)(s.A,{language:"python",children:t(25343).content})}),(0,r.jsx)(a.A,{value:"typescript",children:(0,r.jsx)(s.A,{language:"typescript",children:t(29985).content})})]})]})}function d(e={}){const{wrapper:n}={...(0,o.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(y,{...e})}):y(e)}},65480:(e,n,t)=>{"use strict";t.d(n,{Ay:()=>a,gc:()=>s});t(30758);var r=t(3733),o=t(56315),p=t(86070);function a(e){let{children:n}=e;const[t,a]=(0,r.e)();return(0,p.jsx)(o.mS,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,onChange:a,children:n})}function s(e){let{children:n}=e;const[t]=(0,r.e)();return(0,p.jsx)(o.q9,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,children:n})}},79796:e=>{e.exports={content:'# Copyright Metatype O\xdc, licensed under the Mozilla Public License Version 2.0.\n# SPDX-License-Identifier: MPL-2.0\n\nimport os\nfrom os import path\n\nfrom typegraph.gen.core import MigrationAction\nfrom typegraph.graph.shared_types import BasicAuth\nfrom typegraph.graph.tg_deploy import (\n  TypegraphDeployParams,\n  tg_deploy,\n  TypegateConnectionOptions,\n)\nfrom typegraph.runtimes.deno import DenoRuntime\nfrom typegraph import Graph, Policy, t, typegraph\n\n\n# Your typegraph\n@typegraph()\ndef example(g: Graph):\n  deno = DenoRuntime()\n  pub = Policy.public()\n\n  g.expose(\n    pub,\n    sayHello=deno.import_(\n      t.struct({"name": t.string()}),\n      t.string(),\n      module="scripts/say_hello.ts",\n      name="sayHello",\n    ),\n  )\n\n\n# Configure your deployment\ndef deploy():\n  base_url = "<TYPEGATE_URL>"\n  auth = BasicAuth("<USERNAME>", "<PASSWORD>")\n\n  config: TypegraphDeployParams = TypegraphDeployParams(\n    typegate=TypegateConnectionOptions(url=base_url, auth=auth),\n    typegraph_path=os.path.join(cwd, "path-to-typegraph"),\n    prefix="",\n    secrets={},\n    migrations_dir=path.join("prisma-migrations", example.name),\n    migration_actions=None,\n    default_migration_action=MigrationAction(\n      apply=True,\n      reset=True,  # allow destructive migrations\n      create=True,\n    ),\n  )\n\n  # Deploy to typegate\n  result = tg_deploy(example, config)  # pass your typegraph function name\n  return result\n\n\n# typegate response\nres = deploy()',path:"../tests/docs/how-tos/prog_deploy/prog_deploy.py"}},80066:e=>{e.exports={content:'import { Policy, t, typegraph } from "@typegraph/sdk";\nimport { DenoRuntime } from "@typegraph/sdk/runtimes/deno";\n// deno-lint-ignore no-external-import\nimport * as path from "node:path";\nimport { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy";\n\n// Your typegraph\nexport const tg = await typegraph("example", (g) => {\n  const deno = new DenoRuntime();\n  const pub = Policy.public();\n\n  g.expose(\n    {\n      sayHello: deno.import(t.struct({ name: t.string() }), t.string(), {\n        module: "scripts/say_hello.ts",\n        name: "sayHello",\n      }),\n    },\n    pub,\n  );\n});\n\n// Configure your deployment\nlet baseUrl = "<TYPEGATE_URL>";\nlet auth = new BasicAuth("<USERNAME>", "<PASSWORD>");\n\nconst config = {\n  typegate: {\n    url: baseUrl,\n    auth: auth,\n  },\n  typegraphPath: path.join(cwd, "path-to-typegraph.ts"),\n  prefix: "",\n  secrets: {},\n  migrationsDir: path.join("prisma-migrations", tg.name),\n  defaultMigrationAction: {\n    apply: true,\n    create: true,\n    reset: true, // allow destructive migrations\n  },\n};\n\n// Deploy to typegate\nconst deployResult = await tgDeploy(tg, config);',path:"../tests/docs/how-tos/prog_deploy/prog_deploy.ts"}},25343:e=>{e.exports={content:'# Copyright Metatype O\xdc, licensed under the Mozilla Public License Version 2.0.\n# SPDX-License-Identifier: MPL-2.0\n\n# ..\nfrom typegraph.graph.tg_deploy import (\n  TypegateConnectionOptions,\n  TypegraphRemoveParams,\n  tg_remove,\n)\n\nfrom typegraph import Graph, typegraph\nfrom typegraph.graph.shared_types import BasicAuth\n\n\n\n# Your typegraph\n@typegraph()\ndef example(g: Graph):\n  # ..\n\n\ndef remove():\n  base_url = "<TYPEGATE_URL>"\n  auth = BasicAuth("<USERNAME>", "<PASSWORD>")\n\n  result = tg_remove(\n    example.name,  # pass the typegraph name\n    params=TypegraphRemoveParams(\n      typegate=TypegateConnectionOptions(url=base_url, auth=auth),\n    ),\n  )\n\n  return result\n\n\n# Response from typegate\nres = remove()',path:"../tests/docs/how-tos/prog_deploy/prog_remove.py"}},29985:e=>{e.exports={content:'import { typegraph } from "@typegraph/sdk";\nimport { BasicAuth, tgRemove } from "@typegraph/sdk/tg_deploy";\n\n// Your typegraph\nconst tg = await typegraph("example", (_g) => {\n  // ...\n});\n\n\n// Response from typegate,\nconst result = await tgRemove(tg.name, {\n  // pass the typegraph name\n  typegate: {\n    url: baseUrl,\n    auth: auth,\n  },\n});',path:"../tests/docs/how-tos/prog_deploy/prog_remove.ts"}}}]);
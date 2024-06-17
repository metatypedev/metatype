"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[3855],{1897:(e,n,t)=>{t.d(n,{Ay:()=>r});var a=t(86070),o=t(25710);function i(e){const n={code:"code",em:"em",li:"li",p:"p",pre:"pre",ul:"ul",...(0,o.R)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsxs)(n.p,{children:["To upgrade the ",(0,a.jsx)(n.em,{children:"Python"})," SDK of the typegraph package, you can run either of the following commands based on the dependency manager you are using."]}),"\n",(0,a.jsxs)(n.ul,{children:["\n",(0,a.jsx)(n.li,{children:"pip"}),"\n"]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-shell",children:"pip3 install --upgrade typegraph\n"})}),"\n",(0,a.jsxs)(n.ul,{children:["\n",(0,a.jsx)(n.li,{children:"poetry"}),"\n"]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-shell",children:"poetry add typegraph@latest\n"})})]})}function r(e={}){const{wrapper:n}={...(0,o.R)(),...e.components};return n?(0,a.jsx)(n,{...e,children:(0,a.jsx)(i,{...e})}):i(e)}},8206:(e,n,t)=>{t.d(n,{Ay:()=>r});var a=t(86070),o=t(25710);function i(e){const n={code:"code",em:"em",li:"li",p:"p",pre:"pre",ul:"ul",...(0,o.R)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsxs)(n.p,{children:["To upgrade the ",(0,a.jsx)(n.em,{children:"Typescript"})," SDK of the typegraph package, you can use one of the following commands:"]}),"\n",(0,a.jsxs)(n.ul,{children:["\n",(0,a.jsx)(n.li,{children:"Node"}),"\n"]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-shell",children:"npm update @typegraph/sdk\n"})}),"\n",(0,a.jsxs)(n.ul,{children:["\n",(0,a.jsx)(n.li,{children:"Deno"}),"\n"]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-shell",children:'deno cache --reload "npm:@typegraph/sdk"\n'})})]})}function r(e={}){const{wrapper:n}={...(0,o.R)(),...e.components};return n?(0,a.jsx)(n,{...e,children:(0,a.jsx)(i,{...e})}):i(e)}},19057:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>d,contentTitle:()=>h,default:()=>y,frontMatter:()=>l,metadata:()=>p,toc:()=>g});var a=t(86070),o=t(25710),i=t(92465),r=t(51510),s=t(1897),c=t(8206);const l={},h="Programmatic deployment (v0.4.x)",p={permalink:"/blog/2024/05/09/programmatic-deployment",editUrl:"https://github.com/metatypedev/metatype/tree/main/website/blog/2024-05-09-programmatic-deployment/index.mdx",source:"@site/blog/2024-05-09-programmatic-deployment/index.mdx",title:"Programmatic deployment (v0.4.x)",description:"A new approach to deploying typegraphs has been introduced starting with version 0.4.0. This aims to facilitate the development of automation tools around the APIs you build within the Metatype ecosystem.",date:"2024-05-09T00:00:00.000Z",formattedDate:"May 9, 2024",tags:[],readingTime:3.605,hasTruncateMarker:!1,authors:[],frontMatter:{},unlisted:!1,nextItem:{title:"The Node/Deno SDK is now available",permalink:"/blog/2023/11/27/node-compatibility"}},d={authorsImageUrls:[]},g=[{value:"What has changed?",id:"what-has-changed",level:2},{value:"What are the use-cases?",id:"what-are-the-use-cases",level:2},{value:"Programmatic deployment",id:"programmatic-deployment",level:3},{value:"Initial setup",id:"initial-setup",level:3},{value:"Configuration",id:"configuration",level:4},{value:"Deploy/remove",id:"deployremove",level:3},{value:"Going beyond",id:"going-beyond",level:3}];function m(e){const n={a:"a",admonition:"admonition",code:"code",h2:"h2",h3:"h3",h4:"h4",p:"p",pre:"pre",strong:"strong",...(0,o.R)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(n.p,{children:"A new approach to deploying typegraphs has been introduced starting with version 0.4.0. This aims to facilitate the development of automation tools around the APIs you build within the Metatype ecosystem."}),"\n",(0,a.jsx)(n.h2,{id:"what-has-changed",children:"What has changed?"}),"\n",(0,a.jsxs)(n.p,{children:["Before v0.4.x, we had to entirely rely on the ",(0,a.jsx)(n.a,{href:"/docs/reference/meta-cli",children:"meta cli"})," to deploy typegraphs to a typegate instance."]}),"\n",(0,a.jsxs)(n.p,{children:["This is no longer the case, as all core logic has been moved to the TypeScript/Python typegraph SDKs, both of which share the same WebAssembly-based ",(0,a.jsx)(n.strong,{children:"typegraph-core"})," behind the scenes. This provides some degree of assurance that you will have nearly identical experiences with each SDK."]}),"\n",(0,a.jsx)(n.h2,{id:"what-are-the-use-cases",children:"What are the use-cases?"}),"\n",(0,a.jsx)(n.p,{children:"Since typegraphs can be written using the programming language your preferred SDK is based on, you can dynamically create typegraphs with ease."}),"\n",(0,a.jsx)(n.p,{children:"The missing piece was having an interface natively backed inside the SDK for doing deployment programmatically."}),"\n",(0,a.jsx)(n.h3,{id:"programmatic-deployment",children:"Programmatic deployment"}),"\n",(0,a.jsx)(n.h3,{id:"initial-setup",children:"Initial setup"}),"\n",(0,a.jsx)(n.p,{children:"Just like any other dependency in your favorite programming language, each SDKs can be installed with your favorite package manager."}),"\n",(0,a.jsx)(n.p,{children:"You can use one of the commands below to get started with the latest available version."}),"\n",(0,a.jsxs)(i.Ay,{children:[(0,a.jsx)(r.A,{value:"typescript",children:(0,a.jsx)(c.Ay,{})}),(0,a.jsx)(r.A,{value:"python",children:(0,a.jsx)(s.Ay,{})})]}),"\n",(0,a.jsx)(n.h4,{id:"configuration",children:"Configuration"}),"\n",(0,a.jsxs)(n.p,{children:["This is analoguous to the yaml configuration file when you are using ",(0,a.jsx)(n.a,{href:"/docs/reference/meta-cli",children:"meta cli"}),"."]}),"\n",(0,a.jsx)(n.p,{children:"It's the place where you tell which typegate you want to deploy to, how you want the artifacts to be resolved, among other settings."}),"\n",(0,a.jsxs)(i.Ay,{children:[(0,a.jsx)(r.A,{value:"python",children:(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-python",children:'config_params = MigrationConfig(\n    migration_dir= "path/to/prisma-migrations",\n    global_action=MigrationAction(\n        create=True, # allow creating migrations\n        reset=True  # allow destructive migrations\n    ),\n    runtime_actions=None,\n)\nartifacts_config = ArtifactResolutionConfig(\n    prisma_migration=config_params,\n    prefix=None,\n    dir=None,  # artifacts are resolved relative to this path\n    disable_artifact_resolution=None,\n    codegen=None,\n)\nconfig = TypegraphDeployParams(\n    base_url="<TYPEGATE_URL>",\n    auth=BasicAuth(username="<USERNAME>", password="<PASSWORD>"),\n    artifacts_config=artifacts_config,\n    secrets={"POSTGRES": "<DB_URL>"},\n)\n'})})}),(0,a.jsx)(r.A,{value:"typescript",children:(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-typescript",children:'const artifactsConfig = {\n  prismaMigration: {\n    globalAction: {\n      create: true, // allow creating migrations\n      reset: true, // allow destructive migrations\n    },\n    migrationDir: "path/to/prisma-migrations",\n  },\n dir: "." // artifacts are resolved relative to this path\n};\n\nconst config = {\n  baseUrl: "<TYPEGATE_URL>",\n  auth: new BasicAuth("<USERNAME>", "<PASSWORD>"),\n  secrets: { POSTGRES: "<DB_URL>" },\n  artifactsConfig,\n};\n'})})})]}),"\n",(0,a.jsx)(n.h3,{id:"deployremove",children:"Deploy/remove"}),"\n",(0,a.jsx)(n.p,{children:"Now, picture this, you have a lot of typegraphs and one or more typegate instance(s) running, you can easily make small scripts that does any specific job you want."}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-typescript",children:'// ..\nimport { tgDeploy, tgRemove } from "@typegraph/sdk/tg_deploy";\n// ..\n\nconst BASIC_AUTH = loadMyAuthsFromSomeSource();\nconst TYPEGATE_URL = "...";\n\nexport async function getTypegraphs() {\n  // Suppose we have these typegraphs..\n  // Let\'s enumerate them like this to simplify\n  return [\n    {\n      tg: await import("path/to/shop-finances"),\n      location: "path/to/shop-finances.ts",\n    },\n    {\n      tg: await import("path/to/shop-stats"),\n      location: "path/to/shop-stats.ts",\n    }\n  ];\n}\n\nexport function getConfig(tgName: string, tgLocation: string) {\n  // Note: You can always develop various ways of constructing the configuration,\n  // like loading it from a file.\n  return {\n    baseUrl: TYPEGATE_URL,\n    auth: BASIC_AUTH,\n    secrets: { /* .. */},\n    artifactsConfig: {\n      prismaMigration: {\n        // ..\n        // convention used by meta-cli but you are free to do whatever you want\n        migrationDir: "prisma-migrations/" + tgName,\n      },\n    },\n    typegraphPath: tgLocation,\n  };\n}\n\nexport async function deployAll() {\n  const typegraphs = await getTypegraphs();\n  for (const { tg, location } of typegraphs) {\n    try {\n      const config = getConfig(tg.name, location);\n      // use tgDeploy to deploy typegraphs, it will contain the response from typegate\n      const { typegate } = await tgDeploy(tg, config);\n      const selection = typegate?.data?.addTypegraph;\n      if (selection) {\n        const { messages } = selection;\n        console.log(messages.map(({ text }) => text).join("\\n"));\n      } else {\n        throw new Error(JSON.stringify(typegate));\n      }\n    } catch (e) {\n      console.error("[!] Failed deploying", tg.name);\n      console.error(e);\n    }\n  }\n}\n\nexport async function undeployAll() {\n  const typegraphs = await getTypegraphs();\n  for (const { tg } of typegraphs) {\n    try {\n      // use tgRemove to remove typegraphs\n      const { typegate } = await tgRemove(tg, {\n        baseUrl: TYPEGATE_URL,\n        auth: BASIC_AUTH,\n      });\n      console.log(typegate);\n    } catch (e) {\n      console.error("Failed removing", tg.name);\n      console.error(e);\n    }\n  }\n}\n'})}),"\n",(0,a.jsx)(n.h3,{id:"going-beyond",children:"Going beyond"}),"\n",(0,a.jsx)(n.p,{children:"With these new additions, you can automate virtually anything programmatically on the typegraph side.\nStarting from having highly dynamic APIs to providing ways to deploy and configure them, you can even build a custom framework around the ecosystem!"}),"\n",(0,a.jsxs)(n.p,{children:["Please tell us what you think and report any issues you found on ",(0,a.jsx)(n.a,{href:"https://github.com/metatypedev/metatype/issues",children:"Github"}),"."]}),"\n",(0,a.jsx)(n.admonition,{title:"Notes",type:"info",children:(0,a.jsxs)(n.p,{children:["You can check the ",(0,a.jsx)(n.a,{href:"/docs/guides/programmatic-deployment",children:"Programmatic deployment"})," reference page for more information."]})})]})}function y(e={}){const{wrapper:n}={...(0,o.R)(),...e.components};return n?(0,a.jsx)(n,{...e,children:(0,a.jsx)(m,{...e})}):m(e)}},92465:(e,n,t)=>{t.d(n,{Ay:()=>r,gc:()=>s});t(30758);var a=t(53096),o=t(43236),i=t(86070);function r(e){let{children:n}=e;const[t,r]=(0,a.e)();return(0,i.jsx)(o.mS,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,onChange:r,children:n})}function s(e){let{children:n}=e;const[t]=(0,a.e)();return(0,i.jsx)(o.q9,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,children:n})}}}]);
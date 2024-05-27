(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[4834],{3418:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>l,contentTitle:()=>a,default:()=>p,frontMatter:()=>c,metadata:()=>o,toc:()=>d});var r=n(86070),i=n(25710),s=n(93214);const c={},a="Injections",o={id:"reference/types/injections",title:"Injections",description:"Injection is a mechanism to get the value of a parameter from other sources than the graphql query.",source:"@site/docs/reference/types/injections.mdx",sourceDirName:"reference/types",slug:"/reference/types/injections",permalink:"/docs/reference/types/injections",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/types/injections.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Functions",permalink:"/docs/reference/types/functions"},next:{title:"Parameter Transformations",permalink:"/docs/reference/types/parameter-transformations"}},l={},d=[{value:"Static",id:"static",level:2},{value:"Parent",id:"parent",level:2},{value:"Context",id:"context",level:2},{value:"Secret",id:"secret",level:2},{value:"Dynamic",id:"dynamic",level:2},{value:"Example",id:"example",level:2}];function h(e){const t={a:"a",code:"code",h1:"h1",h2:"h2",li:"li",p:"p",strong:"strong",ul:"ul",...(0,i.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(t.h1,{id:"injections",children:"Injections"}),"\n",(0,r.jsxs)(t.p,{children:["Injection is a mechanism to get the value of a parameter from other sources than the graphql query.\nWhen a parameter is injected, no value is expected in the query, otherwise, the query will fail.\nThey are specified at the type level for input types that are direct children of a ",(0,r.jsx)(t.code,{children:"t.struct"}),"."]}),"\n",(0,r.jsx)(t.h2,{id:"static",children:"Static"}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Description:"}),"\nStatic injection sets a static value to the parameter."]}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Method:"})," ",(0,r.jsx)(t.code,{children:".set(value)"})]}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Parameter:"})," The value to be set, it must be compatible with the target type."]}),"\n",(0,r.jsx)(t.h2,{id:"parent",children:"Parent"}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Description:"}),"\nParent injection gets the value output of a sibling field in the parent struct.\nIt adds a dependency to the sibling field, so make sure to prevent circular dependencies."]}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Method:"})," ",(0,r.jsx)(t.code,{children:".from_parent(type_name)"})]}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Parameter:"})," The type name of the sibling field in the parent struct."]}),"\n",(0,r.jsx)(t.h2,{id:"context",children:"Context"}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Description:"}),"\nContext injection gets the value from the request context that contains ",(0,r.jsx)(t.a,{href:"/docs/reference/typegate/authentication",children:"authentication data"}),"."]}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Method:"})," ",(0,r.jsx)(t.code,{children:".from_context(prop_name)"})]}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Parameter:"})," The name or jsonpath of the property in the context."]}),"\n",(0,r.jsx)(t.h2,{id:"secret",children:"Secret"}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Description:"}),"\nSecret injection gets the value from the ",(0,r.jsx)(t.a,{href:"/docs/reference/meta-cli/configuration-file#named-secrets",children:"secrets"}),"\ndefined when deploying the typegraph."]}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Method:"})," ",(0,r.jsx)(t.code,{children:".from_secret(secret_name)"})]}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Parameter:"})," The name of the secret."]}),"\n",(0,r.jsx)(t.h2,{id:"dynamic",children:"Dynamic"}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Description:"}),"\nDynamic injection gets the value from a predefined generator evaluated at runtime."]}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Method:"})," ",(0,r.jsx)(t.code,{children:".inject(generator_name)"})]}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Parameter:"})," The name of the generator."]}),"\n",(0,r.jsx)(t.p,{children:"Available generators:"}),"\n",(0,r.jsxs)(t.ul,{children:["\n",(0,r.jsxs)(t.li,{children:[(0,r.jsx)(t.code,{children:"now"}),": produces the current datetime as a valid ",(0,r.jsx)(t.a,{href:"https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString",children:"ISO"}),"\nstring format.\nThis value depends on the configuration of the typegate host machine."]}),"\n"]}),"\n",(0,r.jsx)(t.h2,{id:"example",children:"Example"}),"\n",(0,r.jsx)(s.A,{typegraph:"injection-example",python:n(70832),typescript:n(1430),disablePlayground:!0,query:{content:""}})]})}function p(e={}){const{wrapper:t}={...(0,i.R)(),...e.components};return t?(0,r.jsx)(t,{...e,children:(0,r.jsx)(h,{...e})}):h(e)}},70832:e=>{e.exports={content:"",path:"examples/typegraphs/injections.py"}},1430:e=>{e.exports={content:'import { Policy, t, typegraph } from "@typegraph/sdk";\nimport { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";\n\ntypegraph("injection-example", (g) => {\n  const deno = new DenoRuntime();\n  const pub = Policy.public();\n\n  g.expose({\n    get_injected: deno.func(\n      t.struct({\n        static_value: t.integer().set(12),\n        context_value: t.uuid().fromContext("profile.userId"),\n        secret_value: t.string().fromSecret("secret_name"),\n        dynamic_value: t.datetime().inject("now"),\n      }).rename("Input"),\n      t.struct({\n        static_value: t.integer().rename("Static"),\n        context_value: t.uuid(),\n        secret_value: t.string(),\n        nested: deno.identity(\n          t.struct({\n            parent_value: t.integer().fromParent("Static"),\n          }),\n        ),\n        dynamic_value: t.datetime(),\n      }).rename("Output"),\n      {\n        code: (\n          { static_value, context_value, secret_value, dynamic_value },\n        ) => ({ static_value, context_value, secret_value, dynamic_value }),\n      },\n    ).withPolicy(pub),\n  });\n});',path:"examples/typegraphs/injections.ts"}}}]);
"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[3599],{51410:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>o,default:()=>h,frontMatter:()=>s,metadata:()=>a,toc:()=>c});var i=t(13274),r=t(25618);const s={sidebar_position:1},o="Features overview",a={id:"concepts/features-overview/index",title:"Features overview",description:"- Metatype offers multiple runtimes with pre-defined operations (e.g. Prisma) and can replace the needs for an ad-hoc backend.",source:"@site/docs/concepts/features-overview/index.mdx",sourceDirName:"concepts/features-overview",slug:"/concepts/features-overview/",permalink:"/docs/concepts/features-overview/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/concepts/features-overview/index.mdx",tags:[],version:"current",sidebarPosition:1,frontMatter:{sidebar_position:1},sidebar:"docs",previous:{title:"Changelog",permalink:"/docs/reference/changelog"},next:{title:"Mental model",permalink:"/docs/concepts/mental-model/"}},l={},c=[{value:"GraphQL and REST queries",id:"graphql-and-rest-queries",level:2},{value:"Authentication",id:"authentication",level:2},{value:"Type checking",id:"type-checking",level:2},{value:"Live reload during development",id:"live-reload-during-development",level:2},{value:"Built-in CORS and rate-limiting",id:"built-in-cors-and-rate-limiting",level:2},{value:"Bring your own storage",id:"bring-your-own-storage",level:2},{value:"Function runner",id:"function-runner",level:2}];function d(e){const n={a:"a",h1:"h1",h2:"h2",li:"li",p:"p",ul:"ul",...(0,r.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(n.h1,{id:"features-overview",children:"Features overview"}),"\n",(0,i.jsxs)(n.ul,{children:["\n",(0,i.jsxs)(n.li,{children:["\n",(0,i.jsx)(n.p,{children:"Metatype offers multiple runtimes with pre-defined operations (e.g. Prisma) and can replace the needs for an ad-hoc backend."}),"\n"]}),"\n",(0,i.jsxs)(n.li,{children:["\n",(0,i.jsx)(n.p,{children:"When the project grows, you can easily introduce new APIs or break existing ones in smaller parts while keeping the same interface."}),"\n"]}),"\n",(0,i.jsxs)(n.li,{children:["\n",(0,i.jsx)(n.p,{children:"You can write complex business logic directly in Typescript, Python or WebAssembly and run them directly inside the composition engine."}),"\n"]}),"\n",(0,i.jsxs)(n.li,{children:["\n",(0,i.jsx)(n.p,{children:"Most of the frontend are today built on composable components, this brings a similar approach to backend development."}),"\n"]}),"\n",(0,i.jsxs)(n.li,{children:["\n",(0,i.jsx)(n.p,{children:"Third-parties APIs can be easily integrated, providing you visibility and control over them."}),"\n"]}),"\n",(0,i.jsxs)(n.li,{children:["\n",(0,i.jsx)(n.p,{children:"Metatype is interoperable with existing systems, and can be introduced step by step."}),"\n"]}),"\n",(0,i.jsxs)(n.li,{children:["\n",(0,i.jsx)(n.p,{children:"Metatype can be easily self-hosted or customized according to your needs."}),"\n"]}),"\n"]}),"\n",(0,i.jsx)(n.h2,{id:"graphql-and-rest-queries",children:"GraphQL and REST queries"}),"\n",(0,i.jsxs)(n.p,{children:["Easily expose business logic endpoints through using generated ",(0,i.jsx)(n.a,{href:"/docs/reference/runtimes/graphql",children:"GraphQl APIs"}),".\nIncluding helpers to auto-generate and expose CRUD operations from your types on ",(0,i.jsx)(n.a,{href:"/docs/reference/runtimes/prisma",children:"myriad of databases"}),".\nThese are only helpers though.\nThey're built upon the typegraphs primitive that compose well with every other feature and allow ",(0,i.jsx)(n.a,{href:"/docs/reference/types/reducers",children:"granular control"})," when required.\nThere are helpers to expose sections of your GraphQl through ",(0,i.jsx)(n.a,{href:"/docs/guides/rest",children:"REST queries as well"}),"."]}),"\n",(0,i.jsx)(n.h2,{id:"authentication",children:"Authentication"}),"\n",(0,i.jsxs)(n.p,{children:["First class support for authentication primitives through the Policies object.\nOauth2 helpers for popular services included as well.\nRead more ",(0,i.jsx)(n.a,{href:"/docs/reference/typegate/authentication",children:"here"}),"."]}),"\n",(0,i.jsx)(n.h2,{id:"type-checking",children:"Type checking"}),"\n",(0,i.jsxs)(n.p,{children:["Everything in Metatype starts with ",(0,i.jsx)(n.a,{href:"/docs/reference/types",children:"types"}),".\nThe typegraph sdks allow you to model exactly what's needed for your app with simple syntax and a modern type system.\nType authoring isn't done with through static, declarative snippets but through the typegraphs in a functional, \"first class\" manner allowing you build your own abstractions when needed."]}),"\n",(0,i.jsx)(n.h2,{id:"live-reload-during-development",children:"Live reload during development"}),"\n",(0,i.jsxs)(n.p,{children:["Metatype development is primarily done through the ",(0,i.jsx)(n.a,{href:"/docs/reference/meta-cli",children:"meta-cil"})," that's designed to get you up and productive in no time.\nLive auto-reload, database migration management, type-checking and linting, it's all there."]}),"\n",(0,i.jsx)(n.h2,{id:"built-in-cors-and-rate-limiting",children:"Built-in CORS and rate-limiting"}),"\n",(0,i.jsx)(n.h2,{id:"bring-your-own-storage",children:"Bring your own storage"}),"\n",(0,i.jsxs)(n.p,{children:["Working with object files in Metatype is easy using the ",(0,i.jsx)(n.a,{href:"/docs/reference/runtimes/s3",children:"S3Runtime"})," including support for ",(0,i.jsx)(n.a,{href:"/docs/guides/files-upload",children:"GraphQl file uploads"})," and presigned URLs."]}),"\n",(0,i.jsx)(n.h2,{id:"function-runner",children:"Function runner"}),"\n",(0,i.jsxs)(n.p,{children:["When the expressive powers of the typegate primitives are not up for the task, different runtimes are available for running the exact, turing complete, code you need.\nMetatype supports ",(0,i.jsx)(n.a,{href:"/docs/reference/runtimes/deno",children:"Typescript"}),", ",(0,i.jsx)(n.a,{href:"/docs/reference/runtimes/python",children:"Python"})," and ",(0,i.jsx)(n.a,{href:"/docs/reference/runtimes/wasmedge",children:"Wasm"})," functions today."]})]})}function h(e={}){const{wrapper:n}={...(0,r.R)(),...e.components};return n?(0,i.jsx)(n,{...e,children:(0,i.jsx)(d,{...e})}):d(e)}},25618:(e,n,t)=>{t.d(n,{R:()=>o,x:()=>a});var i=t(79474);const r={},s=i.createContext(r);function o(e){const n=i.useContext(s);return i.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function a(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(r):e.components||r:o(e.components),i.createElement(s.Provider,{value:n},e.children)}}}]);
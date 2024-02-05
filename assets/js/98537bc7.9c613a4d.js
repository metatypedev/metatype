(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[6988],{3691:(e,t,n)=>{"use strict";n.d(t,{ZP:()=>r});var s=n(11527),i=n(88672);function a(e){const t={a:"a",li:"li",p:"p",strong:"strong",ul:"ul",...(0,i.a)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsxs)(t.p,{children:["Metatype is an open platform for developers to ",(0,s.jsx)(t.strong,{children:"declaratively build APIs"}),". It offers a new approach to creating backends, where the developers focus on data modelling and delegate the implementation to the platform."]}),"\n",(0,s.jsx)(t.p,{children:"The intent is to address the following challenges:"}),"\n",(0,s.jsxs)(t.ul,{children:["\n",(0,s.jsx)(t.li,{children:"developers are often a bottleneck, and may spend less than 50% of their time on tasks that matter"}),"\n",(0,s.jsx)(t.li,{children:"most of the developments needs are similar, yet most of the systems are not interoperable"}),"\n",(0,s.jsx)(t.li,{children:"infrastructure management takes time and slows down the deployment velocity"}),"\n"]}),"\n",(0,s.jsx)(t.p,{children:"The platform is composed of the following components:"}),"\n",(0,s.jsxs)(t.ul,{children:["\n",(0,s.jsxs)(t.li,{children:[(0,s.jsx)(t.a,{href:"/docs/reference/typegraph",children:(0,s.jsx)(t.strong,{children:"Typegraph"})}),": a multi-language SDK to manage typegraphs - virtual graphs of types - and compose them"]}),"\n",(0,s.jsxs)(t.li,{children:[(0,s.jsx)(t.a,{href:"/docs/reference/typegate",children:(0,s.jsx)(t.strong,{children:"Typegate"})}),": a serverless REST/GraphQL gateway to execute queries over typegraphs"]}),"\n",(0,s.jsxs)(t.li,{children:[(0,s.jsx)(t.a,{href:"/docs/reference/meta-cli",children:(0,s.jsx)(t.strong,{children:"Meta CLI"})}),": a command-line tool to offer a great developer experience and fast deployment"]}),"\n"]})]})}function r(e={}){const{wrapper:t}={...(0,i.a)(),...e.components};return t?(0,s.jsx)(t,{...e,children:(0,s.jsx)(a,{...e})}):a(e)}},38115:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>c,contentTitle:()=>l,default:()=>m,frontMatter:()=>o,metadata:()=>d,toc:()=>h});var s=n(11527),i=n(88672),a=n(3691),r=n(31175);n(31572);const o={sidebar_position:2},l="Mental model",d={id:"concepts/mental-model/index",title:"Mental model",description:"This page gives a high-level view of Metatype's foundations.",source:"@site/docs/concepts/mental-model/index.mdx",sourceDirName:"concepts/mental-model",slug:"/concepts/mental-model/",permalink:"/docs/concepts/mental-model/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/concepts/mental-model/index.mdx",tags:[],version:"current",sidebarPosition:2,frontMatter:{sidebar_position:2},sidebar:"docs",previous:{title:"Features overview",permalink:"/docs/concepts/features-overview/"},next:{title:"Architecture",permalink:"/docs/concepts/architecture/"}},c={},h=[{value:"Why does Metatype exist?",id:"why-does-metatype-exist",level:2},{value:"How does Metatype work?",id:"how-does-metatype-work",level:2},{value:"What&#39;s exactly Metatype?",id:"whats-exactly-metatype",level:2},{value:"Architectural overview",id:"architectural-overview",level:3},{value:"Types",id:"types",level:2},{value:"Materializers",id:"materializers",level:2},{value:"Runtimes",id:"runtimes",level:2},{value:"Policies",id:"policies",level:2},{value:"Triggers",id:"triggers",level:2}];function p(e){const t={a:"a",admonition:"admonition",code:"code",h1:"h1",h2:"h2",h3:"h3",li:"li",p:"p",strong:"strong",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",ul:"ul",...(0,i.a)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(t.h1,{id:"mental-model",children:"Mental model"}),"\n",(0,s.jsx)(t.p,{children:"This page gives a high-level view of Metatype's foundations."}),"\n",(0,s.jsx)(t.admonition,{title:"Looking to build?",type:"tip",children:(0,s.jsxs)(t.p,{children:["For a hands-on introduction, head over to the ",(0,s.jsx)(t.a,{href:"/docs/tutorials/metatype-basics",children:"basics tutorial"})," and start build your first typegraph."]})}),"\n",(0,s.jsx)(t.h2,{id:"why-does-metatype-exist",children:"Why does Metatype exist?"}),"\n",(0,s.jsx)(t.p,{children:"As products evolve, building APIs becomes a challenging hot spot where initiatives collides and efficiency becomes a struggle. While deploying new features, all developers spend a non-negligible amount of time on low-value added tasks (CRUD generation, data validation, authorization, etc.) and deploying their solutions. This leaves little time under business constraints to design great interfaces and experiment with the best technical solution, eventually increasing the time to delivery and weakening the innovation capabilities."}),"\n",(0,s.jsx)(t.p,{children:"Metatype's vision is to enable everyone to build modular API with as little effort as possible. By helping developers to re-use existing systems and APIs, it enables teams to focus on what matters: their expert knowledge in business logic, modelling and technologies. Metatype manage the complex layers for them, making them productive and innovation-friendly for the next iterations."}),"\n",(0,s.jsx)(t.p,{children:"Drawing inspiration from modern frontend development practices, Metatype adopts the pattern of composing components together to solve backend development challenges. In that respect, Metatype is a key element in the composable enterprise trend by:"}),"\n",(0,s.jsxs)(t.ul,{children:["\n",(0,s.jsx)(t.li,{children:"making system interfaces accessible and easy to understand for everyone (discoverability)"}),"\n",(0,s.jsx)(t.li,{children:"embracing iterative approaches and cut time to deployment in half (autonomy)"}),"\n",(0,s.jsx)(t.li,{children:"building strong foundations for APIs with type safety and bounded context (modularity)"}),"\n",(0,s.jsx)(t.li,{children:"empowering teams to innovate with new technologies and interoperability (orchestration)"}),"\n"]}),"\n",(0,s.jsx)(t.h2,{id:"how-does-metatype-work",children:"How does Metatype work?"}),"\n",(0,s.jsx)(t.p,{children:"When developing a feature, the classical approach is to define what data will be at play, how to transform them, where the execution shall take place and who should be authorized. Instead, Metatype define an abstraction for each of those steps and put the emphasis on composing pre-defined APIs or defining re-usable ones when there is no existing solution."}),"\n",(0,s.jsxs)(t.table,{children:[(0,s.jsx)(t.thead,{children:(0,s.jsxs)(t.tr,{children:[(0,s.jsx)(t.th,{}),(0,s.jsx)(t.th,{children:"Classical approach"}),(0,s.jsx)(t.th,{children:"Metatype's computing model"})]})}),(0,s.jsxs)(t.tbody,{children:[(0,s.jsxs)(t.tr,{children:[(0,s.jsx)(t.td,{children:"What (data)"}),(0,s.jsx)(t.td,{children:"fixed response defined by the logic"}),(0,s.jsxs)(t.td,{children:["API clients selects what they need from ",(0,s.jsx)(t.a,{href:"/docs/concepts/mental-model#types",children:"types"})]})]}),(0,s.jsxs)(t.tr,{children:[(0,s.jsx)(t.td,{children:"How (transformations)"}),(0,s.jsx)(t.td,{children:"ad-hoc code logic"}),(0,s.jsxs)(t.td,{children:["composed data with interchangeable ",(0,s.jsx)(t.a,{href:"/docs/concepts/mental-model#materializers",children:"materializers"})]})]}),(0,s.jsxs)(t.tr,{children:[(0,s.jsx)(t.td,{children:"Where (execution)"}),(0,s.jsx)(t.td,{children:"1 code base + 1 database"}),(0,s.jsxs)(t.td,{children:["orchestrate the request across multiple ",(0,s.jsx)(t.a,{href:"/docs/concepts/mental-model#runtimes",children:"runtimes"})]})]}),(0,s.jsxs)(t.tr,{children:[(0,s.jsx)(t.td,{children:"Who (authentication)"}),(0,s.jsx)(t.td,{children:"hard-coded rules or system"}),(0,s.jsxs)(t.td,{children:["request context based and controlled by ",(0,s.jsx)(t.a,{href:"/docs/concepts/mental-model#policies",children:"policies"})]})]}),(0,s.jsxs)(t.tr,{children:[(0,s.jsx)(t.td,{children:"When (event)"}),(0,s.jsx)(t.td,{children:"request arrival"}),(0,s.jsxs)(t.td,{children:["based on ",(0,s.jsx)(t.a,{href:"/docs/concepts/mental-model#triggers",children:"triggers"})]})]})]})]}),"\n",(0,s.jsx)(t.p,{children:"This computing model brings numerous advantages:"}),"\n",(0,s.jsxs)(t.ul,{children:["\n",(0,s.jsxs)(t.li,{children:["it offers ",(0,s.jsx)(t.a,{href:"/docs/reference/runtimes",children:"multiple runtimes"})," with pre-defined operations and can replace the needs for an ad-hoc backend"]}),"\n",(0,s.jsx)(t.li,{children:"when the project grows, you easily introduce new APIs or break existing ones in smaller parts"}),"\n",(0,s.jsx)(t.li,{children:"you write complex business logic directly in Typescript, Python or WebAssembly and run them on-demand"}),"\n",(0,s.jsx)(t.li,{children:"third-parties APIs can be easily integrated, providing you visibility and control over them"}),"\n",(0,s.jsx)(t.li,{children:"it is interoperable with existing (legacy) systems, and can be introduced step by step"}),"\n",(0,s.jsx)(t.li,{children:"it can be easily self-hosted in your own infrastructure or customized according to your needs"}),"\n"]}),"\n",(0,s.jsx)(t.h2,{id:"whats-exactly-metatype",children:"What's exactly Metatype?"}),"\n",(0,s.jsx)(a.ZP,{}),"\n",(0,s.jsx)(t.h3,{id:"architectural-overview",children:"Architectural overview"}),"\n",(0,s.jsxs)(t.p,{children:["Metatype is designed for cloud environments and comes with minimal components. The only requirement to scale horizontally is to share some memory between replicas via Redis. You can use Metatype ",(0,s.jsx)(t.a,{href:"https://github.com/metatypedev/charts",children:"helm chart"})," to directly deploy typegates on your Kubernetes cluster."]}),"\n",(0,s.jsx)("div",{className:"text-center"}),"\n","\n","\n",(0,s.jsx)(t.h1,{id:"typegraph",children:"Typegraph"}),"\n",(0,s.jsxs)(t.p,{children:["Typegraph is a ",(0,s.jsx)(t.a,{href:"https://pypi.org/project/typegraph/",children:"Python package"})," for building virtual graphs of types and managing their metadata. The name also refers to the ",(0,s.jsx)(t.a,{href:"/docs/reference/typegraph",children:"typegraph specification"})," which is a file format, currently in JSON, describing all elements of a typegraph."]}),"\n",(0,s.jsxs)(t.admonition,{title:"Why Python?",type:"info",children:[(0,s.jsx)(t.p,{children:"Python was historically chosen during Metatype's prototyping phase and remained since then the default way to describe typegraphs. Its great readability and dynamic typing make it a very accessible language for everyone to pick up quickly."}),(0,s.jsx)(t.p,{children:"In theory, all frameworks and languages can produce typegraphs respecting the specification to become executable by typegates. This opens the door to a wide range of use cases, including generating typegraphs automatically from existing code base and tools."})]}),"\n",(0,s.jsx)(t.h2,{id:"types",children:"Types"}),"\n",(0,s.jsxs)(t.p,{children:[(0,s.jsx)(t.strong,{children:"Types"})," are the building block of typegraphs. They define a type system describing all data objects processed in Metatype. They can be easily extended to support new data types according to the needs of the application."]}),"\n",(0,s.jsx)(r.Z,{language:"python",children:n(59021).content}),"\n",(0,s.jsxs)(t.p,{children:[(0,s.jsx)(t.strong,{children:"Analogy in SQL"}),": types are similar to the Data Definition Language (DDL) with the extended capacity of describing any type of data."]}),"\n",(0,s.jsx)(t.h2,{id:"materializers",children:"Materializers"}),"\n",(0,s.jsxs)(t.p,{children:["Types can also describe functions and ",(0,s.jsx)(t.strong,{children:"materializers"})," define how the input type gets transformed into the output type. The input and output types are similar to a function signature and a materializer to its implementation, except that it might not always know what the function body is. In such case, the materializer knows at least where and how to access it."]}),"\n",(0,s.jsx)(r.Z,{language:"python",children:n(40575).content}),"\n",(0,s.jsxs)(t.p,{children:[(0,s.jsx)(t.strong,{children:"Analogy in SQL"}),": a materializer is similar to a join, a function, or an alias."]}),"\n",(0,s.jsx)(t.h2,{id:"runtimes",children:"Runtimes"}),"\n",(0,s.jsx)(t.p,{children:"Every type and materializer have a runtime associated to it. This runtime describes where the types or materializers are physically located. It can be another API, a database, or any other services the typegate can connect to. The typegates uses that information to optimize the execution of the queries and minimize the amount of data moved."}),"\n",(0,s.jsx)(t.p,{children:"In practice, materializers are often not explicitly used and the usage of runtime sugar syntax is preferred."}),"\n",(0,s.jsx)(r.Z,{language:"python",children:n(54512).content}),"\n",(0,s.jsxs)(t.p,{children:[(0,s.jsx)(t.strong,{children:"Analogy in SQL"}),": a runtime is similar to a database instance running some requests."]}),"\n",(0,s.jsx)(t.h2,{id:"policies",children:"Policies"}),"\n",(0,s.jsxs)(t.p,{children:["Policies are a special type of function ",(0,s.jsx)(t.code,{children:"t.func(t.struct({...}), t.boolean().optional())"})," attachable to any other type. They are evaluated once per request and determine whether one of the polices authorizes the access or not. They receive the request context (see ",(0,s.jsx)(t.a,{href:"/docs/reference/typegate",children:"typegate"}),") as argument allowing you to implement authorization, access control, or any other business logic."]}),"\n",(0,s.jsx)(t.p,{children:"The policy decision can be:"}),"\n",(0,s.jsxs)(t.ul,{children:["\n",(0,s.jsxs)(t.li,{children:[(0,s.jsx)(t.code,{children:"true"}),": the access is authorized"]}),"\n",(0,s.jsxs)(t.li,{children:[(0,s.jsx)(t.code,{children:"false"}),": the access is denied"]}),"\n",(0,s.jsxs)(t.li,{children:[(0,s.jsx)(t.code,{children:"null"}),": the access in inherited from the parent types"]}),"\n"]}),"\n",(0,s.jsx)(r.Z,{language:"python",children:n(74805).content}),"\n",(0,s.jsxs)(t.p,{children:[(0,s.jsx)(t.strong,{children:"Analogy in SQL"}),": policies are similar to Row Security Policies (RSP) or Row Level Security (RLS) concepts."]}),"\n",(0,s.jsx)(t.h2,{id:"triggers",children:"Triggers"}),"\n",(0,s.jsx)(t.p,{children:"Triggers are events launching the execution of one or multiple functions. They fire when a GraphQL request is received for the specific typegraph."}),"\n",(0,s.jsx)(r.Z,{language:"python",children:n(48567).content}),"\n",(0,s.jsxs)(t.p,{children:[(0,s.jsx)(t.strong,{children:"Analogy in SQL"}),": a trigger is similar to receiving a new query."]})]})}function m(e={}){const{wrapper:t}={...(0,i.a)(),...e.components};return t?(0,s.jsx)(t,{...e,children:(0,s.jsx)(p,{...e})}):p(e)}},73269:(e,t,n)=>{"use strict";n.d(t,{r:()=>i});n(50959);var s=n(11527);function i(e){let{name:t,choices:n,choice:i,onChange:a,className:r}=e;return(0,s.jsx)("ul",{className:`pl-0 m-0 list-none w-full ${r??""}`,children:Object.entries(n).map((e=>{let[n,r]=e;return(0,s.jsx)("li",{className:"inline-block rounded-md overflow-clip mr-1",children:(0,s.jsx)("div",{children:(0,s.jsxs)("label",{className:"cursor-pointer",children:[(0,s.jsx)("input",{type:"radio",name:t,value:n,checked:n===i,onChange:()=>a(n),className:"hidden peer"}),(0,s.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:r})]})})},n)}))})}},31572:(e,t,n)=>{"use strict";n.d(t,{Z:()=>j});var s=n(50959),i=n(73327),a=n(54143),r=n(22),o=n(31175),l=n(82142),d=n(23843),c=n(11527);const h=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function p(e){const{queryEditor:t,variableEditor:n,headerEditor:i}=(0,d._i)({nonNull:!0}),[a,r]=(0,s.useState)(e.defaultTab),o=(0,d.Xd)({onCopyQuery:e.onCopyQuery}),l=(0,d.fE)();return(0,s.useEffect)((()=>{n&&h(n)}),[a,n]),(0,s.useEffect)((()=>{i&&h(i)}),[a,i]),(0,s.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",h),h(t))}),[t]),(0,s.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",h))}),[n]),(0,s.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("gutters",[]),i.on("change",h))}),[i]),(0,c.jsx)(d.u.Provider,{children:(0,c.jsxs)("div",{className:"graphiql-editors",children:[(0,c.jsx)("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor",children:(0,c.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,c.jsx)(d.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,c.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,c.jsx)(d._8,{}),(0,c.jsx)(d.wC,{onClick:()=>l(),label:"Prettify query (Shift-Ctrl-P)",children:(0,c.jsx)(d.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,c.jsx)(d.wC,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)",children:(0,c.jsx)(d.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,c.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,c.jsx)("div",{className:("variables"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("variables"===a?"":"variables")},children:"Variables"}),(0,c.jsx)("div",{className:("headers"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("headers"===a?"":"headers")},children:"Headers"})]})}),(0,c.jsxs)("section",{className:"graphiql-editor-tool "+(a&&a.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===a?"Variables":"Headers",children:[(0,c.jsx)(d.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==a,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,c.jsx)(d.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==a,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class m{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var u=n(73269);function g(){return(0,d.JB)({nonNull:!0}).isFetching?(0,c.jsx)(d.$j,{}):null}const y={typegraph:"Typegraph",playground:"Playground"};function x(e){let{typegraph:t,query:n,code:a,headers:h={},variables:x={},tab:j="",noTool:f=!1,defaultMode:b=null}=e;const{siteConfig:{customFields:{tgUrl:v}}}=(0,r.Z)(),w=(0,s.useMemo)((()=>new m),[]),k=(0,s.useMemo)((()=>(0,i.nq)({url:`${v}/${t}`})),[]),[T,M]=(0,s.useState)(b);return(0,c.jsxs)("div",{className:"@container miniql mb-5",children:[b?(0,c.jsx)(u.r,{name:"mode",choices:y,choice:T,onChange:M,className:"mb-2"}):null,(0,c.jsx)(d.j$,{fetcher:k,defaultQuery:n.loc?.source.body.trim(),defaultHeaders:JSON.stringify(h),shouldPersistHeaders:!0,variables:JSON.stringify(x),storage:w,children:(0,c.jsxs)("div",{className:(b?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[b&&"typegraph"!==T?null:a?.map((e=>(0,c.jsxs)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0",children:[e?.codeFileUrl?(0,c.jsxs)("div",{className:"p-2 text-xs font-light",children:["See/edit full code on"," ",(0,c.jsx)(l.Z,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,children:e?.codeFileUrl})]}):null,e?(0,c.jsx)(o.Z,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content}):null]}))),b&&"playground"!==T?null:(0,c.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,c.jsx)("div",{className:"flex-1 graphiql-session",children:(0,c.jsx)(p,{defaultTab:j,noTool:f})}),(0,c.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,c.jsx)(g,{}),(0,c.jsx)(d.iB,{})]})]})]})})]})}function j(e){return(0,c.jsx)(a.Z,{fallback:(0,c.jsx)("div",{children:"Loading..."}),children:()=>(0,c.jsx)(x,{...e})})}},40575:e=>{e.exports={content:"",path:"examples/typegraphs/functions.py"}},74805:e=>{e.exports={content:"",path:"examples/typegraphs/policies-example.py"}},54512:e=>{e.exports={content:"",path:"examples/typegraphs/runtimes.py"}},48567:e=>{e.exports={content:"",path:"examples/typegraphs/triggers.py"}},59021:e=>{e.exports={content:'t.struct(\n  {\n    "id": t.uuid(),\n    "age": t.integer(),\n    "cars": t.list(\n      t.struct(\n        {\n          "model": t.string(),\n          "name": t.string().optional(),\n        }\n      )\n    ),\n  }\n)',path:"examples/typegraphs/types.py"}}}]);
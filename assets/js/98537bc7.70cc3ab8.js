(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[4877],{49681:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>d,contentTitle:()=>l,default:()=>u,frontMatter:()=>o,metadata:()=>c,toc:()=>h});var s=n(13274),i=n(99128),a=n(51611),r=n(80872);n(26787);const o={sidebar_position:2},l="Mental model",c={id:"concepts/mental-model/index",title:"Mental model",description:"This page gives a high-level view of Metatype's foundations.",source:"@site/docs/concepts/mental-model/index.mdx",sourceDirName:"concepts/mental-model",slug:"/concepts/mental-model/",permalink:"/docs/concepts/mental-model/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/concepts/mental-model/index.mdx",tags:[],version:"current",sidebarPosition:2,frontMatter:{sidebar_position:2},sidebar:"docs",previous:{title:"Features overview",permalink:"/docs/concepts/features-overview/"},next:{title:"Architecture",permalink:"/docs/concepts/architecture/"}},d={},h=[{value:"Why does Metatype exist?",id:"why-does-metatype-exist",level:2},{value:"How does Metatype work?",id:"how-does-metatype-work",level:2},{value:"What&#39;s exactly Metatype?",id:"whats-exactly-metatype",level:2},{value:"Architectural overview",id:"architectural-overview",level:3},{value:"Types",id:"types",level:2},{value:"Materializers",id:"materializers",level:2},{value:"Runtimes",id:"runtimes",level:2},{value:"Policies",id:"policies",level:2},{value:"Triggers",id:"triggers",level:2}];function p(e){const t={a:"a",admonition:"admonition",code:"code",h1:"h1",h2:"h2",h3:"h3",li:"li",p:"p",strong:"strong",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",ul:"ul",...(0,i.R)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(t.h1,{id:"mental-model",children:"Mental model"}),"\n",(0,s.jsx)(t.p,{children:"This page gives a high-level view of Metatype's foundations."}),"\n",(0,s.jsx)(t.admonition,{title:"Looking to build?",type:"tip",children:(0,s.jsxs)(t.p,{children:["For a hands-on introduction, head over to the ",(0,s.jsx)(t.a,{href:"/docs/tutorials/metatype-basics",children:"basics tutorial"})," and start build your first typegraph."]})}),"\n",(0,s.jsx)(t.h2,{id:"why-does-metatype-exist",children:"Why does Metatype exist?"}),"\n",(0,s.jsx)(t.p,{children:"As products evolve, building APIs becomes a challenging hot spot where initiatives collides and efficiency becomes a struggle. While deploying new features, all developers spend a non-negligible amount of time on low-value added tasks (CRUD generation, data validation, authorization, etc.) and deploying their solutions. This leaves little time under business constraints to design great interfaces and experiment with the best technical solution, eventually increasing the time to delivery and weakening the innovation capabilities."}),"\n",(0,s.jsx)(t.p,{children:"Metatype's vision is to enable everyone to build modular API with as little effort as possible. By helping developers to re-use existing systems and APIs, it enables teams to focus on what matters: their expert knowledge in business logic, modelling and technologies. Metatype manage the complex layers for them, making them productive and innovation-friendly for the next iterations."}),"\n",(0,s.jsx)(t.p,{children:"Drawing inspiration from modern frontend development practices, Metatype adopts the pattern of composing components together to solve backend development challenges. In that respect, Metatype is a key element in the composable enterprise trend by:"}),"\n",(0,s.jsxs)(t.ul,{children:["\n",(0,s.jsx)(t.li,{children:"making system interfaces accessible and easy to understand for everyone (discoverability)"}),"\n",(0,s.jsx)(t.li,{children:"embracing iterative approaches and cut time to deployment in half (autonomy)"}),"\n",(0,s.jsx)(t.li,{children:"building strong foundations for APIs with type safety and bounded context (modularity)"}),"\n",(0,s.jsx)(t.li,{children:"empowering teams to innovate with new technologies and interoperability (orchestration)"}),"\n"]}),"\n",(0,s.jsx)(t.h2,{id:"how-does-metatype-work",children:"How does Metatype work?"}),"\n",(0,s.jsx)(t.p,{children:"When developing a feature, the classical approach is to define what data will be at play, how to transform them, where the execution shall take place and who should be authorized. Instead, Metatype define an abstraction for each of those steps and put the emphasis on composing pre-defined APIs or defining re-usable ones when there is no existing solution."}),"\n",(0,s.jsxs)(t.table,{children:[(0,s.jsx)(t.thead,{children:(0,s.jsxs)(t.tr,{children:[(0,s.jsx)(t.th,{}),(0,s.jsx)(t.th,{children:"Classical approach"}),(0,s.jsx)(t.th,{children:"Metatype's computing model"})]})}),(0,s.jsxs)(t.tbody,{children:[(0,s.jsxs)(t.tr,{children:[(0,s.jsx)(t.td,{children:"What (data)"}),(0,s.jsx)(t.td,{children:"fixed response defined by the logic"}),(0,s.jsxs)(t.td,{children:["API clients selects what they need from ",(0,s.jsx)(t.a,{href:"/docs/concepts/mental-model#types",children:"types"})]})]}),(0,s.jsxs)(t.tr,{children:[(0,s.jsx)(t.td,{children:"How (transformations)"}),(0,s.jsx)(t.td,{children:"ad-hoc code logic"}),(0,s.jsxs)(t.td,{children:["composed data with interchangeable ",(0,s.jsx)(t.a,{href:"/docs/concepts/mental-model#materializers",children:"materializers"})]})]}),(0,s.jsxs)(t.tr,{children:[(0,s.jsx)(t.td,{children:"Where (execution)"}),(0,s.jsx)(t.td,{children:"1 code base + 1 database"}),(0,s.jsxs)(t.td,{children:["orchestrate the request across multiple ",(0,s.jsx)(t.a,{href:"/docs/concepts/mental-model#runtimes",children:"runtimes"})]})]}),(0,s.jsxs)(t.tr,{children:[(0,s.jsx)(t.td,{children:"Who (authentication)"}),(0,s.jsx)(t.td,{children:"hard-coded rules or system"}),(0,s.jsxs)(t.td,{children:["request context based and controlled by ",(0,s.jsx)(t.a,{href:"/docs/concepts/mental-model#policies",children:"policies"})]})]}),(0,s.jsxs)(t.tr,{children:[(0,s.jsx)(t.td,{children:"When (event)"}),(0,s.jsx)(t.td,{children:"request arrival"}),(0,s.jsxs)(t.td,{children:["based on ",(0,s.jsx)(t.a,{href:"/docs/concepts/mental-model#triggers",children:"triggers"})]})]})]})]}),"\n",(0,s.jsx)(t.p,{children:"This computing model brings numerous advantages:"}),"\n",(0,s.jsxs)(t.ul,{children:["\n",(0,s.jsxs)(t.li,{children:["it offers ",(0,s.jsx)(t.a,{href:"/docs/reference/runtimes",children:"multiple runtimes"})," with pre-defined operations and can replace the needs for an ad-hoc backend"]}),"\n",(0,s.jsx)(t.li,{children:"when the project grows, you easily introduce new APIs or break existing ones in smaller parts"}),"\n",(0,s.jsx)(t.li,{children:"you write complex business logic directly in Typescript, Python or WebAssembly and run them on-demand"}),"\n",(0,s.jsx)(t.li,{children:"third-parties APIs can be easily integrated, providing you visibility and control over them"}),"\n",(0,s.jsx)(t.li,{children:"it is interoperable with existing (legacy) systems, and can be introduced step by step"}),"\n",(0,s.jsx)(t.li,{children:"it can be easily self-hosted in your own infrastructure or customized according to your needs"}),"\n"]}),"\n",(0,s.jsx)(t.h2,{id:"whats-exactly-metatype",children:"What's exactly Metatype?"}),"\n",(0,s.jsx)(a.Ay,{}),"\n",(0,s.jsx)(t.h3,{id:"architectural-overview",children:"Architectural overview"}),"\n",(0,s.jsxs)(t.p,{children:["Metatype is designed for cloud environments and comes with minimal components. The only requirement to scale horizontally is to share some memory between replicas via Redis. You can use Metatype ",(0,s.jsx)(t.a,{href:"https://github.com/metatypedev/charts",children:"helm chart"})," to directly deploy typegates on your Kubernetes cluster."]}),"\n",(0,s.jsx)("div",{className:"text-center"}),"\n","\n","\n",(0,s.jsx)(t.h1,{id:"typegraph",children:"Typegraph"}),"\n",(0,s.jsxs)(t.p,{children:["Typegraph is a ",(0,s.jsx)(t.a,{href:"https://pypi.org/project/typegraph/",children:"Python package"})," for building virtual graphs of types and managing their metadata. The name also refers to the ",(0,s.jsx)(t.a,{href:"/docs/reference/typegraph",children:"typegraph specification"})," which is a file format, currently in JSON, describing all elements of a typegraph."]}),"\n",(0,s.jsxs)(t.admonition,{title:"Why Python?",type:"info",children:[(0,s.jsx)(t.p,{children:"Python was historically chosen during Metatype's prototyping phase and remained since then the default way to describe typegraphs. Its great readability and dynamic typing make it a very accessible language for everyone to pick up quickly."}),(0,s.jsx)(t.p,{children:"In theory, all frameworks and languages can produce typegraphs respecting the specification to become executable by typegates. This opens the door to a wide range of use cases, including generating typegraphs automatically from existing code base and tools."})]}),"\n",(0,s.jsx)(t.h2,{id:"types",children:"Types"}),"\n",(0,s.jsxs)(t.p,{children:[(0,s.jsx)(t.strong,{children:"Types"})," are the building block of typegraphs. They define a type system describing all data objects processed in Metatype. They can be easily extended to support new data types according to the needs of the application."]}),"\n",(0,s.jsx)(r.A,{language:"python",children:n(96169).content}),"\n",(0,s.jsxs)(t.p,{children:[(0,s.jsx)(t.strong,{children:"Analogy in SQL"}),": types are similar to the Data Definition Language (DDL) with the extended capacity of describing any type of data."]}),"\n",(0,s.jsx)(t.h2,{id:"materializers",children:"Materializers"}),"\n",(0,s.jsxs)(t.p,{children:["Types can also describe functions and ",(0,s.jsx)(t.strong,{children:"materializers"})," define how the input type gets transformed into the output type. The input and output types are similar to a function signature and a materializer to its implementation, except that it might not always know what the function body is. In such case, the materializer knows at least where and how to access it."]}),"\n",(0,s.jsx)(r.A,{language:"python",children:n(15317).content}),"\n",(0,s.jsxs)(t.p,{children:[(0,s.jsx)(t.strong,{children:"Analogy in SQL"}),": a materializer is similar to a join, a function, or an alias."]}),"\n",(0,s.jsx)(t.h2,{id:"runtimes",children:"Runtimes"}),"\n",(0,s.jsx)(t.p,{children:"Every type and materializer have a runtime associated to it. This runtime describes where the types or materializers are physically located. It can be another API, a database, or any other services the typegate can connect to. The typegates uses that information to optimize the execution of the queries and minimize the amount of data moved."}),"\n",(0,s.jsx)(t.p,{children:"In practice, materializers are often not explicitly used and the usage of runtime sugar syntax is preferred."}),"\n",(0,s.jsx)(r.A,{language:"python",children:n(13995).content}),"\n",(0,s.jsxs)(t.p,{children:[(0,s.jsx)(t.strong,{children:"Analogy in SQL"}),": a runtime is similar to a database instance running some requests."]}),"\n",(0,s.jsx)(t.h2,{id:"policies",children:"Policies"}),"\n",(0,s.jsxs)(t.p,{children:["Policies are a special type of function ",(0,s.jsx)(t.code,{children:"t.func(t.struct({...}), t.boolean().optional())"})," attachable to any other type. They are evaluated once per request and determine whether one of the polices authorizes the access or not. They receive the request context (see ",(0,s.jsx)(t.a,{href:"/docs/reference/typegate",children:"typegate"}),") as argument allowing you to implement authorization, access control, or any other business logic."]}),"\n",(0,s.jsx)(t.p,{children:"The policy decision can be:"}),"\n",(0,s.jsxs)(t.ul,{children:["\n",(0,s.jsxs)(t.li,{children:[(0,s.jsx)(t.code,{children:"true"}),": the access is authorized"]}),"\n",(0,s.jsxs)(t.li,{children:[(0,s.jsx)(t.code,{children:"false"}),": the access is denied"]}),"\n",(0,s.jsxs)(t.li,{children:[(0,s.jsx)(t.code,{children:"null"}),": the access in inherited from the parent types"]}),"\n"]}),"\n",(0,s.jsx)(r.A,{language:"python",children:n(37307).content}),"\n",(0,s.jsxs)(t.p,{children:[(0,s.jsx)(t.strong,{children:"Analogy in SQL"}),": policies are similar to Row Security Policies (RSP) or Row Level Security (RLS) concepts."]}),"\n",(0,s.jsx)(t.h2,{id:"triggers",children:"Triggers"}),"\n",(0,s.jsx)(t.p,{children:"Triggers are events launching the execution of one or multiple functions. They fire when a GraphQL request is received for the specific typegraph."}),"\n",(0,s.jsx)(r.A,{language:"python",children:n(15243).content}),"\n",(0,s.jsxs)(t.p,{children:[(0,s.jsx)(t.strong,{children:"Analogy in SQL"}),": a trigger is similar to receiving a new query."]})]})}function u(e={}){const{wrapper:t}={...(0,i.R)(),...e.components};return t?(0,s.jsx)(t,{...e,children:(0,s.jsx)(p,{...e})}):p(e)}},51611:(e,t,n)=>{"use strict";n.d(t,{Ay:()=>r});var s=n(13274),i=n(99128);function a(e){const t={a:"a",img:"img",li:"li",p:"p",strong:"strong",ul:"ul",...(0,i.R)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(t.p,{children:"Metatype is an open source platform to author and deploy APIs for the cloud and components eras. It provides a declarative programming model that helps you to efficiently design APIs and delegate the non-functional requirements to the platform. Metatype currently supports Typescript/Javascript, Python and Rust."}),"\n",(0,s.jsx)("div",{className:"max-w-[650px] mx-auto",children:(0,s.jsx)(t.p,{children:(0,s.jsx)(t.img,{src:n(64330).A+""})})}),"\n",(0,s.jsx)(t.p,{children:"The platform consists of multiple elements:"}),"\n",(0,s.jsxs)(t.ul,{children:["\n",(0,s.jsxs)(t.li,{children:[(0,s.jsx)(t.a,{href:"/docs/reference/typegraph",children:(0,s.jsx)(t.strong,{children:"Typegraph"})}),": a multi-language SDK to manage typegraphs - virtual graphs of types - and compose them"]}),"\n",(0,s.jsxs)(t.li,{children:[(0,s.jsx)(t.a,{href:"/docs/reference/typegate",children:(0,s.jsx)(t.strong,{children:"Typegate"})}),": a serverless GraphQL/REST gateway to execute queries over typegraphs"]}),"\n",(0,s.jsxs)(t.li,{children:[(0,s.jsx)(t.a,{href:"/docs/reference/meta-cli",children:(0,s.jsx)(t.strong,{children:"Meta CLI"})}),": a command-line tool to securely and efficiently deploy the typegraphs on the gateway"]}),"\n",(0,s.jsxs)(t.li,{children:[(0,s.jsx)(t.a,{href:"/docs/reference/meta-lsp",children:(0,s.jsx)(t.strong,{children:"Meta LSP"})}),": a language server protocol implementation to offer a great developer experience"]}),"\n"]})]})}function r(e={}){const{wrapper:t}={...(0,i.R)(),...e.components};return t?(0,s.jsx)(t,{...e,children:(0,s.jsx)(a,{...e})}):a(e)}},26787:(e,t,n)=>{"use strict";n.d(t,{A:()=>b});var s=n(79474),i=n(80126),a=n(8035),r=n(84221),o=n(80872),l=n(3649),c=n(34077),d=n(13274);const h=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function p(e){const{queryEditor:t,variableEditor:n,headerEditor:i}=(0,c.mi)({nonNull:!0}),[a,r]=(0,s.useState)(e.defaultTab),o=(0,c.xb)({onCopyQuery:e.onCopyQuery}),l=(0,c.Ln)();return(0,s.useEffect)((()=>{n&&h(n)}),[a,n]),(0,s.useEffect)((()=>{i&&h(i)}),[a,i]),(0,s.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",h),h(t))}),[t]),(0,s.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",h))}),[n]),(0,s.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("gutters",[]),i.on("change",h))}),[i]),(0,d.jsx)(c.m_.Provider,{children:(0,d.jsxs)("div",{className:"graphiql-editors",children:[(0,d.jsx)("section",{className:"graphiql-query-editor ","aria-label":"Query Editor",children:(0,d.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,d.jsx)(c.wY,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,d.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,d.jsx)(c.cl,{}),(0,d.jsx)(c.IB,{onClick:()=>l(),label:"Prettify query (Shift-Ctrl-P)",children:(0,d.jsx)(c.RG,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,d.jsx)(c.IB,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)",children:(0,d.jsx)(c.Td,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,d.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,d.jsx)("div",{className:("variables"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("variables"===a?"":"variables")},children:"Variables"}),(0,d.jsx)("div",{className:("headers"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("headers"===a?"":"headers")},children:"Headers"})]})}),(0,d.jsxs)("section",{className:"graphiql-editor-tool "+(a&&a.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===a?"Variables":"Headers",children:[(0,d.jsx)(c.G0,{editorTheme:e.editorTheme,isHidden:"variables"!==a,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,d.jsx)(c.B4,{editorTheme:e.editorTheme,isHidden:"headers"!==a,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class u{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=n(2222),g=n(82192),y=n(30947);function x(){return(0,c.Vm)({nonNull:!0}).isFetching?(0,d.jsx)(c.y$,{}):null}const f={typegraph:"Typegraph",playground:"Playground"};function j(e){let{typegraph:t,query:n,code:a,headers:h={},variables:j={},panel:b="",noTool:v=!1,defaultMode:w=null,disablePlayground:T=!1}=e;const{siteConfig:{customFields:{tgUrl:k}}}=(0,r.A)(),M=(0,s.useMemo)((()=>new u),[]),A=(0,s.useMemo)((()=>(0,i.a5)({url:`${k}/${t}`})),[]),[q,N]=(0,s.useState)(w),[P,I]=(0,g.e)();return(0,d.jsxs)("div",{className:"@container miniql mb-4",children:[w?(0,d.jsx)(m.m,{choices:f,choice:q,onChange:N}):null,(0,d.jsx)(c.ql,{fetcher:A,defaultQuery:n.loc?.source.body.trim(),defaultHeaders:JSON.stringify(h),shouldPersistHeaders:!0,variables:JSON.stringify(j),storage:M,children:(0,d.jsxs)("div",{className:(w?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[w&&"typegraph"!==q?null:(0,d.jsx)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0 relative",children:(0,d.jsx)(m.m,{choices:{typescript:"Typescript",python:"Python"},choice:P,onChange:I,className:"ml-2",children:a?.map((e=>(0,d.jsxs)(y.A,{value:e.codeLanguage,children:[(0,d.jsxs)(l.A,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,className:"absolute top-0 right-0 m-2 p-1",children:[e?.codeFileUrl?.split("/").pop()," \u2197"]}),(0,d.jsx)(o.A,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content})]},e.codeLanguage)))})}),T||w&&"playground"!==q?null:(0,d.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,d.jsx)("div",{className:"flex-1 graphiql-session",children:(0,d.jsx)(p,{defaultTab:b,noTool:v})}),(0,d.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,d.jsx)(x,{}),(0,d.jsx)(c.ny,{})]})]})]})})]})}function b(e){return(0,d.jsx)(a.A,{fallback:(0,d.jsx)("div",{children:"Loading..."}),children:()=>(0,d.jsx)(j,{...e})})}},64330:(e,t,n)=>{"use strict";n.d(t,{A:()=>s});const s=n.p+"assets/images/image.drawio-6260dff95a16730963b51fa7819b9386.svg"},15317:e=>{e.exports={content:'deno = DenoRuntime()\ndeno.func(\n  t.struct({"input": t.string()}),\n  t.string(),\n  code="({ input }) => `hello ${input}`",  # with logic\n)\n\nhttp = HttpRuntime("https://random.org/api")\nhttp.get(\n  "/flip_coin",\n  t.struct({}),\n  t.enum(["head", "tail"]),\n)',path:"examples/typegraphs/functions.py"}},37307:e=>{e.exports={content:'deno = DenoRuntime()\npublic = deno.policy("public", "() => true")  # noqa\nteam_only = deno.policy(\n  "team", "(ctx) => ctx.user.role === \'admin\'"\n)  # noqa',path:"examples/typegraphs/policies-example.py"}},13995:e=>{e.exports={content:'http = HttpRuntime("https://random.org/api")\n\n# same func as above\nhttp.get(\n  "/flip_coin", t.struct({}), t.enum(["head", "tail"])\n)  # implicitly attaches runtime to all types',path:"examples/typegraphs/runtimes.py"}},15243:e=>{e.exports={content:'@typegraph()\ndef triggers(g: Graph):\n  # ...\n  g.expose(\n    public,\n    flip=http.get(\n      "/flip_coin", t.struct({}), t.enum(["head", "tail"])\n    ),\n  )',path:"examples/typegraphs/triggers.py"}},96169:e=>{e.exports={content:'t.struct(\n  {\n    "id": t.uuid(),\n    "age": t.integer(),\n    "cars": t.list(\n      t.struct(\n        {\n          "model": t.string(),\n          "name": t.string().optional(),\n        }\n      )\n    ),\n  }\n)',path:"examples/typegraphs/types.py"}}}]);
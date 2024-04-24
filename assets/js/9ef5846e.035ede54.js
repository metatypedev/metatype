(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[8097],{84299:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>h,contentTitle:()=>d,default:()=>m,frontMatter:()=>o,metadata:()=>c,toc:()=>p});var a=n(13274),i=n(99128),s=n(89492),r=n(51611),l=n(11640);const o={},d="Programmable glue for developers",c={permalink:"/blog/2023/06/18/programmable-glue",editUrl:"https://github.com/metatypedev/metatype/tree/main/website/blog/2023-06-18-programmable-glue/index.mdx",source:"@site/blog/2023-06-18-programmable-glue/index.mdx",title:"Programmable glue for developers",description:"We are introducing Metatype, a new project that allows developers to build modular and strongly typed APIs using typegraph as a programmable glue.",date:"2023-06-18T00:00:00.000Z",formattedDate:"June 18, 2023",tags:[],readingTime:1.295,hasTruncateMarker:!1,authors:[],frontMatter:{},unlisted:!1,prevItem:{title:"The Node SDK is now available",permalink:"/blog/2023/11/27/node-compatibility"}},h={authorsImageUrls:[]},p=[{value:"What is Metatype?",id:"what-is-metatype",level:2},{value:"What are virtual graphs?",id:"what-are-virtual-graphs",level:2},{value:"Where does this belong in the tech landscape?",id:"where-does-this-belong-in-the-tech-landscape",level:2},{value:"Give it a try!",id:"give-it-a-try",level:2}];function u(e){const t={a:"a",admonition:"admonition",h2:"h2",p:"p",...(0,i.R)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(t.p,{children:"We are introducing Metatype, a new project that allows developers to build modular and strongly typed APIs using typegraph as a programmable glue."}),"\n",(0,a.jsx)(t.h2,{id:"what-is-metatype",children:"What is Metatype?"}),"\n",(0,a.jsx)(r.Ay,{}),"\n",(0,a.jsx)(t.h2,{id:"what-are-virtual-graphs",children:"What are virtual graphs?"}),"\n",(0,a.jsx)(t.p,{children:"Typegraphs are a declarative way to expose all APIs, storage and business logic of your stack as a single graph. They take inspiration from domain-driven design principles and in the idea that the relation between of the data is as important as data itself, even though they might be in different locations or shapes."}),"\n",(0,a.jsx)(l.A,{python:n(31328),typescript:n(38630),typegraph:"homepage",variables:{email:"fill-me",message:"Great tool!"},defaultMode:"typegraph",query:n(62330)}),"\n",(0,a.jsx)(t.p,{children:"These elements can then be combined and composed together similarly on how you would compose web components to create an interface in modern frontend practices. This allows developers to build modular and strongly typed APIs using typegraph as a programmable glue."}),"\n",(0,a.jsx)(t.h2,{id:"where-does-this-belong-in-the-tech-landscape",children:"Where does this belong in the tech landscape?"}),"\n",(0,a.jsx)(t.p,{children:"Before Metatype, there was a gap in the technological landscape for a solution that specifically addressed the transactional, short-lived use cases. While there were existing tools for analytical or long-running use cases, such as Trino and Temporal, there was no generic engine for handling transactional, short-lived tasks."}),"\n",(0,a.jsx)(s.h,{}),"\n",(0,a.jsx)(t.h2,{id:"give-it-a-try",children:"Give it a try!"}),"\n",(0,a.jsxs)(t.p,{children:["Let us know what you think! Metatype is open source and we welcome any feedback or contributions. The community primarily lives on ",(0,a.jsx)(t.a,{href:"https://github.com/metatypedev/metatype",children:"GitHub"}),"."]}),"\n",(0,a.jsx)(t.admonition,{title:"Next steps",type:"info",children:(0,a.jsxs)(t.p,{children:[(0,a.jsx)(t.a,{href:"/docs/tutorials/metatype-basics",children:"Build your first typegraph"})," or read more about the ",(0,a.jsx)(t.a,{href:"/docs/concepts/mental-model",children:"concepts behind Metatype"}),"."]})})]})}function m(e={}){const{wrapper:t}={...(0,i.R)(),...e.components};return t?(0,a.jsx)(t,{...e,children:(0,a.jsx)(u,{...e})}):u(e)}},51611:(e,t,n)=>{"use strict";n.d(t,{Ay:()=>r});var a=n(13274),i=n(99128);function s(e){const t={a:"a",img:"img",li:"li",p:"p",strong:"strong",ul:"ul",...(0,i.R)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(t.p,{children:"Metatype is an open source platform to author and deploy APIs for the cloud and components eras. It provides a declarative programming model that helps you to efficiently design APIs and delegate the non-functional requirements to the platform. Metatype currently supports Typescript/Javascript, Python and Rust."}),"\n",(0,a.jsx)("div",{className:"max-w-[650px] mx-auto",children:(0,a.jsx)(t.p,{children:(0,a.jsx)(t.img,{src:n(64330).A+""})})}),"\n",(0,a.jsx)(t.p,{children:"The platform consists of multiple elements:"}),"\n",(0,a.jsxs)(t.ul,{children:["\n",(0,a.jsxs)(t.li,{children:[(0,a.jsx)(t.a,{href:"/docs/reference/typegraph",children:(0,a.jsx)(t.strong,{children:"Typegraph"})}),": a multi-language SDK to manage typegraphs - virtual graphs of types - and compose them"]}),"\n",(0,a.jsxs)(t.li,{children:[(0,a.jsx)(t.a,{href:"/docs/reference/typegate",children:(0,a.jsx)(t.strong,{children:"Typegate"})}),": a serverless GraphQL/REST gateway to execute queries over typegraphs"]}),"\n",(0,a.jsxs)(t.li,{children:[(0,a.jsx)(t.a,{href:"/docs/reference/meta-cli",children:(0,a.jsx)(t.strong,{children:"Meta CLI"})}),": a command-line tool to securely and efficiently deploy the typegraphs on the gateway"]}),"\n",(0,a.jsxs)(t.li,{children:[(0,a.jsx)(t.a,{href:"/docs/reference/meta-lsp",children:(0,a.jsx)(t.strong,{children:"Meta LSP"})}),": a language server protocol implementation to offer a great developer experience"]}),"\n"]})]})}function r(e={}){const{wrapper:t}={...(0,i.R)(),...e.components};return t?(0,a.jsx)(t,{...e,children:(0,a.jsx)(s,{...e})}):s(e)}},89492:(e,t,n)=>{"use strict";n.d(t,{h:()=>i});n(79474);var a=n(13274);function i(){return(0,a.jsx)("div",{className:"flex justify-center mt-8 overflow-auto",children:(0,a.jsx)("table",{className:"table-fixed text-center",id:"landscape",children:(0,a.jsxs)("tbody",{children:[(0,a.jsxs)("tr",{className:"border-none",children:[(0,a.jsx)("td",{className:"border-none"}),(0,a.jsxs)("td",{children:[(0,a.jsx)("small",{children:"\u2190 individual entities"}),(0,a.jsx)("br",{}),"transactional"]}),(0,a.jsxs)("td",{children:[(0,a.jsx)("small",{children:"large data \u2192"}),(0,a.jsx)("br",{}),"analytical"]})]}),(0,a.jsxs)("tr",{children:[(0,a.jsxs)("td",{children:[(0,a.jsx)("small",{children:"instantaneous \u2191"}),(0,a.jsx)("br",{}),"short-lived"]}),(0,a.jsxs)("td",{className:"bg-slate-100",children:[(0,a.jsx)("strong",{children:"Metatype"}),(0,a.jsx)("br",{}),(0,a.jsx)("small",{children:"composition engine for data entities in evolving systems"})]}),(0,a.jsxs)("td",{children:["Trino",(0,a.jsx)("br",{}),(0,a.jsx)("small",{children:"query engine for large data from multiples sources"})]})]}),(0,a.jsxs)("tr",{children:[(0,a.jsxs)("td",{children:["long-running",(0,a.jsx)("br",{}),(0,a.jsx)("small",{children:"asynchronous \u2193"})]}),(0,a.jsxs)("td",{children:["Temporal",(0,a.jsx)("br",{}),(0,a.jsx)("small",{children:"workflow orchestration for long-running operations"})]}),(0,a.jsxs)("td",{children:["Spark",(0,a.jsx)("br",{}),(0,a.jsx)("small",{children:"batch/streaming engine for large data processing"})]})]})]})})})}},26787:(e,t,n)=>{"use strict";n.d(t,{A:()=>v});var a=n(79474),i=n(80126),s=n(8035),r=n(84221),l=n(80872),o=n(3649),d=n(34077),c=n(13274);const h=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function p(e){const{queryEditor:t,variableEditor:n,headerEditor:i}=(0,d.mi)({nonNull:!0}),[s,r]=(0,a.useState)(e.defaultTab),l=(0,d.xb)({onCopyQuery:e.onCopyQuery}),o=(0,d.Ln)();return(0,a.useEffect)((()=>{n&&h(n)}),[s,n]),(0,a.useEffect)((()=>{i&&h(i)}),[s,i]),(0,a.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",h),h(t))}),[t]),(0,a.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",h))}),[n]),(0,a.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("gutters",[]),i.on("change",h))}),[i]),(0,c.jsx)(d.m_.Provider,{children:(0,c.jsxs)("div",{className:"graphiql-editors",children:[(0,c.jsx)("section",{className:"graphiql-query-editor ","aria-label":"Query Editor",children:(0,c.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,c.jsx)(d.wY,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,c.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,c.jsx)(d.cl,{}),(0,c.jsx)(d.IB,{onClick:()=>o(),label:"Prettify query (Shift-Ctrl-P)",children:(0,c.jsx)(d.RG,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,c.jsx)(d.IB,{onClick:()=>l(),label:"Copy query (Shift-Ctrl-C)",children:(0,c.jsx)(d.Td,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,c.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,c.jsx)("div",{className:("variables"===s?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("variables"===s?"":"variables")},children:"Variables"}),(0,c.jsx)("div",{className:("headers"===s?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("headers"===s?"":"headers")},children:"Headers"})]})}),(0,c.jsxs)("section",{className:"graphiql-editor-tool "+(s&&s.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===s?"Variables":"Headers",children:[(0,c.jsx)(d.G0,{editorTheme:e.editorTheme,isHidden:"variables"!==s,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,c.jsx)(d.B4,{editorTheme:e.editorTheme,isHidden:"headers"!==s,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class u{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=n(2222),g=n(82192),f=n(30947);function y(){return(0,d.Vm)({nonNull:!0}).isFetching?(0,c.jsx)(d.y$,{}):null}const b={typegraph:"Typegraph",playground:"Playground"};function x(e){let{typegraph:t,query:n,code:s,headers:h={},variables:x={},panel:v="",noTool:j=!1,defaultMode:k=null,disablePlayground:w=!1}=e;const{siteConfig:{customFields:{tgUrl:N}}}=(0,r.A)(),S=(0,a.useMemo)((()=>new u),[]),T=(0,a.useMemo)((()=>(0,i.a5)({url:`${N}/${t}`})),[]),[q,P]=(0,a.useState)(k),[O,E]=(0,g.e)();return(0,c.jsxs)("div",{className:"@container miniql mb-4",children:[k?(0,c.jsx)(m.m,{choices:b,choice:q,onChange:P}):null,(0,c.jsx)(d.ql,{fetcher:T,defaultQuery:n.loc?.source.body.trim(),defaultHeaders:JSON.stringify(h),shouldPersistHeaders:!0,variables:JSON.stringify(x),storage:S,children:(0,c.jsxs)("div",{className:(k?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[k&&"typegraph"!==q?null:(0,c.jsx)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0 relative",children:(0,c.jsx)(m.m,{choices:{typescript:"Typescript",python:"Python"},choice:O,onChange:E,className:"ml-2",children:s?.map((e=>(0,c.jsxs)(f.A,{value:e.codeLanguage,children:[(0,c.jsxs)(o.A,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,className:"absolute top-0 right-0 m-2 p-1",children:[e?.codeFileUrl?.split("/").pop()," \u2197"]}),(0,c.jsx)(l.A,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content})]},e.codeLanguage)))})}),w||k&&"playground"!==q?null:(0,c.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,c.jsx)("div",{className:"flex-1 graphiql-session",children:(0,c.jsx)(p,{defaultTab:v,noTool:j})}),(0,c.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,c.jsx)(y,{}),(0,c.jsx)(d.ny,{})]})]})]})})]})}function v(e){return(0,c.jsx)(s.A,{fallback:(0,c.jsx)("div",{children:"Loading..."}),children:()=>(0,c.jsx)(x,{...e})})}},11640:(e,t,n)=>{"use strict";n.d(t,{A:()=>s});var a=n(26787),i=(n(79474),n(13274));function s(e){let{python:t,typescript:n,...s}=e;const r=[t&&{content:t.content,codeLanguage:"python",codeFileUrl:t.path},n&&{content:n.content,codeLanguage:"typescript",codeFileUrl:n.path}].filter((e=>!!e));return(0,i.jsx)(a.A,{code:0==r.length?void 0:r,...s})}},62330:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"A"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"stargazers"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"login"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"user"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]}]}}]}}]}},{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"B"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"send_feedback"},arguments:[{kind:"Argument",name:{kind:"Name",value:"data"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"email"},value:{kind:"StringValue",value:"",block:!1}},{kind:"ObjectField",name:{kind:"Name",value:"message"},value:{kind:"StringValue",value:"I love X!",block:!1}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"message"},arguments:[],directives:[]}]}}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"C"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"list_feedback"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"email"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"message"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:309}};t.loc.source={body:'query A {\n  stargazers {\n    login\n    # composition\n    user {\n      name\n    }\n  }\n}\n\nmutation B {\n  send_feedback(\n    data: {\n      email: "" # fill me\n      message: "I love X!"\n    }\n  ) {\n    id\n    message\n  }\n}\n\nquery C {\n  list_feedback {\n    email # cannot be accessed, delete me\n    message\n  }\n}\n',name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var a=e.type;"NamedType"===a.kind&&t.add(a.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var a={};function i(e,t){for(var n=0;n<e.definitions.length;n++){var a=e.definitions[n];if(a.name&&a.name.value==t)return a}}function s(e,t){var n={kind:e.kind,definitions:[i(e,t)]};e.hasOwnProperty("loc")&&(n.loc=e.loc);var s=a[t]||new Set,r=new Set,l=new Set;for(s.forEach((function(e){l.add(e)}));l.size>0;){var o=l;l=new Set,o.forEach((function(e){r.has(e)||(r.add(e),(a[e]||new Set).forEach((function(e){l.add(e)})))}))}return r.forEach((function(t){var a=i(e,t);a&&n.definitions.push(a)})),n}t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),a[e.name.value]=t}})),e.exports=t,e.exports.A=s(t,"A"),e.exports.B=s(t,"B"),e.exports.C=s(t,"C")},64330:(e,t,n)=>{"use strict";n.d(t,{A:()=>a});const a=n.p+"assets/images/image.drawio-6260dff95a16730963b51fa7819b9386.svg"},31328:e=>{e.exports={content:'@typegraph(\n)\ndef homepage(g: Graph):\n  # every field may be controlled by a policy\n  public = Policy.public()\n  meta_only = Policy.context("email", re.compile(".+@metatype.dev"))\n  public_write_only = Policy.on(create=public, read=meta_only)\n\n  # define runtimes where your queries are executed\n  github = HttpRuntime("https://api.github.com")\n  db = PrismaRuntime("demo", "POSTGRES_CONN")\n\n  # a feedback object stored in Postgres\n  feedback = t.struct(\n    {\n      "id": t.uuid(as_id=True, config=["auto"]),\n      "email": t.email().with_policy(public_write_only),\n      "message": t.string(min=1, max=2000),\n    },\n    name="feedback",\n  )\n\n  # a stargazer object from Github\n  stargazer = t.struct(\n    {\n      "login": t.string(name="login"),\n      # link with the feedback across runtimes\n      "user": github.get(\n        "/users/{user}",\n        t.struct({"user": t.string().from_parent("login")}),\n        t.struct({"name": t.string().optional()}),\n      ),\n    }\n  )\n\n  g.auth(Auth.oauth2_github("openid email"))\n\n  # expose part of the graph for queries\n  g.expose(\n    public,\n    stargazers=github.get(\n      "/repos/metatypedev/metatype/stargazers?per_page=2",\n      t.struct({}),\n      t.list(stargazer),\n    ),\n    # automatically generate crud operations\n    send_feedback=db.create(feedback),\n    list_feedback=db.find_many(feedback),\n  )',path:"examples/typegraphs/index.py"}},38630:e=>{e.exports={content:'await typegraph({\n  name: "homepage",\n}, (g) => {\n  // every field may be controlled by a policy\n  const pub = Policy.public();\n  const metaOnly = Policy.context("email", /.+@metatype.dev/);\n  const publicWriteOnly = Policy.on({ create: pub, read: metaOnly });\n\n  // define runtimes where your queries are executed\n  const github = new HttpRuntime("https://api.github.com");\n  const db = new PrismaRuntime("demo", "POSTGRES_CONN");\n\n  // a feedback object stored in Postgres\n  const feedback = t.struct(\n    {\n      "id": t.uuid({ asId: true, config: { "auto": true } }),\n      "email": t.email().withPolicy(publicWriteOnly),\n      "message": t.string({ min: 1, max: 2000 }, {}),\n    },\n    { name: "feedback" },\n  );\n\n  // a stargazer object from Github\n  const stargazer = t.struct(\n    {\n      "login": t.string({}, { name: "login" }),\n      // link with the feedback across runtimes\n      "user": github.get(\n        t.struct({ "user": t.string().fromParent("login") }),\n        t.struct({ "name": t.string().optional() }),\n        { path: "/users/{user}" },\n      ),\n    },\n  );\n\n  g.auth(Auth.oauth2Github("openid email"));\n\n  // expose part of the graph for queries\n  g.expose({\n    stargazers: github.get(\n      t.struct({}),\n      t.list(stargazer),\n      { path: "/repos/metatypedev/metatype/stargazers?per_page=2" },\n    ),\n    // automatically generate crud operations\n    send_feedback: db.create(feedback),\n    list_feedback: db.findMany(feedback),\n  }, pub);\n});',path:"examples/typegraphs/index.ts"}}}]);
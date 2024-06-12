(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[8789],{75521:(e,n,t)=>{"use strict";t.d(n,{Ay:()=>r});var a=t(86070),i=t(25710);function s(e){const n={a:"a",img:"img",li:"li",p:"p",strong:"strong",ul:"ul",...(0,i.R)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(n.p,{children:"Metatype is an open source platform to author and deploy APIs for the cloud and components eras. It provides a declarative programming model that helps you to efficiently design APIs and focus on the functional requirements."}),"\n",(0,a.jsx)(n.p,{children:'The runtime embraces WebAssembly (WASM) as a first-class citizen to allow you to write your business logic in the language of your choice and run it on-demand. Those "backend components" are reusable across your stacks and deployable without pipelines or containers.'}),"\n",(0,a.jsx)(n.p,{children:"The platform provides a set of capabilities out of the box:"}),"\n",(0,a.jsxs)(n.ul,{children:["\n",(0,a.jsx)(n.li,{children:"create/read/update/delete data in your database"}),"\n",(0,a.jsx)(n.li,{children:"storing files in your cloud storage"}),"\n",(0,a.jsx)(n.li,{children:"authenticate users with different providers or using JWTs"}),"\n",(0,a.jsx)(n.li,{children:"connecting to third-party/internal APIs"}),"\n"]}),"\n",(0,a.jsx)(n.p,{children:"And offers an opportunity to climb the one step higher in the abstraction ladder and drastically simplify the building of great APIs and systems!"}),"\n",(0,a.jsx)("br",{}),"\n",(0,a.jsx)("div",{className:"mx-auto max-w-[650px]",children:(0,a.jsx)(n.p,{children:(0,a.jsx)(n.img,{src:t(46566).A+""})})}),"\n",(0,a.jsx)(n.p,{children:"Metatype is designed to be as simple as possible and horizontally scalable in existing container orchestration solution like Kubernetes. It consists of multiple parts, including:"}),"\n",(0,a.jsxs)(n.ul,{children:["\n",(0,a.jsxs)(n.li,{children:[(0,a.jsx)(n.a,{href:"/docs/reference/typegraph",children:(0,a.jsx)(n.strong,{children:"Typegraph"})}),": a cross-language SDK to manage typegraphs - virtual graphs of types - and compose them"]}),"\n",(0,a.jsxs)(n.li,{children:[(0,a.jsx)(n.a,{href:"/docs/reference/typegate",children:(0,a.jsx)(n.strong,{children:"Typegate"})}),": a serverless GraphQL/REST gateway to execute queries over typegraphs"]}),"\n",(0,a.jsxs)(n.li,{children:[(0,a.jsx)(n.a,{href:"/docs/reference/meta-cli",children:(0,a.jsx)(n.strong,{children:"Meta CLI"})}),": a command-line tool to efficiently deploy the typegraphs on the gateway"]}),"\n"]}),"\n",(0,a.jsx)("div",{className:"mx-auto max-w-[400px]",children:(0,a.jsx)(n.p,{children:(0,a.jsx)(n.img,{src:t(34289).A+""})})})]})}function r(e={}){const{wrapper:n}={...(0,i.R)(),...e.components};return n?(0,a.jsx)(n,{...e,children:(0,a.jsx)(s,{...e})}):s(e)}},12946:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>u,contentTitle:()=>d,default:()=>h,frontMatter:()=>l,metadata:()=>c,toc:()=>m});var a=t(86070),i=t(25710),s=t(95290),r=t(75521),o=t(93214);const l={},d="Programmable glue for developers",c={permalink:"/blog/2023/06/18/programmable-glue",editUrl:"https://github.com/metatypedev/metatype/tree/main/website/blog/2023-06-18-programmable-glue/index.mdx",source:"@site/blog/2023-06-18-programmable-glue/index.mdx",title:"Programmable glue for developers",description:"We are introducing Metatype, a new project that allows developers to build modular and strongly typed APIs using typegraph as a programmable glue.",date:"2023-06-18T00:00:00.000Z",formattedDate:"June 18, 2023",tags:[],readingTime:1.295,hasTruncateMarker:!1,authors:[],frontMatter:{},unlisted:!1,prevItem:{title:"The Node/Deno SDK is now available",permalink:"/blog/2023/11/27/node-compatibility"},nextItem:{title:"Emulating your server nodes locally",permalink:"/blog/2023/03/15/emulating-servers"}},u={authorsImageUrls:[]},m=[{value:"What is Metatype?",id:"what-is-metatype",level:2},{value:"What are virtual graphs?",id:"what-are-virtual-graphs",level:2},{value:"Where does this belong in the tech landscape?",id:"where-does-this-belong-in-the-tech-landscape",level:2},{value:"Give it a try!",id:"give-it-a-try",level:2}];function p(e){const n={a:"a",admonition:"admonition",h2:"h2",p:"p",...(0,i.R)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(n.p,{children:"We are introducing Metatype, a new project that allows developers to build modular and strongly typed APIs using typegraph as a programmable glue."}),"\n",(0,a.jsx)(n.h2,{id:"what-is-metatype",children:"What is Metatype?"}),"\n",(0,a.jsx)(r.Ay,{}),"\n",(0,a.jsx)(n.h2,{id:"what-are-virtual-graphs",children:"What are virtual graphs?"}),"\n",(0,a.jsx)(n.p,{children:"Typegraphs are a declarative way to expose all APIs, storage and business logic of your stack as a single graph. They take inspiration from domain-driven design principles and in the idea that the relation between of the data is as important as data itself, even though they might be in different locations or shapes."}),"\n",(0,a.jsx)(o.A,{python:t(31328),typescript:t(38630),typegraph:"homepage",variables:{email:"fill-me",message:"Great tool!"},defaultMode:"typegraph",query:t(62330)}),"\n",(0,a.jsx)(n.p,{children:"These elements can then be combined and composed together similarly on how you would compose web components to create an interface in modern frontend practices. This allows developers to build modular and strongly typed APIs using typegraph as a programmable glue."}),"\n",(0,a.jsx)(n.h2,{id:"where-does-this-belong-in-the-tech-landscape",children:"Where does this belong in the tech landscape?"}),"\n",(0,a.jsx)(n.p,{children:"Before Metatype, there was a gap in the technological landscape for a solution that specifically addressed the transactional, short-lived use cases. While there were existing tools for analytical or long-running use cases, such as Trino and Temporal, there was no generic engine for handling transactional, short-lived tasks."}),"\n",(0,a.jsx)(s.h,{}),"\n",(0,a.jsx)(n.h2,{id:"give-it-a-try",children:"Give it a try!"}),"\n",(0,a.jsxs)(n.p,{children:["Let us know what you think! Metatype is open source and we welcome any feedback or contributions. The community primarily lives on ",(0,a.jsx)(n.a,{href:"https://github.com/metatypedev/metatype",children:"GitHub"}),"."]}),"\n",(0,a.jsx)(n.admonition,{title:"Next steps",type:"info",children:(0,a.jsxs)(n.p,{children:[(0,a.jsx)(n.a,{href:"/docs/tutorials/metatype-basics",children:"Build your first typegraph"})," or read more about the ",(0,a.jsx)(n.a,{href:"/docs/concepts/mental-model",children:"concepts behind Metatype"}),"."]})})]})}function h(e={}){const{wrapper:n}={...(0,i.R)(),...e.components};return n?(0,a.jsx)(n,{...e,children:(0,a.jsx)(p,{...e})}):p(e)}},95290:(e,n,t)=>{"use strict";t.d(n,{h:()=>i});t(30758);var a=t(86070);function i(){return(0,a.jsx)("div",{className:"flex justify-center mt-8 overflow-auto",children:(0,a.jsx)("table",{className:"table-fixed text-center",id:"landscape",children:(0,a.jsxs)("tbody",{children:[(0,a.jsxs)("tr",{className:"border-none",children:[(0,a.jsx)("td",{className:"border-none"}),(0,a.jsxs)("td",{children:[(0,a.jsx)("small",{children:"\u2190 individual entities"}),(0,a.jsx)("br",{}),"transactional"]}),(0,a.jsxs)("td",{children:[(0,a.jsx)("small",{children:"large data \u2192"}),(0,a.jsx)("br",{}),"analytical"]})]}),(0,a.jsxs)("tr",{children:[(0,a.jsxs)("td",{children:[(0,a.jsx)("small",{children:"instantaneous \u2191"}),(0,a.jsx)("br",{}),"short-lived"]}),(0,a.jsxs)("td",{className:"bg-slate-100",children:[(0,a.jsx)("strong",{children:"Metatype"}),(0,a.jsx)("br",{}),(0,a.jsx)("small",{children:"composition engine for entities in evolving systems"})]}),(0,a.jsxs)("td",{children:["Trino",(0,a.jsx)("br",{}),(0,a.jsx)("small",{children:"query engine for large data from multiples sources"})]})]}),(0,a.jsxs)("tr",{children:[(0,a.jsxs)("td",{children:["long-running",(0,a.jsx)("br",{}),(0,a.jsx)("small",{children:"asynchronous \u2193"})]}),(0,a.jsxs)("td",{children:["Temporal",(0,a.jsx)("br",{}),(0,a.jsx)("small",{children:"workflow orchestration for long-running operations"})]}),(0,a.jsxs)("td",{children:["Spark",(0,a.jsx)("br",{}),(0,a.jsx)("small",{children:"batch/streaming engine for large data processing"})]})]})]})})})}},62330:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"A"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"stargazers"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"login"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"user"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]}]}}]}}]}},{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"B"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"send_feedback"},arguments:[{kind:"Argument",name:{kind:"Name",value:"data"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"email"},value:{kind:"StringValue",value:"",block:!1}},{kind:"ObjectField",name:{kind:"Name",value:"message"},value:{kind:"StringValue",value:"I love X!",block:!1}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"message"},arguments:[],directives:[]}]}}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"C"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"list_feedback"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"email"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"message"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:309}};n.loc.source={body:'query A {\n  stargazers {\n    login\n    # composition\n    user {\n      name\n    }\n  }\n}\n\nmutation B {\n  send_feedback(\n    data: {\n      email: "" # fill me\n      message: "I love X!"\n    }\n  ) {\n    id\n    message\n  }\n}\n\nquery C {\n  list_feedback {\n    email # cannot be accessed, delete me\n    message\n  }\n}\n',name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var a=e.type;"NamedType"===a.kind&&n.add(a.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var a={};function i(e,n){for(var t=0;t<e.definitions.length;t++){var a=e.definitions[t];if(a.name&&a.name.value==n)return a}}function s(e,n){var t={kind:e.kind,definitions:[i(e,n)]};e.hasOwnProperty("loc")&&(t.loc=e.loc);var s=a[n]||new Set,r=new Set,o=new Set;for(s.forEach((function(e){o.add(e)}));o.size>0;){var l=o;o=new Set,l.forEach((function(e){r.has(e)||(r.add(e),(a[e]||new Set).forEach((function(e){o.add(e)})))}))}return r.forEach((function(n){var a=i(e,n);a&&t.definitions.push(a)})),t}n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),a[e.name.value]=n}})),e.exports=n,e.exports.A=s(n,"A"),e.exports.B=s(n,"B"),e.exports.C=s(n,"C")},34289:(e,n,t)=>{"use strict";t.d(n,{A:()=>a});const a=t.p+"assets/images/components.drawio-564f2cdd1b75f6132ff8fdfaad29a92c.svg"},46566:(e,n,t)=>{"use strict";t.d(n,{A:()=>a});const a=t.p+"assets/images/evolution.drawio-6260dff95a16730963b51fa7819b9386.svg"},31328:e=>{e.exports={content:'@typegraph(\n)\ndef homepage(g: Graph):\n  # every field may be controlled by a policy\n  public = Policy.public()\n  meta_only = Policy.context("email", re.compile(".+@metatype.dev"))\n  public_write_only = Policy.on(create=public, read=meta_only)\n\n  # define runtimes where your queries are executed\n  github = HttpRuntime("https://api.github.com")\n  db = PrismaRuntime("demo", "POSTGRES_CONN")\n\n  # a feedback object stored in Postgres\n  feedback = t.struct(\n    {\n      "id": t.uuid(as_id=True, config=["auto"]),\n      "email": t.email().with_policy(public_write_only),\n      "message": t.string(min=1, max=2000),\n    },\n    name="feedback",\n  )\n\n  # a stargazer object from Github\n  stargazer = t.struct(\n    {\n      "login": t.string(name="login"),\n      # link with the feedback across runtimes\n      "user": github.get(\n        "/users/{user}",\n        t.struct({"user": t.string().from_parent("login")}),\n        t.struct({"name": t.string().optional()}),\n      ),\n    }\n  )\n\n  # out of the box authenfication support\n  g.auth(Auth.oauth2_github("openid email"))\n\n  # expose part of the graph for queries\n  g.expose(\n    public,\n    stargazers=github.get(\n      "/repos/metatypedev/metatype/stargazers?per_page=2",\n      t.struct({}),\n      t.list(stargazer),\n    ),\n    # automatically generate crud operations\n    send_feedback=db.create(feedback),\n    list_feedback=db.find_many(feedback),\n  )',path:"examples/typegraphs/index.py"}},38630:e=>{e.exports={content:'typegraph({\n  name: "homepage",\n}, (g) => {\n  // every field may be controlled by a policy\n  const pub = Policy.public();\n  const metaOnly = Policy.context("email", /.+@metatype.dev/);\n  const publicWriteOnly = Policy.on({ create: pub, read: metaOnly });\n\n  // define runtimes where your queries are executed\n  const github = new HttpRuntime("https://api.github.com");\n  const db = new PrismaRuntime("demo", "POSTGRES_CONN");\n\n  // a feedback object stored in Postgres\n  const feedback = t.struct(\n    {\n      "id": t.uuid({ asId: true, config: { "auto": true } }),\n      "email": t.email().withPolicy(publicWriteOnly),\n      "message": t.string({ min: 1, max: 2000 }, {}),\n    },\n    { name: "feedback" },\n  );\n\n  // a stargazer object from Github\n  const stargazer = t.struct(\n    {\n      "login": t.string({}, { name: "login" }),\n      // link with the feedback across runtimes\n      "user": github.get(\n        t.struct({ "user": t.string().fromParent("login") }),\n        t.struct({ "name": t.string().optional() }),\n        { path: "/users/{user}" },\n      ),\n    },\n  );\n\n  g.auth(Auth.oauth2Github("openid email"));\n\n  // expose part of the graph for queries\n  g.expose({\n    stargazers: github.get(\n      t.struct({}),\n      t.list(stargazer),\n      { path: "/repos/metatypedev/metatype/stargazers?per_page=2" },\n    ),\n    // automatically generate crud operations\n    send_feedback: db.create(feedback),\n    list_feedback: db.findMany(feedback),\n  }, pub);\n});',path:"examples/typegraphs/index.ts"}}}]);
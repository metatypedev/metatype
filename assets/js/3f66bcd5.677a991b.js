(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[8119],{26463:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>d,contentTitle:()=>l,default:()=>u,frontMatter:()=>r,metadata:()=>o,toc:()=>c});var i=t(11527),a=t(88672),s=t(47550);const r={},l="GraphQL",o={id:"reference/runtimes/graphql/index",title:"GraphQL",description:"GraphQL runtime",source:"@site/docs/reference/runtimes/graphql/index.mdx",sourceDirName:"reference/runtimes/graphql",slug:"/reference/runtimes/graphql/",permalink:"/docs/reference/runtimes/graphql/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/runtimes/graphql/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Deno/typescript",permalink:"/docs/reference/runtimes/deno/"},next:{title:"HTTP/REST",permalink:"/docs/reference/runtimes/http/"}},d={},c=[{value:"GraphQL runtime",id:"graphql-runtime",level:2}];function h(e){const n={a:"a",code:"code",h1:"h1",h2:"h2",li:"li",ol:"ol",p:"p",ul:"ul",...(0,a.a)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(n.h1,{id:"graphql",children:"GraphQL"}),"\n",(0,i.jsx)(n.h2,{id:"graphql-runtime",children:"GraphQL runtime"}),"\n",(0,i.jsxs)(n.p,{children:["You currently have a single model to describe messages sent in the chat-based app. A reasonable next step is to add a user model and make a link between the two. While you can store users in the same database, it's wiser to avoid data duplication and re-use your service for user management available at ",(0,i.jsx)(n.a,{href:"https://graphqlzero.almansi.me",children:"GraphQLZero"})," endpoint. Let's introduce the GraphQL runtime that allows remote GraphQL queries."]}),"\n",(0,i.jsxs)(n.p,{children:["Update ",(0,i.jsx)(n.code,{children:"typegraph.py"})," with the highlighted lines below:"]}),"\n",(0,i.jsx)(s.Z,{typegraph:"graphql",python:t(20948),typescript:t(25725),query:t(81222)}),"\n",(0,i.jsx)(n.p,{children:"Again, a few interesting happened here:"}),"\n",(0,i.jsxs)(n.ol,{children:["\n",(0,i.jsxs)(n.li,{children:["No migration has been run. The field ",(0,i.jsx)(n.code,{children:"user"})," comes from another runtime and doesn't exist in the database. The typegate will orchestrate the query execution in all runtimes and minimize the work done."]}),"\n",(0,i.jsxs)(n.li,{children:["The ",(0,i.jsx)(n.code,{children:"from_parent"})," rule automatically fills the input type with the parent field named ",(0,i.jsx)(n.code,{children:"uid"}),". The ",(0,i.jsx)(n.code,{children:"g(\xb7)"})," rule allows making named reference to another type and avoid circular reference."]}),"\n"]}),"\n",(0,i.jsx)(n.p,{children:"Other type enforcement rules also exists:"}),"\n",(0,i.jsxs)(n.ul,{children:["\n",(0,i.jsxs)(n.li,{children:[(0,i.jsx)(n.code,{children:"from_secret(key)"})," to fill the input type with the secret in the ",(0,i.jsx)(n.code,{children:"TG_[typegraph name]_[key]"})," format"]}),"\n",(0,i.jsxs)(n.li,{children:[(0,i.jsx)(n.code,{children:"from_context(\xb7)"})," to fill the input type with content from the request context, such as JSON Web Token (JWT), etc."]}),"\n",(0,i.jsxs)(n.li,{children:[(0,i.jsx)(n.code,{children:"set(x)"})," to fill the input type with content ",(0,i.jsx)(n.code,{children:"x"})]}),"\n"]}),"\n",(0,i.jsx)(n.p,{children:"You should now start to see the power provided by Metatype and might wonder how to integrate it step by step with your existing systems. Writing all those types by hand is tedious and error-prone. The next section will show you how to generate types from existing sources."})]})}function u(e={}){const{wrapper:n}={...(0,a.a)(),...e.components};return n?(0,i.jsx)(n,{...e,children:(0,i.jsx)(h,{...e})}):h(e)}},73269:(e,n,t)=>{"use strict";t.d(n,{r:()=>a});t(50959);var i=t(11527);function a(e){let{name:n,choices:t,choice:a,onChange:s,className:r}=e;return(0,i.jsx)("ul",{className:`pl-0 m-0 list-none w-full ${r??""}`,children:Object.entries(t).map((e=>{let[t,r]=e;return(0,i.jsx)("li",{className:"inline-block rounded-md overflow-clip mr-1",children:(0,i.jsx)("div",{children:(0,i.jsxs)("label",{className:"cursor-pointer",children:[(0,i.jsx)("input",{type:"radio",name:n,value:t,checked:t===a,onChange:()=>s(t),className:"hidden peer"}),(0,i.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:r})]})})},t)}))})}},31572:(e,n,t)=>{"use strict";t.d(n,{Z:()=>y});var i=t(50959),a=t(73327),s=t(54143),r=t(22),l=t(31175),o=t(82142),d=t(23843),c=t(11527);const h=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function u(e){const{queryEditor:n,variableEditor:t,headerEditor:a}=(0,d._i)({nonNull:!0}),[s,r]=(0,i.useState)(e.defaultTab),l=(0,d.Xd)({onCopyQuery:e.onCopyQuery}),o=(0,d.fE)();return(0,i.useEffect)((()=>{t&&h(t)}),[s,t]),(0,i.useEffect)((()=>{a&&h(a)}),[s,a]),(0,i.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("extraKeys",{"Alt-G":()=>{n.replaceSelection("@")}}),n.setOption("gutters",[]),n.on("change",h),h(n))}),[n]),(0,i.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("gutters",[]),t.on("change",h))}),[t]),(0,i.useEffect)((()=>{a&&(a.setOption("lineNumbers",!1),a.setOption("gutters",[]),a.on("change",h))}),[a]),(0,c.jsx)(d.u.Provider,{children:(0,c.jsxs)("div",{className:"graphiql-editors",children:[(0,c.jsx)("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor",children:(0,c.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,c.jsx)(d.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,c.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,c.jsx)(d._8,{}),(0,c.jsx)(d.wC,{onClick:()=>o(),label:"Prettify query (Shift-Ctrl-P)",children:(0,c.jsx)(d.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,c.jsx)(d.wC,{onClick:()=>l(),label:"Copy query (Shift-Ctrl-C)",children:(0,c.jsx)(d.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,c.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,c.jsx)("div",{className:("variables"===s?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("variables"===s?"":"variables")},children:"Variables"}),(0,c.jsx)("div",{className:("headers"===s?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("headers"===s?"":"headers")},children:"Headers"})]})}),(0,c.jsxs)("section",{className:"graphiql-editor-tool "+(s&&s.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===s?"Variables":"Headers",children:[(0,c.jsx)(d.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==s,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,c.jsx)(d.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==s,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class m{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,n){this.map.has(e)||(this.length+=1),this.map.set(e,n)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var p=t(73269);function g(){return(0,d.JB)({nonNull:!0}).isFetching?(0,c.jsx)(d.$j,{}):null}const f={typegraph:"Typegraph",playground:"Playground"};function x(e){let{typegraph:n,query:t,code:s,headers:h={},variables:x={},tab:y="",noTool:v=!1,defaultMode:b=null}=e;const{siteConfig:{customFields:{tgUrl:k}}}=(0,r.Z)(),j=(0,i.useMemo)((()=>new m),[]),q=(0,i.useMemo)((()=>(0,a.nq)({url:`${k}/${n}`})),[]),[N,w]=(0,i.useState)(b);return(0,c.jsxs)("div",{className:"@container miniql mb-5",children:[b?(0,c.jsx)(p.r,{name:"mode",choices:f,choice:N,onChange:w,className:"mb-2"}):null,(0,c.jsx)(d.j$,{fetcher:q,defaultQuery:t.loc?.source.body.trim(),defaultHeaders:JSON.stringify(h),shouldPersistHeaders:!0,variables:JSON.stringify(x),storage:j,children:(0,c.jsxs)("div",{className:(b?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[b&&"typegraph"!==N?null:s?.map((e=>(0,c.jsxs)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0",children:[e?.codeFileUrl?(0,c.jsxs)("div",{className:"p-2 text-xs font-light",children:["See/edit full code on"," ",(0,c.jsx)(o.Z,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,children:e?.codeFileUrl})]}):null,e?(0,c.jsx)(l.Z,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content}):null]}))),b&&"playground"!==N?null:(0,c.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,c.jsx)("div",{className:"flex-1 graphiql-session",children:(0,c.jsx)(u,{defaultTab:y,noTool:v})}),(0,c.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,c.jsx)(g,{}),(0,c.jsx)(d.iB,{})]})]})]})})]})}function y(e){return(0,c.jsx)(s.Z,{fallback:(0,c.jsx)("div",{children:"Loading..."}),children:()=>(0,c.jsx)(x,{...e})})}},47550:(e,n,t)=>{"use strict";t.d(n,{Z:()=>s});var i=t(31572),a=(t(50959),t(11527));function s(e){let{python:n,typescript:t,...s}=e;const r=[n&&{content:n.content,codeLanguage:"python",codeFileUrl:n.path},t&&{content:t.content,codeLanguage:"typescript",codeFileUrl:t.path}].filter((e=>!!e));return(0,a.jsx)(i.Z,{code:0==r.length?void 0:r,...s})}},81222:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"A"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"users"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"data"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]}]}}]}}]}},{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"B"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"create_message"},arguments:[{kind:"Argument",name:{kind:"Name",value:"data"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"title"},value:{kind:"StringValue",value:"Hey",block:!1}},{kind:"ObjectField",name:{kind:"Name",value:"user_id"},value:{kind:"StringValue",value:"1",block:!1}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]}]}}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"C"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"messages"},arguments:[{kind:"Argument",name:{kind:"Name",value:"take"},value:{kind:"IntValue",value:"2"}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"title"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"user"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]}]}}]}}]}}],loc:{start:0,end:224}};n.loc.source={body:'query A {\n  users {\n    data {\n      id\n      name\n    }\n  }\n}\n\nmutation B {\n  create_message(data: { title: "Hey", user_id: "1" }) {\n    id\n  }\n}\n\nquery C {\n  messages(take: 2) {\n    title\n    user {\n      name\n    }\n  }\n}\n',name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&n.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var i={};function a(e,n){for(var t=0;t<e.definitions.length;t++){var i=e.definitions[t];if(i.name&&i.name.value==n)return i}}function s(e,n){var t={kind:e.kind,definitions:[a(e,n)]};e.hasOwnProperty("loc")&&(t.loc=e.loc);var s=i[n]||new Set,r=new Set,l=new Set;for(s.forEach((function(e){l.add(e)}));l.size>0;){var o=l;l=new Set,o.forEach((function(e){r.has(e)||(r.add(e),(i[e]||new Set).forEach((function(e){l.add(e)})))}))}return r.forEach((function(n){var i=a(e,n);i&&t.definitions.push(i)})),t}n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),i[e.name.value]=n}})),e.exports=n,e.exports.A=s(n,"A"),e.exports.B=s(n,"B"),e.exports.C=s(n,"C")},20948:e=>{e.exports={content:'# highlight-next-line\nfrom typegraph.runtimes.graphql import GraphQLRuntime\n\n\n@typegraph(\n    allow_origin=[\n      "https://metatype.dev",\n      "http://localhost:3000",\n    ],\n  ),\n)\ndef graphql(g: Graph):\n  db = PrismaRuntime("database", "POSTGRES_CONN")\n  # highlight-next-line\n  gql = GraphQLRuntime("https://graphqlzero.almansi.me/api")\n  public = Policy.public()\n\n  # highlight-next-line\n  user = t.struct({"id": t.string(), "name": t.string()})\n\n  message = t.struct(\n    {\n      "id": t.integer(as_id=True, config=["auto"]),\n      "title": t.string(),\n      # highlight-next-line\n      "user_id": t.string(name="uid"),\n      # highlight-next-line\n      "user": gql.query(\n        t.struct(\n          {\n            # highlight-next-line\n            "id": t.string(as_id=True).from_parent("uid")\n          }\n        ),\n        t.optional(user),\n      ),\n    },\n    name="message",\n  )\n\n  g.expose(\n    public,\n    create_message=db.create(message),\n    messages=db.find_many(message),\n    # highlight-next-line\n    users=gql.query(\n      t.struct({}), t.struct({"data": t.list(user)})\n    ),\n  )',path:"examples/typegraphs/graphql.py"}},25725:e=>{e.exports={content:'// highlight-next-line\nimport { GraphQLRuntime } from "@typegraph/sdk/runtimes/graphql.js";\n\ntypegraph({\n  name: "graphql",\n}, (g) => {\n  const db = new PrismaRuntime("database", "POSTGRES_CONN");\n  // highlight-next-line\n  const gql = new GraphQLRuntime("https://graphqlzero.almansi.me/api");\n  const pub = Policy.public();\n\n  // highlight-next-line\n  const user = t.struct({ "id": t.string(), "name": t.string() });\n\n  const message = t.struct(\n    {\n      "id": t.integer({}, { asId: true, config: { auto: true } }),\n      "title": t.string(),\n      // highlight-next-line\n      "user_id": t.string({}, { name: "uid" }),\n      // highlight-next-line\n      "user": gql.query(\n        t.struct(\n          {\n            // highlight-next-line\n            "id": t.string({}, { asId: true }).fromParent("uid"),\n          },\n        ),\n        t.optional(user),\n      ),\n    },\n    { name: "message" },\n  );\n\n  g.expose({\n    create_message: db.create(message),\n    messages: db.findMany(message),\n    // highlight-next-line\n    users: gql.query(t.struct({}), t.struct({ "data": t.list(user) })),\n  }, pub);\n});',path:"examples/typegraphs/graphql.ts"}}}]);
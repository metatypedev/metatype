(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[4404],{60595:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>d,contentTitle:()=>c,default:()=>h,frontMatter:()=>o,metadata:()=>l,toc:()=>u});var i=t(13274),a=t(99128),r=t(11640),s=t(80872);const o={sidebar_position:50},c="Custom functions",l={id:"guides/external-functions/index",title:"Custom functions",description:"Custom functions can be used to run custom code at different points of a typegraph.",source:"@site/docs/guides/external-functions/index.mdx",sourceDirName:"guides/external-functions",slug:"/guides/external-functions/",permalink:"/docs/guides/external-functions/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/guides/external-functions/index.mdx",tags:[],version:"current",sidebarPosition:50,frontMatter:{sidebar_position:50},sidebar:"docs",previous:{title:"Metatype Basics",permalink:"/docs/tutorials/metatype-basics/"},next:{title:"Upload files to cloud storage",permalink:"/docs/guides/files-upload/"}},d={},u=[{value:"Accessing function context",id:"accessing-function-context",level:2},{value:"Accessing the typegraph",id:"accessing-the-typegraph",level:2}];function m(e){const n={a:"a",admonition:"admonition",code:"code",h1:"h1",h2:"h2",li:"li",p:"p",ul:"ul",...(0,a.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(n.h1,{id:"custom-functions",children:"Custom functions"}),"\n",(0,i.jsxs)(n.p,{children:["Custom functions can be used to run custom code at different points of a typegraph.\nThese constructs fall under ",(0,i.jsx)(n.a,{href:"/docs/concepts/mental-model#materializers",children:"materializers"})," which are, concretly, functions attached to a specific runtime.\nFor some common tasks, like simple operations on database tables for example, runtime implementations provide materializer ",(0,i.jsx)(n.a,{href:"/docs/reference/runtimes/prisma#generators",children:"generators"})," to minimize boilerplate.\nFor cases not expressible by generators, runtimes like the ",(0,i.jsx)(n.code,{children:"DenoRuntime"})," allow us to write more powerful custom functions."]}),"\n",(0,i.jsx)(n.p,{children:"Custom functions are commonly used for:"}),"\n",(0,i.jsxs)(n.ul,{children:["\n",(0,i.jsx)(n.li,{children:"Specialized business logic to respond directly to incoming requests"}),"\n",(0,i.jsx)(n.li,{children:"Authentication policy logic"}),"\n"]}),"\n",(0,i.jsxs)(n.p,{children:["The following example uses the ",(0,i.jsx)(n.code,{children:"DenoRuntime"})," to respond to requests and define a policy."]}),"\n",(0,i.jsx)(r.A,{typegraph:"math",typescript:t(37770),python:t(42252),query:t(47008)}),"\n",(0,i.jsxs)(n.p,{children:["Note that for the ",(0,i.jsx)(n.code,{children:"fib"})," root materializer, we're using a typescript module in an external file.\nHere's what ",(0,i.jsx)(n.code,{children:"scripts/fib.ts"})," looks like:"]}),"\n",(0,i.jsx)(s.A,{language:"typescript",children:t(71920).content}),"\n",(0,i.jsx)(n.p,{children:"The following runtimes can be used to run custom functions:"}),"\n",(0,i.jsxs)(n.ul,{children:["\n",(0,i.jsxs)(n.li,{children:[(0,i.jsx)(n.a,{href:"/docs/reference/runtimes/deno/",children:(0,i.jsx)(n.code,{children:"DenoRuntime"})})," through typescript code."]}),"\n",(0,i.jsxs)(n.li,{children:[(0,i.jsx)(n.a,{href:"/docs/reference/runtimes/python/",children:(0,i.jsx)(n.code,{children:"PythonRuntime"})})," through python code."]}),"\n",(0,i.jsxs)(n.li,{children:[(0,i.jsx)(n.a,{href:"/docs/reference/runtimes/wasm/",children:(0,i.jsx)(n.code,{children:"WasmRuntime"})})," through wasm modules."]}),"\n",(0,i.jsxs)(n.li,{children:[(0,i.jsx)(n.a,{href:"/docs/reference/runtimes/prisma/",children:(0,i.jsx)(n.code,{children:"PrismaRuntime"})})," throw raw SQL queries."]}),"\n"]}),"\n",(0,i.jsx)(n.h2,{id:"accessing-function-context",children:"Accessing function context"}),"\n",(0,i.jsx)(n.admonition,{title:"Beta",type:"info",children:(0,i.jsxs)(n.p,{children:["The following feature is currently only implemented for the ",(0,i.jsx)(n.code,{children:"DenoRuntime"}),"."]})}),"\n",(0,i.jsx)(n.p,{children:"On some runtimes, custom functions are passed the context object along with the materializer inputs.\nThis object provides access to all kinds of information about the context in which the function is running.\nThe following example illustrates availaible fields:"}),"\n",(0,i.jsx)(r.A,{typegraph:"func-ctx",typescript:t(43974),python:t(13376),query:t(99359)}),"\n",(0,i.jsxs)(n.p,{children:["Note, the typescript version of the sample uses a closure instead of a string snippet to define the function.\nThis is a simple syntax sugar availaible when using ",(0,i.jsx)(n.code,{children:"DenoRuntime"})," through the typescript sdk or the ",(0,i.jsx)(n.code,{children:"PythonRuntime"})," the python one.\nConsult the reference for each runtime to look at what's availaible."]}),"\n",(0,i.jsx)(n.h2,{id:"accessing-the-typegraph",children:"Accessing the typegraph"}),"\n",(0,i.jsx)(n.admonition,{title:"Beta",type:"info",children:(0,i.jsxs)(n.p,{children:["The following feature is currently only implemented for the ",(0,i.jsx)(n.code,{children:"DenoRuntime"}),"."]})}),"\n",(0,i.jsxs)(n.p,{children:["To do anything meaningful with custom functions, you'll want to access the rest of functionality implemented on your typegraph.\nThe primary way of doing this is by sending GraphqQl queries from within your function.\nOn the ",(0,i.jsx)(n.code,{children:"DenoRuntime"}),", to make this easier, there's a ",(0,i.jsx)(n.code,{children:"gql"})," object passed to all functions.\nThe following exapmle illustrates how it functions:"]}),"\n",(0,i.jsx)(r.A,{typegraph:"func-gql",typescript:t(83683),python:t(43685),query:t(33204)}),"\n",(0,i.jsxs)(n.p,{children:["And ",(0,i.jsx)(n.code,{children:"scripts/createVote.ts"})," looks like:"]}),"\n",(0,i.jsx)(s.A,{language:"typescript",children:t(36185).content})]})}function h(e={}){const{wrapper:n}={...(0,a.R)(),...e.components};return n?(0,i.jsx)(n,{...e,children:(0,i.jsx)(m,{...e})}):m(e)}},26787:(e,n,t)=>{"use strict";t.d(n,{A:()=>b});var i=t(79474),a=t(80126),r=t(8035),s=t(84221),o=t(80872),c=t(3649),l=t(34077),d=t(13274);const u=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function m(e){const{queryEditor:n,variableEditor:t,headerEditor:a}=(0,l.mi)({nonNull:!0}),[r,s]=(0,i.useState)(e.defaultTab),o=(0,l.xb)({onCopyQuery:e.onCopyQuery}),c=(0,l.Ln)();return(0,i.useEffect)((()=>{t&&u(t)}),[r,t]),(0,i.useEffect)((()=>{a&&u(a)}),[r,a]),(0,i.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("extraKeys",{"Alt-G":()=>{n.replaceSelection("@")}}),n.setOption("gutters",[]),n.on("change",u),u(n))}),[n]),(0,i.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("gutters",[]),t.on("change",u))}),[t]),(0,i.useEffect)((()=>{a&&(a.setOption("lineNumbers",!1),a.setOption("gutters",[]),a.on("change",u))}),[a]),(0,d.jsx)(l.m_.Provider,{children:(0,d.jsxs)("div",{className:"graphiql-editors",children:[(0,d.jsx)("section",{className:"graphiql-query-editor ","aria-label":"Query Editor",children:(0,d.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,d.jsx)(l.wY,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,d.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,d.jsx)(l.cl,{}),(0,d.jsx)(l.IB,{onClick:()=>c(),label:"Prettify query (Shift-Ctrl-P)",children:(0,d.jsx)(l.RG,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,d.jsx)(l.IB,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)",children:(0,d.jsx)(l.Td,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,d.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,d.jsx)("div",{className:("variables"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{s("variables"===r?"":"variables")},children:"Variables"}),(0,d.jsx)("div",{className:("headers"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{s("headers"===r?"":"headers")},children:"Headers"})]})}),(0,d.jsxs)("section",{className:"graphiql-editor-tool "+(r&&r.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===r?"Variables":"Headers",children:[(0,d.jsx)(l.G0,{editorTheme:e.editorTheme,isHidden:"variables"!==r,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,d.jsx)(l.B4,{editorTheme:e.editorTheme,isHidden:"headers"!==r,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class h{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,n){this.map.has(e)||(this.length+=1),this.map.set(e,n)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var p=t(2222),f=t(82192),g=t(30947);function x(){return(0,l.Vm)({nonNull:!0}).isFetching?(0,d.jsx)(l.y$,{}):null}const y={typegraph:"Typegraph",playground:"Playground"};function v(e){let{typegraph:n,query:t,code:r,headers:u={},variables:v={},panel:b="",noTool:k=!1,defaultMode:j=null,disablePlayground:w=!1}=e;const{siteConfig:{customFields:{tgUrl:S}}}=(0,s.A)(),E=(0,i.useMemo)((()=>new h),[]),N=(0,i.useMemo)((()=>(0,a.a5)({url:`${S}/${n}`})),[]),[q,_]=(0,i.useState)(j),[C,A]=(0,f.e)();return(0,d.jsxs)("div",{className:"@container miniql mb-4",children:[j&&!w?(0,d.jsx)(p.mS,{choices:y,choice:q,onChange:_}):null,(0,d.jsxs)("div",{className:(j||w?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[w||!j||"typegraph"===q?(0,d.jsx)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0 relative",children:(0,d.jsx)(p.mS,{choices:{typescript:"Typescript",python:"Python"},choice:C,onChange:A,className:"ml-2",children:r?.map((e=>(0,d.jsxs)(g.A,{value:e.codeLanguage,children:[(0,d.jsxs)(c.A,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,className:"absolute top-0 right-0 m-2 p-1",children:[e?.codeFileUrl?.split("/").pop()," \u2197"]}),(0,d.jsx)(o.A,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content})]},e.codeLanguage)))})}):null,w||j&&"playground"!==q?null:(0,d.jsx)(l.ql,{fetcher:N,defaultQuery:t.loc?.source.body.trim(),defaultHeaders:JSON.stringify(u),shouldPersistHeaders:!0,variables:JSON.stringify(v),storage:E,children:(0,d.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,d.jsx)("div",{className:"flex-1 graphiql-session",children:(0,d.jsx)(m,{defaultTab:b,noTool:k})}),(0,d.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,d.jsx)(x,{}),(0,d.jsx)(l.ny,{})]})]})})]})]})}function b(e){return(0,d.jsx)(r.A,{fallback:(0,d.jsx)("div",{children:"Loading..."}),children:()=>(0,d.jsx)(v,{...e})})}},11640:(e,n,t)=>{"use strict";t.d(n,{A:()=>r});var i=t(26787),a=(t(79474),t(13274));function r(e){let{python:n,typescript:t,...r}=e;const s=[n&&{content:n.content,codeLanguage:"python",codeFileUrl:n.path},t&&{content:t.content,codeLanguage:"typescript",codeFileUrl:t.path}].filter((e=>!!e));return(0,a.jsx)(i.A,{code:0==s.length?void 0:s,...r})}},99359:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"ctx"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"parent"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"context"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"effect"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"meta"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"url"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"token"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"secrets"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"headers"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:118}};n.loc.source={body:"query {\n  ctx {\n    parent\n    context\n    effect\n    meta{\n      url\n      token\n    }\n    secrets\n    headers\n  }\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&n.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var i={};n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),i[e.name.value]=n}})),e.exports=n},33204:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"createIdea"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"createIdea"},arguments:[{kind:"Argument",name:{kind:"Name",value:"data"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"id"},value:{kind:"StringValue",value:"c0ebb212-c94e-4fa5-a6ed-ae910d6cd9f5",block:!1}},{kind:"ObjectField",name:{kind:"Name",value:"name"},value:{kind:"StringValue",value:"PATENT #12343",block:!1}},{kind:"ObjectField",name:{kind:"Name",value:"authorEmail"},value:{kind:"StringValue",value:"corp@abc.xyz",block:!1}},{kind:"ObjectField",name:{kind:"Name",value:"desc"},value:{kind:"StringValue",value:"Well, you can't use it so why do you care?",block:!1}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"authorEmail"},arguments:[],directives:[]}]}}]}},{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"createVote"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"createVote"},arguments:[{kind:"Argument",name:{kind:"Name",value:"authorEmail"},value:{kind:"StringValue",value:"corp@abc.xyz",block:!1}},{kind:"Argument",name:{kind:"Name",value:"ideaId"},value:{kind:"StringValue",value:"c0ebb212-c94e-4fa5-a6ed-ae910d6cd9f5",block:!1}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"vote"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"authorEmail"},arguments:[],directives:[]}]}}]}}]}}],loc:{start:0,end:472}};n.loc.source={body:'# create idea first\nmutation createIdea {\n  createIdea(data: {\n    id: "c0ebb212-c94e-4fa5-a6ed-ae910d6cd9f5",\n    name: "PATENT #12343", \n    authorEmail: "corp@abc.xyz",\n    desc: "Well, you can\'t use it so why do you care?"\n  }){\n    id\n    authorEmail\n  }\n}\n\n# now try to vote using same email\nmutation createVote{\n  createVote(\n    authorEmail: "corp@abc.xyz",\n    ideaId: "c0ebb212-c94e-4fa5-a6ed-ae910d6cd9f5"\n  ){\n    vote {\n      id\n      authorEmail\n    }\n  }\n}\n',name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&n.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var i={};function a(e,n){for(var t=0;t<e.definitions.length;t++){var i=e.definitions[t];if(i.name&&i.name.value==n)return i}}function r(e,n){var t={kind:e.kind,definitions:[a(e,n)]};e.hasOwnProperty("loc")&&(t.loc=e.loc);var r=i[n]||new Set,s=new Set,o=new Set;for(r.forEach((function(e){o.add(e)}));o.size>0;){var c=o;o=new Set,c.forEach((function(e){s.has(e)||(s.add(e),(i[e]||new Set).forEach((function(e){o.add(e)})))}))}return s.forEach((function(n){var i=a(e,n);i&&t.definitions.push(i)})),t}n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),i[e.name.value]=n}})),e.exports=n,e.exports.createIdea=r(n,"createIdea"),e.exports.createVote=r(n,"createVote")},47008:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"fib"},arguments:[{kind:"Argument",name:{kind:"Name",value:"size"},value:{kind:"IntValue",value:"50"}}],directives:[]},{kind:"Field",name:{kind:"Name",value:"random"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"randomItem"},arguments:[{kind:"Argument",name:{kind:"Name",value:"items"},value:{kind:"ListValue",values:[{kind:"StringValue",value:"ice",block:!1},{kind:"StringValue",value:"advice",block:!1},{kind:"StringValue",value:"gold",block:!1},{kind:"StringValue",value:"flowers",block:!1},{kind:"StringValue",value:"dirt",block:!1}]}}],directives:[]}]}}],loc:{start:0,end:142}};n.loc.source={body:'{\n  fib(size: 50)\n  random\n  randomItem(\n    items: [\n      "ice", \n      "advice", \n      "gold", \n      "flowers",\n      "dirt"\n    ]\n  )\n}\n',name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&n.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var i={};n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),i[e.name.value]=n}})),e.exports=n},13376:e=>{e.exports={content:'g.expose(\n  Policy.public(),\n  ctx=deno.func(\n    t.struct({}),\n    t.struct(\n      {\n        # the effect under which the function was run\n        "effect": t.enum(\n          ["create", "read", "update", "delete"]\n        ),\n        "meta": t.struct(\n          {\n            # url to host typegraph\n            # can be used to talk to host typegraph from within\n            # function\n            "url": t.string(),\n            # token for accessing host typegraph\n            "token": t.string(),\n          }\n        ),\n        # http headers\n        "headers": t.list(t.list(t.string())),\n        # typegraph secrets\n        "secrets": t.list(t.list(t.string())),\n        # FIXME: explanation\n        "parent": t.string(),\n        "context": t.string(),\n      }\n    ),\n    code="""(_: any, ctx: any) => ({\n    ...ctx,\n    parent: JSON.stringify(ctx.parent),\n    context: JSON.stringify(ctx.context),\n\n    // modeling arbitrary associative arrays in\n    // graphql is difficult so we return a listified format.\n    // Follow the link for alternative solutions\n    // https://github.com/graphql/graphql-spec/issues/101#issuecomment-170170967\n    headers: Object.entries(ctx.headers),\n    secrets: Object.entries(ctx.secrets),\n    })""",\n  ),\n)',path:"examples/typegraphs/func-ctx.py"}},43974:e=>{e.exports={content:'g.expose({\n  ctx: deno.func(\n    t.struct({}),\n    t.struct({\n      // the effect under which the function was run\n      effect: t.enum_(["create", "read", "update", "delete"]),\n      meta: t.struct({\n        // url to host typegraph\n        // can be used to talk to host typegraph from within\n        // function\n        url: t.string(),\n        // token for accessing host typegraph\n        token: t.string(),\n      }),\n\n      // http headers\n      headers: t.list(t.list(t.string())),\n      // typegraph secrets\n      secrets: t.list(t.list(t.string())),\n\n      // FIXME: explanation\n      parent: t.string(),\n      context: t.string(),\n    }),\n    {\n      code: (_: any, ctx: any) => ({\n        ...ctx,\n        parent: JSON.stringify(ctx.parent),\n        context: JSON.stringify(ctx.context),\n\n        // modeling arbitrary associative arrays in\n        // graphql is difficult so we return a listified format.\n        // Follow the link for alternative solutions\n        // https://github.com/graphql/graphql-spec/issues/101#issuecomment-170170967\n        headers: Object.entries(ctx.headers),\n        secrets: Object.entries(ctx.secrets),\n      }),\n    },\n  ),\n}, Policy.public());',path:"examples/typegraphs/func-ctx.ts"}},43685:e=>{e.exports={content:"",path:"examples/typegraphs/func-gql.py"}},83683:e=>{e.exports={content:'const deno = new DenoRuntime();\nconst db = new PrismaRuntime("db", "POSTGRES");\n\nconst idea = t.struct(\n  {\n    "id": t.uuid({ asId: true, config: { "auto": true } }),\n    "name": t.string(),\n    "desc": t.string().optional(),\n    "authorEmail": t.email(),\n    "votes": t.list(g.ref("vote")),\n  },\n  { name: "idea" },\n);\nconst vote = t.struct(\n  {\n    "id": t.uuid({ asId: true, config: { "auto": true } }),\n    "authorEmail": t.email(),\n    "idea": g.ref("idea"),\n  },\n  { name: "vote" },\n);\n\n// Policy.internal means only custom functions\n// can access these root materializers\ng.expose({\n  i_get_idea: db.findUnique(idea),\n  i_create_vote: db.create(vote),\n}, Policy.internal());\n\ng.expose({\n  createIdea: db.create(idea),\n  createVote: deno.import(\n    t.struct({ "ideaId": t.uuid(), "authorEmail": t.email() })\n      .rename("CreateVoteInput"),\n    t.struct({\n      // rename here  is necessary to make\n      // `fromParent` down below work\n      "voteId": t.uuid().rename("Vote_id"),\n      // using `reduce` we improve the API allowing\n      // create calls to get the newly created object\n      // without having to send this data from the\n      // custom funciton\n      "vote": db.findUnique(vote)\n        .reduce({\n          "where": {\n            "id": g.inherit().fromParent("Vote_id"),\n          },\n        }),\n    }).rename("CreateVoteOutput"),\n    {\n      module: "scripts/createVote.ts",\n      name: "handle", // name the exported function to run\n      effect: fx.create(),\n    },\n  ),\n}, Policy.public());',path:"examples/typegraphs/func-gql.ts"}},42252:e=>{e.exports={content:'from typegraph.runtimes.deno import DenoRuntime\n\n\n@typegraph(\n)\ndef math(g: Graph):\n  public = Policy.public()\n\n  # we need a runtime to run the functions on\n  deno = DenoRuntime()\n\n  # we can provide the function code inline\n  random_item_fn = "({ items }) => items[Math.floor(Math.random() * items.length)]"\n\n  # or we can point to a local file that\'s accessible to the meta-cli\n  fib_module = "scripts/fib.ts"\n\n  # the policy implementation is based on functions as well\n  restrict_referer = deno.policy(\n    "restrict_referer_policy",\n    \'(_, context) => context.headers.referer && ["localhost", "metatype"].includes(new URL(context.headers.referer).hostname)\',\n  )\n\n  g.expose(\n    public,\n    # all materializers have inputs and outputs\n    fib=deno.import_(\n      t.struct({"size": t.integer()}),\n      t.list(t.float()),\n      module=fib_module,\n      name="default",  # name the exported function to run\n    ).with_policy(restrict_referer),\n    randomItem=deno.func(\n      t.struct({"items": t.list(t.string())}),\n      t.string(),\n      code=random_item_fn,\n    ),\n    random=deno.func(\n      t.struct(),\n      t.float(),\n      code="() => Math.random()",  # more inline code\n    ),\n  )',path:"examples/typegraphs/math.py"}},37770:e=>{e.exports={content:'import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";\n\ntypegraph({\n  name: "math",\n}, (g) => {\n  const pub = Policy.public();\n\n  // we need a runtime to run the functions on\n  const deno = new DenoRuntime();\n\n  // we can provide the function code inline\n  const random_item_fn =\n    "({ items }) => items[Math.floor(Math.random() * items.length)]";\n\n  // the policy implementation is based on functions itself\n  const restrict_referer = deno.policy(\n    "restrict_referer_policy",\n    \'(_, context) => context.headers.referer && ["localhost", "metatype"].includes(new URL(context.headers.referer).hostname)\',\n  );\n\n  // or we can point to a local file that\'s accessible to the meta-cli\n  const fib_module = "scripts/fib.ts";\n\n  g.expose({\n    // all materializers have inputs and outputs\n    fib: deno.import(\n      t.struct({ "size": t.integer() }),\n      t.list(t.float()),\n      {\n        module: fib_module,\n        name: "default", // name the exported function to run\n      },\n    ).withPolicy(restrict_referer),\n    randomItem: deno.func(\n      t.struct({ "items": t.list(t.string()) }),\n      t.string(),\n      { code: random_item_fn },\n    ),\n    random: deno.func(\n      t.struct({}),\n      t.float(),\n      { code: "() => Math.random()" }, // more inline code\n    ),\n  }, pub);\n});',path:"examples/typegraphs/math.ts"}},36185:e=>{e.exports={content:"export async function handle(\n  inp: { ideaId: string; authorEmail: string },\n  _ctx: any,\n  // the third paramter contains the gql client object\n  { gql }: any,\n) {\n  // find the referenced idea from the typegraph\n  const { data: { idea } } = await gql`\n    query getIdeaAuthorEmail($ideaId: String!) {\n      idea: i_get_idea(where: { id: $ideaId }) {\n        authorEmail\n      }\n    }\n  `.run({ ideaId: inp.ideaId });\n\n  // we check if the idea exists\n  if (!idea) {\n    throw new Error(`no idea found under id ${inp.ideaId}`);\n  }\n\n  // and that the author and voter aren't the same\n  if (inp.authorEmail == idea.authorEmail) {\n    throw new Error(`author of idea can't vote for idea`);\n  }\n\n  // we persist the vote with another gql call\n  const { data: { vote } } = await gql`\n    mutation insertVote($ideaId: String!, $authorEmail: String!) {\n      vote: i_create_vote(data: { \n          authorEmail: $authorEmail, \n          idea: { connect: { id: $ideaId } } \n      }) {\n        id\n      }\n    }\n  `.run(inp);\n  return { voteId: vote.id };\n}",path:"examples/typegraphs/scripts/createVote.ts"}},71920:e=>{e.exports={content:"const CACHE = [1, 1];\nconst MAX_CACHE_SIZE = 1000;\n\nexport default function fib({ size }: { size: number }) {\n  if (size > MAX_CACHE_SIZE) {\n    throw new Error(`unsupported size ${size} > ${MAX_CACHE_SIZE}`);\n  }\n  let i = CACHE.length;\n  while (i++ < size) {\n    CACHE.push(CACHE[i - 2] + CACHE[i - 3]);\n  }\n  return CACHE.slice(0, size);\n}",path:"examples/typegraphs/scripts/fib.ts"}}}]);
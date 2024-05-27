(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[3597],{49208:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>u,contentTitle:()=>c,default:()=>m,frontMatter:()=>o,metadata:()=>d,toc:()=>p});var i=t(13274),s=t(99128),r=t(11640),a=t(86671),l=t(30947);const o={},c="HTTP/REST",d={id:"reference/runtimes/http/index",title:"HTTP/REST",description:"HTTP Runtime",source:"@site/docs/reference/runtimes/http/index.mdx",sourceDirName:"reference/runtimes/http",slug:"/reference/runtimes/http/",permalink:"/docs/reference/runtimes/http/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/runtimes/http/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"GraphQL",permalink:"/docs/reference/runtimes/graphql/"},next:{title:"Prisma",permalink:"/docs/reference/runtimes/prisma/"}},u={},p=[{value:"HTTP Runtime",id:"http-runtime",level:2},{value:"Verbs",id:"verbs",level:2}];function h(e){const n={a:"a",code:"code",h1:"h1",h2:"h2",li:"li",p:"p",pre:"pre",ul:"ul",...(0,s.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(n.h1,{id:"httprest",children:"HTTP/REST"}),"\n",(0,i.jsx)(n.h2,{id:"http-runtime",children:"HTTP Runtime"}),"\n",(0,i.jsx)(n.p,{children:"The HTTPRuntime allows your typegraphs to access external REST APIs."}),"\n",(0,i.jsx)(n.p,{children:"Common use cases (but not limited to):"}),"\n",(0,i.jsxs)(n.ul,{children:["\n",(0,i.jsx)(n.li,{children:"Enable consuming one or more REST APIs through the same interface"}),"\n",(0,i.jsxs)(n.li,{children:["Programmatically generate typegraphs from an existing ",(0,i.jsx)(n.a,{href:"https://swagger.io/specification/",children:"openapi specs"})," or similar"]}),"\n"]}),"\n",(0,i.jsx)(n.p,{children:"Example:"}),"\n",(0,i.jsx)(r.A,{typegraph:"http-runtime",python:t(12831),query:t(73555)}),"\n",(0,i.jsx)(n.h2,{id:"verbs",children:"Verbs"}),"\n",(0,i.jsxs)(n.p,{children:["This runtime supports ",(0,i.jsx)(n.code,{children:"GET"}),", ",(0,i.jsx)(n.code,{children:"POST"}),", ",(0,i.jsx)(n.code,{children:"PUT"}),", ",(0,i.jsx)(n.code,{children:"DELETE"})," http verbs."]}),"\n",(0,i.jsxs)(n.p,{children:["In most cases, queries are not limited to a simple query parameter or use the default ",(0,i.jsx)(n.code,{children:"application/json"})," content type.\nYou can assign what parts of your request description each field in the input struct belongs to."]}),"\n",(0,i.jsxs)(n.p,{children:["In the example bellow, this endpoint corresponds to ",(0,i.jsx)(n.code,{children:"POST <API_URL>/submit_user?form_type=.."})," with a body requiring the fields:\n",(0,i.jsx)(n.code,{children:"pseudo"}),", ",(0,i.jsx)(n.code,{children:"age"})," and with header ",(0,i.jsx)(n.code,{children:"accept"})," set as ",(0,i.jsx)(n.code,{children:"application/json"}),"."]}),"\n",(0,i.jsxs)(a.Ay,{children:[(0,i.jsx)(l.A,{value:"python",children:(0,i.jsx)(n.pre,{children:(0,i.jsx)(n.code,{className:"language-python",children:'# ..\n    remote = HTTPRuntime("<API_URL>")\n    g.expose(\n        pub,\n        add_user=remote.post(\n            "/submit_user",\n            # define your input/output\n            t.struct(\n                {\n                    "id": t.uuid(),\n                    "username": t.float(),\n                    "years_lived": t.integer(),\n                    "form_type": t.integer(),\n                    "config_accept": t.string().set("application/json")\n                },\n            ),\n            t.struct({ "message": t.string() }),\n            # specify where each field in your input should be associated with\n            body_fields=("username", "years_lived"),\n            query_fields=("form_type"),\n            # you may want to rename a few fields\n            # if you are using your own naming conventions or reusing types\n            rename_fields={\n                "username": "pseudo",\n                "years_lived": "age",\n            },\n            content_type="multipart/form-data",\n            # set a custom header prefix\n            header_prefix="config_"\n        )\n    )\n# ..\n'})})}),(0,i.jsx)(l.A,{value:"typescript",children:(0,i.jsx)(n.pre,{children:(0,i.jsx)(n.code,{className:"language-typescript",children:'// ..\n  const remote = new HttpRuntime("<API_URL>");\n  g.expose({\n    add_user: remote.post(\n      // define your input/output\n      t.struct(\n        {\n          id: t.uuid(),\n          username: t.float(),\n          years_lived: t.integer(),\n          form_type: t.integer()\n        },\n      ),\n      t.struct({ message: t.string() }),\n      {\n        path: "/submit_user",\n        // specify where each field in your input should be associated with\n        bodyFields: ["username", "years_lived"],\n        queryFields: ["form_type"],\n        // you may want to rename a few fields\n        // if you are using your own naming conventions or reusing types\n        renameFields: [\n          ["username", "pseudo"],\n          ["years_lived", "age"],\n        ],\n        contentType: "multipart/form-data",\n      }\n  )}, pub);\n// ..\n'})})})]})]})}function m(e={}){const{wrapper:n}={...(0,s.R)(),...e.components};return n?(0,i.jsx)(n,{...e,children:(0,i.jsx)(h,{...e})}):h(e)}},26787:(e,n,t)=>{"use strict";t.d(n,{A:()=>j});var i=t(79474),s=t(80126),r=t(8035),a=t(84221),l=t(80872),o=t(3649),c=t(34077),d=t(13274);const u=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function p(e){const{queryEditor:n,variableEditor:t,headerEditor:s}=(0,c.mi)({nonNull:!0}),[r,a]=(0,i.useState)(e.defaultTab),l=(0,c.xb)({onCopyQuery:e.onCopyQuery}),o=(0,c.Ln)();return(0,i.useEffect)((()=>{t&&u(t)}),[r,t]),(0,i.useEffect)((()=>{s&&u(s)}),[r,s]),(0,i.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("extraKeys",{"Alt-G":()=>{n.replaceSelection("@")}}),n.setOption("gutters",[]),n.on("change",u),u(n))}),[n]),(0,i.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("gutters",[]),t.on("change",u))}),[t]),(0,i.useEffect)((()=>{s&&(s.setOption("lineNumbers",!1),s.setOption("gutters",[]),s.on("change",u))}),[s]),(0,d.jsx)(c.m_.Provider,{children:(0,d.jsxs)("div",{className:"graphiql-editors",children:[(0,d.jsx)("section",{className:"graphiql-query-editor ","aria-label":"Query Editor",children:(0,d.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,d.jsx)(c.wY,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,d.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,d.jsx)(c.cl,{}),(0,d.jsx)(c.IB,{onClick:()=>o(),label:"Prettify query (Shift-Ctrl-P)",children:(0,d.jsx)(c.RG,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,d.jsx)(c.IB,{onClick:()=>l(),label:"Copy query (Shift-Ctrl-C)",children:(0,d.jsx)(c.Td,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,d.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,d.jsx)("div",{className:("variables"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{a("variables"===r?"":"variables")},children:"Variables"}),(0,d.jsx)("div",{className:("headers"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{a("headers"===r?"":"headers")},children:"Headers"})]})}),(0,d.jsxs)("section",{className:"graphiql-editor-tool "+(r&&r.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===r?"Variables":"Headers",children:[(0,d.jsx)(c.G0,{editorTheme:e.editorTheme,isHidden:"variables"!==r,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,d.jsx)(c.B4,{editorTheme:e.editorTheme,isHidden:"headers"!==r,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class h{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,n){this.map.has(e)||(this.length+=1),this.map.set(e,n)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=t(2222),g=t(82192),f=t(30947);function y(){return(0,c.Vm)({nonNull:!0}).isFetching?(0,d.jsx)(c.y$,{}):null}const x={typegraph:"Typegraph",playground:"Playground"};function v(e){let{typegraph:n,query:t,code:r,headers:u={},variables:v={},panel:j="",noTool:b=!1,defaultMode:T=null,disablePlayground:k=!1}=e;const{siteConfig:{customFields:{tgUrl:_}}}=(0,a.A)(),N=(0,i.useMemo)((()=>new h),[]),q=(0,i.useMemo)((()=>(0,s.a5)({url:`${_}/${n}`})),[]),[S,E]=(0,i.useState)(T),[w,P]=(0,g.e)();return(0,d.jsxs)("div",{className:"@container miniql mb-4",children:[T&&!k?(0,d.jsx)(m.mS,{choices:x,choice:S,onChange:E}):null,(0,d.jsxs)("div",{className:(T||k?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[k||!T||"typegraph"===S?(0,d.jsx)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0 relative",children:(0,d.jsx)(m.mS,{choices:{typescript:"Typescript",python:"Python"},choice:w,onChange:P,className:"ml-2",children:r?.map((e=>(0,d.jsxs)(f.A,{value:e.codeLanguage,children:[(0,d.jsxs)(o.A,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,className:"absolute top-0 right-0 m-2 p-1",children:[e?.codeFileUrl?.split("/").pop()," \u2197"]}),(0,d.jsx)(l.A,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content})]},e.codeLanguage)))})}):null,k||T&&"playground"!==S?null:(0,d.jsx)(c.ql,{fetcher:q,defaultQuery:t.loc?.source.body.trim(),defaultHeaders:JSON.stringify(u),shouldPersistHeaders:!0,variables:JSON.stringify(v),storage:N,children:(0,d.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,d.jsx)("div",{className:"flex-1 graphiql-session",children:(0,d.jsx)(p,{defaultTab:j,noTool:b})}),(0,d.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,d.jsx)(y,{}),(0,d.jsx)(c.ny,{})]})]})})]})]})}function j(e){return(0,d.jsx)(r.A,{fallback:(0,d.jsx)("div",{children:"Loading..."}),children:()=>(0,d.jsx)(v,{...e})})}},86671:(e,n,t)=>{"use strict";t.d(n,{Ay:()=>a,gc:()=>l});t(79474);var i=t(82192),s=t(2222),r=t(13274);function a(e){let{children:n}=e;const[t,a]=(0,i.e)();return(0,r.jsx)(s.mS,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,onChange:a,children:n})}function l(e){let{children:n}=e;const[t]=(0,i.e)();return(0,r.jsx)(s.q9,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,children:n})}},11640:(e,n,t)=>{"use strict";t.d(n,{A:()=>r});var i=t(26787),s=(t(79474),t(13274));function r(e){let{python:n,typescript:t,...r}=e;const a=[n&&{content:n.content,codeLanguage:"python",codeFileUrl:n.path},t&&{content:t.content,codeLanguage:"typescript",codeFileUrl:t.path}].filter((e=>!!e));return(0,s.jsx)(i.A,{code:0==a.length?void 0:a,...r})}},73555:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"facts"},arguments:[{kind:"Argument",name:{kind:"Name",value:"language"},value:{kind:"StringValue",value:"en",block:!1}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"text"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"facts_as_text"},arguments:[{kind:"Argument",name:{kind:"Name",value:"language"},value:{kind:"StringValue",value:"en",block:!1}}],directives:[]}]}}],loc:{start:0,end:142}};n.loc.source={body:'query {\n    facts(language: "en") {\n        id\n        text\n        # source_url\n        # permalink\n    }\n    facts_as_text(language: "en")\n}',name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&n.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var i={};n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),i[e.name.value]=n}})),e.exports=n},12831:e=>{e.exports={content:'@typegraph(\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n)\ndef http_example(g: Graph):\n  pub = Policy.public()\n\n  facts = HttpRuntime("https://uselessfacts.jsph.pl/api/v2/facts")\n\n  g.expose(\n    pub,\n    facts=facts.get(\n      "/random",\n      t.struct({"language": t.enum(["en", "de"])}),\n      t.struct(\n        {\n          "id": t.string(),\n          "text": t.string(),\n          "source": t.string(),\n          "source_url": t.string(),\n          "language": t.string(),\n          "permalink": t.string(),\n        }\n      ),\n    ),\n    facts_as_text=facts.get(\n      "/random",\n      t.struct(\n        {\n          "header_accept": t.string().set("text/plain"),\n          "language": t.enum(["en", "de"]),\n        }\n      ),\n      t.string(),\n      header_prefix="header_",\n    ),\n  )',path:"examples/typegraphs/http-runtime.py"}}}]);
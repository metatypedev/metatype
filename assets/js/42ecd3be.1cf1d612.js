(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[2829],{19739:(e,t,n)=>{"use strict";n.d(t,{Ay:()=>l,RM:()=>r});var i=n(13274),s=n(99128),a=n(81288);const r=[];function o(e){const t={a:"a",code:"code",p:"p",pre:"pre",...(0,s.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsxs)(t.p,{children:["Cross-Origin Resource Sharing (CORS) on the one hand is a mechanism that allows or denies cross-origin requests in the browser. It avoids that other websites use your API without explicitly allowing it. Note that it doesn't protect other servers or a mobile app from using your typegraphs, only browsers implements the CORS mechanism. See this ",(0,i.jsx)(t.a,{href:"https://developer.mozilla.org/en/docs/Web/HTTP/CORS",children:"documentation"})," for the details."]}),"\n",(0,i.jsx)(a.A,{typegraph:"cors",python:n(77743),typescript:n(30801),query:n(573)}),"\n",(0,i.jsx)(t.p,{children:"If your browser support well CORS, you should see an error and even more if you try to run the interactive demo. By the way, there is a hidden core header in all interactive demos you have met so far:"}),"\n",(0,i.jsx)(t.pre,{children:(0,i.jsx)(t.code,{className:"language-python",children:'TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"])\n'})})]})}function l(e={}){const{wrapper:t}={...(0,s.R)(),...e.components};return t?(0,i.jsx)(t,{...e,children:(0,i.jsx)(o,{...e})}):o(e)}},20931:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>d,contentTitle:()=>l,default:()=>p,frontMatter:()=>o,metadata:()=>c,toc:()=>h});var i=n(13274),s=n(99128),a=n(81288),r=n(19739);const o={sidebar_position:50},l="Secure your requests",c={id:"guides/securing-requests/index",title:"Secure your requests",description:"Authentication",source:"@site/docs/guides/securing-requests/index.mdx",sourceDirName:"guides/securing-requests",slug:"/guides/securing-requests/",permalink:"/docs/guides/securing-requests/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/guides/securing-requests/index.mdx",tags:[],version:"current",sidebarPosition:50,frontMatter:{sidebar_position:50},sidebar:"docs",previous:{title:"Write REST endpoints",permalink:"/docs/guides/rest/"},next:{title:"Self-host the Typegate",permalink:"/docs/guides/self-hosting"}},d={},h=[{value:"Authentication",id:"authentication",level:2},{value:"CORS",id:"cors",level:2},...r.RM];function u(e){const t={a:"a",code:"code",h1:"h1",h2:"h2",p:"p",pre:"pre",...(0,s.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(t.h1,{id:"secure-your-requests",children:"Secure your requests"}),"\n",(0,i.jsx)(t.h2,{id:"authentication",children:"Authentication"}),"\n",(0,i.jsxs)(t.p,{children:["Metatype supports multiple authentication schemes: Basic authentication, JSON Web Tokens (JWT) and OAuth2. This enables every request to have a context and store some information about the user. You can then use the context to set specific fields with ",(0,i.jsx)(t.code,{children:"from_context"})," or as you will see next step, to restrict accesses via the policies."]}),"\n",(0,i.jsxs)(t.p,{children:["For your app, you will use basic authentication in order to restrict some actions for admin users. In order to do so, adding the following secret to your ",(0,i.jsx)(t.code,{children:"metatype.yml"})," file: ",(0,i.jsx)(t.code,{children:"BASIC_ADMIN=password"}),"."]}),"\n",(0,i.jsx)(a.A,{typegraph:"authentication",python:n(83530),typescript:n(22748),query:n(68228),headers:{Authorization:"Basic YWRtaW46cGFzc3dvcmQ="},tab:"headers"}),"\n",(0,i.jsxs)(t.p,{children:["More details ",(0,i.jsx)(t.a,{href:"/docs/reference/typegate/authentication",children:"here"}),"."]}),"\n","\n",(0,i.jsx)(t.h2,{id:"cors",children:"CORS"}),"\n",(0,i.jsx)(r.Ay,{}),"\n",(0,i.jsx)(t.pre,{children:(0,i.jsx)(t.code,{className:"language-python",children:'TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"])\n'})})]})}function p(e={}){const{wrapper:t}={...(0,s.R)(),...e.components};return t?(0,i.jsx)(t,{...e,children:(0,i.jsx)(u,{...e})}):u(e)}},95649:(e,t,n)=>{"use strict";n.d(t,{A:()=>v});var i=n(79474),s=n(355),a=n(70792),r=n(96116),o=n(31604),l=n(12956),c=n(17537),d=n(13274);const h=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function u(e){const{queryEditor:t,variableEditor:n,headerEditor:s}=(0,c.mi)({nonNull:!0}),[a,r]=(0,i.useState)(e.defaultTab),o=(0,c.xb)({onCopyQuery:e.onCopyQuery}),l=(0,c.Ln)();return(0,i.useEffect)((()=>{n&&h(n)}),[a,n]),(0,i.useEffect)((()=>{s&&h(s)}),[a,s]),(0,i.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",h),h(t))}),[t]),(0,i.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",h))}),[n]),(0,i.useEffect)((()=>{s&&(s.setOption("lineNumbers",!1),s.setOption("gutters",[]),s.on("change",h))}),[s]),(0,d.jsx)(c.m_.Provider,{children:(0,d.jsxs)("div",{className:"graphiql-editors",children:[(0,d.jsx)("section",{className:"graphiql-query-editor ","aria-label":"Query Editor",children:(0,d.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,d.jsx)(c.wY,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,d.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,d.jsx)(c.cl,{}),(0,d.jsx)(c.IB,{onClick:()=>l(),label:"Prettify query (Shift-Ctrl-P)",children:(0,d.jsx)(c.RG,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,d.jsx)(c.IB,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)",children:(0,d.jsx)(c.Td,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,d.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,d.jsx)("div",{className:("variables"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("variables"===a?"":"variables")},children:"Variables"}),(0,d.jsx)("div",{className:("headers"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("headers"===a?"":"headers")},children:"Headers"})]})}),(0,d.jsxs)("section",{className:"graphiql-editor-tool "+(a&&a.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===a?"Variables":"Headers",children:[(0,d.jsx)(c.G0,{editorTheme:e.editorTheme,isHidden:"variables"!==a,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,d.jsx)(c.B4,{editorTheme:e.editorTheme,isHidden:"headers"!==a,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class p{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=n(50910),g=n(88244),x=n(56978);function y(){return(0,c.Vm)({nonNull:!0}).isFetching?(0,d.jsx)(c.y$,{}):null}const f={typegraph:"Typegraph",playground:"Playground"};function b(e){let{typegraph:t,query:n,code:a,headers:h={},variables:b={},panel:v="",noTool:j=!1,defaultMode:w=null}=e;const{siteConfig:{customFields:{tgUrl:S}}}=(0,r.A)(),q=(0,i.useMemo)((()=>new p),[]),N=(0,i.useMemo)((()=>(0,s.a5)({url:`${S}/${t}`})),[]),[k,_]=(0,i.useState)(w),[C,O]=(0,g.e)();return(0,d.jsxs)("div",{className:"@container miniql mb-4",children:[w?(0,d.jsx)(m.m,{choices:f,choice:k,onChange:_}):null,(0,d.jsx)(c.ql,{fetcher:N,defaultQuery:n.loc?.source.body.trim(),defaultHeaders:JSON.stringify(h),shouldPersistHeaders:!0,variables:JSON.stringify(b),storage:q,children:(0,d.jsxs)("div",{className:(w?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[w&&"typegraph"!==k?null:(0,d.jsx)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0 relative",children:(0,d.jsx)(m.m,{choices:{typescript:"Typescript",python:"Python"},choice:C,onChange:O,className:"ml-2",children:a?.map((e=>(0,d.jsxs)(x.A,{value:e.codeLanguage,children:[(0,d.jsxs)(l.A,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,className:"absolute top-0 right-0 m-2 p-1",children:[e?.codeFileUrl?.split("/").pop()," \u2197"]}),(0,d.jsx)(o.A,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content})]},e.codeLanguage)))})}),w&&"playground"!==k?null:(0,d.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,d.jsx)("div",{className:"flex-1 graphiql-session",children:(0,d.jsx)(u,{defaultTab:v,noTool:j})}),(0,d.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,d.jsx)(y,{}),(0,d.jsx)(c.ny,{})]})]})]})})]})}function v(e){return(0,d.jsx)(a.A,{fallback:(0,d.jsx)("div",{children:"Loading..."}),children:()=>(0,d.jsx)(b,{...e})})}},81288:(e,t,n)=>{"use strict";n.d(t,{A:()=>a});var i=n(95649),s=(n(79474),n(13274));function a(e){let{python:t,typescript:n,...a}=e;const r=[t&&{content:t.content,codeLanguage:"python",codeFileUrl:t.path},n&&{content:n.content,codeLanguage:"typescript",codeFileUrl:n.path}].filter((e=>!!e));return(0,s.jsx)(i.A,{code:0==r.length?void 0:r,...a})}},68228:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"get_context"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"username"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:43}};t.loc.source={body:"query {\n  get_context {\n    username\n  }\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&t.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var i={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),i[e.name.value]=t}})),e.exports=t},573:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"catch_me_if_you_can"},arguments:[],directives:[]}]}}],loc:{start:0,end:75}};t.loc.source={body:"query {\n  catch_me_if_you_can\n  # the results panel should show an error\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&t.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var i={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),i[e.name.value]=t}})),e.exports=t},83530:e=>{e.exports={content:'@typegraph(\n  # ..\n)\ndef authentication(g: Graph):\n  deno = DenoRuntime()\n  public = Policy.public()\n\n  ctx = t.struct({"username": t.string().optional()})\n\n  # highlight-start\n  # expects a secret in metatype.yml\n  # `BASIC_[username]`\n  # highlight-next-line\n  g.auth(Auth.basic(["admin"]))\n  # highlight-end\n\n  g.expose(\n    get_context=deno.identity(ctx).apply(\n      {\n        "username": g.from_context("username"),\n      }\n    ),\n    default_policy=[public],\n  )',path:"examples/typegraphs/authentication.py"}},22748:e=>{e.exports={content:'await typegraph({\n  name: "authentication",\n}, (g) => {\n  const deno = new DenoRuntime();\n  const pub = Policy.public();\n\n  const ctx = t.struct({\n    "username": t.string().optional(),\n  });\n\n  // highlight-start\n  // expects a secret in metatype.yml\n  // `BASIC_[username]`\n  // highlight-next-line\n  g.auth(Auth.basic(["admin"]));\n  // highlight-end\n\n  g.expose({\n    get_context: deno.identity(ctx).apply({\n      username: g.fromContext("username"),\n    }).withPolicy(pub),\n  });\n});',path:"examples/typegraphs/authentication.ts"}},77743:e=>{e.exports={content:'@typegraph(\n  # highlight-next-line\n  cors=Cors(\n    # highlight-next-line\n    allow_origin=["https://not-this.domain"],\n    # highlight-next-line\n    allow_headers=["x-custom-header"],\n    # highlight-next-line\n    expose_headers=["header-1"],\n    # highlight-next-line\n    allow_credentials=True,\n    # highlight-next-line\n    max_age_sec=60,\n    # highlight-next-line\n  ),\n)\ndef auth(g: Graph):\n  random = RandomRuntime(seed=0, reset=None)\n  public = Policy.public()\n\n  g.expose(\n    public,\n    catch_me_if_you_can=random.gen(t.string()),\n  )',path:"examples/typegraphs/cors.py"}},30801:e=>{e.exports={content:'await typegraph({\n  name: "auth",\n  // highlight-next-line\n  cors: {\n    // highlight-next-line\n    allowOrigin: ["https://not-this.domain"],\n    // highlight-next-line\n    allowHeaders: ["x-custom-header"],\n    // highlight-next-line\n    exposeHeaders: ["header-1"],\n    // highlight-next-line\n    allowCredentials: true,\n    // highlight-next-line\n    maxAgeSec: 60,\n  },\n}, (g) => {\n  const random = new RandomRuntime({ seed: 0 });\n  const pub = Policy.public();\n\n  g.expose({\n    catch_me_if_you_can: random.gen(t.string()).withPolicy(pub),\n  });\n});',path:"examples/typegraphs/cors.ts"}}}]);
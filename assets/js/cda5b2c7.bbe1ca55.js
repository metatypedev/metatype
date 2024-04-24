(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[9742],{11165:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>l,contentTitle:()=>o,default:()=>p,frontMatter:()=>a,metadata:()=>c,toc:()=>d});var i=n(13274),s=n(99128),r=n(11640);const a={},o="Microservices orchestration",c={id:"microservice-orchestration/index",title:"Microservices orchestration",description:"Microservices and miniservices are architectural styles for developing applications by breaking them down into small, independent services that can be deployed and scaled independently. Each micro or mini service typically focuses on a specific business function or task, and communicates with other services through well-defined APIs.",source:"@site/use-cases/microservice-orchestration/index.mdx",sourceDirName:"microservice-orchestration",slug:"/microservice-orchestration/",permalink:"/use-cases/microservice-orchestration/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/microservice-orchestration/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",previous:{title:"IAM gateway",permalink:"/use-cases/iam-provider/"},next:{title:"ORM for the edge",permalink:"/use-cases/orm-for-the-edge/"}},l={},d=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}];function h(e){const t={h1:"h1",h2:"h2",img:"img",p:"p",...(0,s.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(t.h1,{id:"microservices-orchestration",children:"Microservices orchestration"}),"\n",(0,i.jsx)(t.p,{children:"Microservices and miniservices are architectural styles for developing applications by breaking them down into small, independent services that can be deployed and scaled independently. Each micro or mini service typically focuses on a specific business function or task, and communicates with other services through well-defined APIs."}),"\n",(0,i.jsx)(t.h2,{id:"case-study",children:"Case study"}),"\n",(0,i.jsx)("div",{className:"text-center md:float-right p-8",children:(0,i.jsx)(t.p,{children:(0,i.jsx)(t.img,{src:n(70896).A+""})})}),"\n",(0,i.jsx)(t.p,{children:"Let's say your company develop a healthcare platform and that one of the microservices is responsible for handling patient records (owned by team A), and another microservice is responsible for handling appointment scheduling (owned by team B)."}),"\n",(0,i.jsx)(t.p,{children:"When a patient schedules an appointment, the appointment scheduling microservice needs access to the patient's records to ensure that the appointment is scheduled with the right provider and that the provider has the necessary information to provide effective care. However, since patient records contain sensitive information, it is important to ensure that only authorized users have access to them."}),"\n",(0,i.jsx)(t.p,{children:"To achieve this, the healthcare platform must use authentication and authorization on each API, which allows sharing only required information."}),"\n",(0,i.jsx)(t.h2,{id:"metatypes-solution",children:"Metatype's solution"}),"\n",(0,i.jsx)(t.p,{children:"Metatype can act as a central entry point for all incoming requests and responses between the microservices themselves and external clients. It is responsible for routing requests to the appropriate microservices and handling responses from those microservices, while verifying the authentication and authorization for each request."}),"\n",(0,i.jsx)(t.p,{children:"Additionally, Metatype gateway can provide other important features such as rate limiting, caching, and request/response transformations. It can even provide an API from another typegraph and delegate the query processing to it."}),"\n",(0,i.jsx)(r.A,{typegraph:"team-a",python:n(95229),typescript:n(55851),query:n(18673)})]})}function p(e={}){const{wrapper:t}={...(0,s.R)(),...e.components};return t?(0,i.jsx)(t,{...e,children:(0,i.jsx)(h,{...e})}):h(e)}},26787:(e,t,n)=>{"use strict";n.d(t,{A:()=>b});var i=n(79474),s=n(80126),r=n(8035),a=n(84221),o=n(80872),c=n(3649),l=n(34077),d=n(13274);const h=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function p(e){const{queryEditor:t,variableEditor:n,headerEditor:s}=(0,l.mi)({nonNull:!0}),[r,a]=(0,i.useState)(e.defaultTab),o=(0,l.xb)({onCopyQuery:e.onCopyQuery}),c=(0,l.Ln)();return(0,i.useEffect)((()=>{n&&h(n)}),[r,n]),(0,i.useEffect)((()=>{s&&h(s)}),[r,s]),(0,i.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",h),h(t))}),[t]),(0,i.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",h))}),[n]),(0,i.useEffect)((()=>{s&&(s.setOption("lineNumbers",!1),s.setOption("gutters",[]),s.on("change",h))}),[s]),(0,d.jsx)(l.m_.Provider,{children:(0,d.jsxs)("div",{className:"graphiql-editors",children:[(0,d.jsx)("section",{className:"graphiql-query-editor ","aria-label":"Query Editor",children:(0,d.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,d.jsx)(l.wY,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,d.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,d.jsx)(l.cl,{}),(0,d.jsx)(l.IB,{onClick:()=>c(),label:"Prettify query (Shift-Ctrl-P)",children:(0,d.jsx)(l.RG,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,d.jsx)(l.IB,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)",children:(0,d.jsx)(l.Td,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,d.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,d.jsx)("div",{className:("variables"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{a("variables"===r?"":"variables")},children:"Variables"}),(0,d.jsx)("div",{className:("headers"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{a("headers"===r?"":"headers")},children:"Headers"})]})}),(0,d.jsxs)("section",{className:"graphiql-editor-tool "+(r&&r.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===r?"Variables":"Headers",children:[(0,d.jsx)(l.G0,{editorTheme:e.editorTheme,isHidden:"variables"!==r,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,d.jsx)(l.B4,{editorTheme:e.editorTheme,isHidden:"headers"!==r,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class u{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=n(2222),g=n(82192),v=n(30947);function y(){return(0,l.Vm)({nonNull:!0}).isFetching?(0,d.jsx)(l.y$,{}):null}const f={typegraph:"Typegraph",playground:"Playground"};function x(e){let{typegraph:t,query:n,code:r,headers:h={},variables:x={},panel:b="",noTool:j=!1,defaultMode:w=null,disablePlayground:q=!1}=e;const{siteConfig:{customFields:{tgUrl:k}}}=(0,a.A)(),N=(0,i.useMemo)((()=>new u),[]),E=(0,i.useMemo)((()=>(0,s.a5)({url:`${k}/${t}`})),[]),[M,_]=(0,i.useState)(w),[C,A]=(0,g.e)();return(0,d.jsxs)("div",{className:"@container miniql mb-4",children:[w?(0,d.jsx)(m.m,{choices:f,choice:M,onChange:_}):null,(0,d.jsx)(l.ql,{fetcher:E,defaultQuery:n.loc?.source.body.trim(),defaultHeaders:JSON.stringify(h),shouldPersistHeaders:!0,variables:JSON.stringify(x),storage:N,children:(0,d.jsxs)("div",{className:(w?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[w&&"typegraph"!==M?null:(0,d.jsx)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0 relative",children:(0,d.jsx)(m.m,{choices:{typescript:"Typescript",python:"Python"},choice:C,onChange:A,className:"ml-2",children:r?.map((e=>(0,d.jsxs)(v.A,{value:e.codeLanguage,children:[(0,d.jsxs)(c.A,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,className:"absolute top-0 right-0 m-2 p-1",children:[e?.codeFileUrl?.split("/").pop()," \u2197"]}),(0,d.jsx)(o.A,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content})]},e.codeLanguage)))})}),q||w&&"playground"!==M?null:(0,d.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,d.jsx)("div",{className:"flex-1 graphiql-session",children:(0,d.jsx)(p,{defaultTab:b,noTool:j})}),(0,d.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,d.jsx)(y,{}),(0,d.jsx)(l.ny,{})]})]})]})})]})}function b(e){return(0,d.jsx)(r.A,{fallback:(0,d.jsx)("div",{children:"Loading..."}),children:()=>(0,d.jsx)(x,{...e})})}},11640:(e,t,n)=>{"use strict";n.d(t,{A:()=>r});var i=n(26787),s=(n(79474),n(13274));function r(e){let{python:t,typescript:n,...r}=e;const a=[t&&{content:t.content,codeLanguage:"python",codeFileUrl:t.path},n&&{content:n.content,codeLanguage:"typescript",codeFileUrl:n.path}].filter((e=>!!e));return(0,s.jsx)(i.A,{code:0==a.length?void 0:a,...r})}},18673:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"version_team_b"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"version_team_a"},arguments:[],directives:[]}]}}],loc:{start:0,end:45}};t.loc.source={body:"query {\n  version_team_b\n\n  version_team_a\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&t.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var i={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),i[e.name.value]=t}})),e.exports=t},70896:(e,t,n)=>{"use strict";n.d(t,{A:()=>i});const i=n.p+"assets/images/image.drawio-bfa7a9325fe21576a24a097c2c28615c.svg"},95229:e=>{e.exports={content:'@typegraph(\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n)\ndef team_a(g: Graph):\n  public = Policy.public()\n\n  deno = DenoRuntime()\n  records = GraphQLRuntime(\n    environ.get("TG_URL", "http://localhost:7890") + "/team-b"\n  )\n\n  g.expose(\n    public,\n    version_team_b=records.query(\n      t.struct({}), t.integer(), path=["version"]\n    ),\n    version_team_a=deno.static(t.integer(), 3),\n  )\n\n\n# @typegraph(\n# )\n# def team_b(g: Graph):\n#   public = Policy.public()\n#\n#   deno = DenoRuntime()\n#\n#   g.expose(\n#     public,\n#     version=deno.static(t.integer(), 12),\n#     record=deno.static(t.struct({"weight": t.integer()}), {"weight": 100}),\n#   )',path:"examples/typegraphs/microservice-orchestration.py"}},55851:e=>{e.exports={content:'await typegraph({\n  name: "team-a",\n}, (g) => {\n  const pub = Policy.public();\n\n  const deno = new DenoRuntime();\n  const records = new GraphQLRuntime(\n    getEnvOrDefault("TG_URL", "http://localhost:7890" + "/team-b"),\n  );\n\n  g.expose({\n    version_team_b: records.query(t.struct({}), t.integer(), ["version"]),\n    version_team_a: deno.static(t.integer(), 3),\n  }, pub);\n});',path:"examples/typegraphs/microservice-orchestration.ts"}}}]);
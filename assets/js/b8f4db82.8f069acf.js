(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[4619],{59798:(e,r,t)=>{"use strict";t.r(r),t.d(r,{assets:()=>c,contentTitle:()=>l,default:()=>m,frontMatter:()=>o,metadata:()=>i,toc:()=>p});var s=t(13274),n=t(99128),a=t(81288);const o={},l="Temporal",i={id:"reference/runtimes/temporal/index",title:"Temporal",description:"Temporal runtime",source:"@site/docs/reference/runtimes/temporal/index.mdx",sourceDirName:"reference/runtimes/temporal",slug:"/reference/runtimes/temporal/",permalink:"/docs/reference/runtimes/temporal/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/runtimes/temporal/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"S3",permalink:"/docs/reference/runtimes/s3/"},next:{title:"Wasm",permalink:"/docs/reference/runtimes/wasm/"}},c={},p=[{value:"Temporal runtime",id:"temporal-runtime",level:2}];function d(e){const r={a:"a",code:"code",h1:"h1",h2:"h2",li:"li",p:"p",ul:"ul",...(0,n.R)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(r.h1,{id:"temporal",children:"Temporal"}),"\n",(0,s.jsx)(r.h2,{id:"temporal-runtime",children:"Temporal runtime"}),"\n",(0,s.jsxs)(r.p,{children:[(0,s.jsx)(r.a,{href:"https://temporal.io/",children:"Temporal"})," is an open-source durable execution engine that can be used to develop workflows that are long lived and failure resistant.\nCommon use cases include:"]}),"\n",(0,s.jsxs)(r.ul,{children:["\n",(0,s.jsx)(r.li,{children:"Implementing multi-step, complicated transactionaly business logic."}),"\n",(0,s.jsx)(r.li,{children:"Guaranteed event processing."}),"\n",(0,s.jsx)(r.li,{children:"Control planes for driving processes."}),"\n"]}),"\n",(0,s.jsxs)(r.p,{children:["The ",(0,s.jsx)(r.code,{children:"TemporalRuntime"})," in Metatype can be used to directly ",(0,s.jsx)(r.code,{children:"start"}),", ",(0,s.jsx)(r.code,{children:"query"}),", ",(0,s.jsx)(r.code,{children:"signal"})," and ",(0,s.jsx)(r.code,{children:"describe"})," workflows on your temporal cluster.\nRefer to the ",(0,s.jsx)(r.a,{href:"https://docs.temporal.io",children:"temporal docs"})," for more on what you can accomplish with this tech."]}),"\n",(0,s.jsx)(r.p,{children:"An interesting use case is to dynamically describe the operations you want to expose, this enables reusing typegraphs accross different projects or even building a small framework around it."}),"\n",(0,s.jsx)(r.p,{children:"Here is a simple example of a typegraph that takes some value from an environment variable."}),"\n",(0,s.jsx)(a.A,{typegraph:"temporal",python:t(60160),typescript:t(7110),disablePlayground:!0,query:{content:""}})]})}function m(e={}){const{wrapper:r}={...(0,n.R)(),...e.components};return r?(0,s.jsx)(r,{...e,children:(0,s.jsx)(d,{...e})}):d(e)}},95649:(e,r,t)=>{"use strict";t.d(r,{A:()=>j});var s=t(79474),n=t(355),a=t(70792),o=t(96116),l=t(31604),i=t(12956),c=t(17537),p=t(13274);const d=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function m(e){const{queryEditor:r,variableEditor:t,headerEditor:n}=(0,c.mi)({nonNull:!0}),[a,o]=(0,s.useState)(e.defaultTab),l=(0,c.xb)({onCopyQuery:e.onCopyQuery}),i=(0,c.Ln)();return(0,s.useEffect)((()=>{t&&d(t)}),[a,t]),(0,s.useEffect)((()=>{n&&d(n)}),[a,n]),(0,s.useEffect)((()=>{r&&(r.setOption("lineNumbers",!1),r.setOption("extraKeys",{"Alt-G":()=>{r.replaceSelection("@")}}),r.setOption("gutters",[]),r.on("change",d),d(r))}),[r]),(0,s.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("gutters",[]),t.on("change",d))}),[t]),(0,s.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",d))}),[n]),(0,p.jsx)(c.m_.Provider,{children:(0,p.jsxs)("div",{className:"graphiql-editors",children:[(0,p.jsx)("section",{className:"graphiql-query-editor ","aria-label":"Query Editor",children:(0,p.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,p.jsx)(c.wY,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,p.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,p.jsx)(c.cl,{}),(0,p.jsx)(c.IB,{onClick:()=>i(),label:"Prettify query (Shift-Ctrl-P)",children:(0,p.jsx)(c.RG,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,p.jsx)(c.IB,{onClick:()=>l(),label:"Copy query (Shift-Ctrl-C)",children:(0,p.jsx)(c.Td,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,p.jsxs)(p.Fragment,{children:[(0,p.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,p.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,p.jsx)("div",{className:("variables"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{o("variables"===a?"":"variables")},children:"Variables"}),(0,p.jsx)("div",{className:("headers"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{o("headers"===a?"":"headers")},children:"Headers"})]})}),(0,p.jsxs)("section",{className:"graphiql-editor-tool "+(a&&a.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===a?"Variables":"Headers",children:[(0,p.jsx)(c.G0,{editorTheme:e.editorTheme,isHidden:"variables"!==a,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,p.jsx)(c.B4,{editorTheme:e.editorTheme,isHidden:"headers"!==a,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class h{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,r){this.map.has(e)||(this.length+=1),this.map.set(e,r)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var u=t(50910),g=t(88244),y=t(56978);function f(){return(0,c.Vm)({nonNull:!0}).isFetching?(0,p.jsx)(c.y$,{}):null}const x={typegraph:"Typegraph",playground:"Playground"};function b(e){let{typegraph:r,query:t,code:a,headers:d={},variables:b={},panel:j="",noTool:w=!1,defaultMode:v=null,disablePlayground:k=!1}=e;const{siteConfig:{customFields:{tgUrl:N}}}=(0,o.A)(),_=(0,s.useMemo)((()=>new h),[]),q=(0,s.useMemo)((()=>(0,n.a5)({url:`${N}/${r}`})),[]),[T,C]=(0,s.useState)(v),[E,O]=(0,g.e)();return(0,p.jsxs)("div",{className:"@container miniql mb-4",children:[v?(0,p.jsx)(u.m,{choices:x,choice:T,onChange:C}):null,(0,p.jsx)(c.ql,{fetcher:q,defaultQuery:t.loc?.source.body.trim(),defaultHeaders:JSON.stringify(d),shouldPersistHeaders:!0,variables:JSON.stringify(b),storage:_,children:(0,p.jsxs)("div",{className:(v?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[v&&"typegraph"!==T?null:(0,p.jsx)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0 relative",children:(0,p.jsx)(u.m,{choices:{typescript:"Typescript",python:"Python"},choice:E,onChange:O,className:"ml-2",children:a?.map((e=>(0,p.jsxs)(y.A,{value:e.codeLanguage,children:[(0,p.jsxs)(i.A,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,className:"absolute top-0 right-0 m-2 p-1",children:[e?.codeFileUrl?.split("/").pop()," \u2197"]}),(0,p.jsx)(l.A,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content})]},e.codeLanguage)))})}),k||v&&"playground"!==T?null:(0,p.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,p.jsx)("div",{className:"flex-1 graphiql-session",children:(0,p.jsx)(m,{defaultTab:j,noTool:w})}),(0,p.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,p.jsx)(f,{}),(0,p.jsx)(c.ny,{})]})]})]})})]})}function j(e){return(0,p.jsx)(a.A,{fallback:(0,p.jsx)("div",{children:"Loading..."}),children:()=>(0,p.jsx)(b,{...e})})}},81288:(e,r,t)=>{"use strict";t.d(r,{A:()=>a});var s=t(95649),n=(t(79474),t(13274));function a(e){let{python:r,typescript:t,...a}=e;const o=[r&&{content:r.content,codeLanguage:"python",codeFileUrl:r.path},t&&{content:t.content,codeLanguage:"typescript",codeFileUrl:t.path}].filter((e=>!!e));return(0,n.jsx)(s.A,{code:0==o.length?void 0:o,...a})}},60160:e=>{e.exports={content:'from typegraph import t, typegraph, Policy, Graph\nfrom typegraph.providers.temporal import TemporalRuntime\nimport os\n\n\n@typegraph()\ndef temporal(g: Graph):\n  public = Policy.public()\n  temporal = TemporalRuntime(\n    "<name>", "<host_secret>", namespace_secret="<ns_secret>"\n  )\n\n  workflow_id = os.getenv("ID_FROM_ENV")\n  arg = t.struct({"some_field": t.string()})\n\n  g.expose(\n    public,\n    start=temporal.start_workflow("<workflow_type>", arg),\n    query=temporal.query_workflow(\n      "<query_type>", arg, t.string()\n    ),\n    signal=temporal.signal_workflow("<signal_name>", arg),\n    describe=temporal.describe_workflow().reduce(\n      {"workflow_id": workflow_id}\n    )\n    if workflow_id\n    else temporal.describe_workflow(),\n  )',path:"examples/typegraphs/temporal.py"}},7110:e=>{e.exports={content:'import { Policy, t, typegraph } from "@typegraph/sdk/index.js";\nimport { TemporalRuntime } from "@typegraph/sdk/providers/temporal.js";\n\n\ntypegraph({ name: "temporal" }, (g: any) => {\n  const pub = Policy.public();\n  const temporal = new TemporalRuntime({\n    name: "<name>",\n    hostSecret: "<host_secret>",\n    namespaceSecret: "<ns_secret>",\n  });\n\n  const workflow_id = getEnvVariable("ID_FROM_ENV");\n  const arg = t.struct({ some_field: t.string() });\n\n  g.expose({\n    start: temporal.startWorkflow("<workflow_type>", arg),\n    query: temporal.queryWorkflow("<query_type>", arg, t.string()),\n    signal: temporal.signalWorkflow("<signal_name>", arg),\n    describe: workflow_id\n      ? temporal.describeWorkflow().reduce({ workflow_id })\n      : temporal.describeWorkflow(),\n  }, pub);\n});',path:"examples/typegraphs/temporal.ts"}}}]);
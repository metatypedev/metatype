(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[1479],{1343:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>c,contentTitle:()=>o,default:()=>p,frontMatter:()=>a,metadata:()=>l,toc:()=>h});var i=n(11527),r=n(88672),s=n(47550);const a={},o="CORS",l={id:"reference/typegate/cors/index",title:"CORS",description:"Cross-Origin Resource Sharing (CORS) on the one hand is a mechanism that allows or denies cross-origin requests in the browser. It avoids that other websites use your API without explicitly allowing it. Note that it doesn't protect other servers or a mobile app from using your typegraphs, only browsers implements the CORS mechanism. See this documentation for the details.",source:"@site/docs/reference/typegate/cors/index.mdx",sourceDirName:"reference/typegate/cors",slug:"/reference/typegate/cors/",permalink:"/docs/reference/typegate/cors/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/typegate/cors/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Authentication",permalink:"/docs/reference/typegate/authentication/"},next:{title:"Rate limiting",permalink:"/docs/reference/typegate/rate-limiting/"}},c={},h=[];function d(e){const t={a:"a",code:"code",h1:"h1",p:"p",pre:"pre",...(0,r.a)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(t.h1,{id:"cors",children:"CORS"}),"\n",(0,i.jsxs)(t.p,{children:["Cross-Origin Resource Sharing (CORS) on the one hand is a mechanism that allows or denies cross-origin requests in the browser. It avoids that other websites use your API without explicitly allowing it. Note that it doesn't protect other servers or a mobile app from using your typegraphs, only browsers implements the CORS mechanism. See this ",(0,i.jsx)(t.a,{href:"https://developer.mozilla.org/en/docs/Web/HTTP/CORS",children:"documentation"})," for the details."]}),"\n",(0,i.jsx)(s.Z,{typegraph:"cors",python:n(9237),typescript:n(53481),query:n(88992)}),"\n",(0,i.jsx)(t.p,{children:"If your browser support well CORS, you should see an error and even more if you try to run the interactive demo. By the way, there is a hidden core header in all interactive demos you have met so far:"}),"\n",(0,i.jsx)(t.pre,{children:(0,i.jsx)(t.code,{className:"language-python",children:'TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"])\n'})})]})}function p(e={}){const{wrapper:t}={...(0,r.a)(),...e.components};return t?(0,i.jsx)(t,{...e,children:(0,i.jsx)(d,{...e})}):d(e)}},73269:(e,t,n)=>{"use strict";n.d(t,{r:()=>r});n(50959);var i=n(11527);function r(e){let{name:t,choices:n,choice:r,onChange:s,className:a}=e;return(0,i.jsx)("ul",{className:`pl-0 m-0 list-none w-full ${a??""}`,children:Object.entries(n).map((e=>{let[n,a]=e;return(0,i.jsx)("li",{className:"inline-block rounded-md overflow-clip mr-1",children:(0,i.jsx)("div",{children:(0,i.jsxs)("label",{className:"cursor-pointer",children:[(0,i.jsx)("input",{type:"radio",name:t,value:n,checked:n===r,onChange:()=>s(n),className:"hidden peer"}),(0,i.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:a})]})})},n)}))})}},31572:(e,t,n)=>{"use strict";n.d(t,{Z:()=>f});var i=n(50959),r=n(73327),s=n(54143),a=n(22),o=n(31175),l=n(82142),c=n(23843),h=n(11527);const d=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function p(e){const{queryEditor:t,variableEditor:n,headerEditor:r}=(0,c._i)({nonNull:!0}),[s,a]=(0,i.useState)(e.defaultTab),o=(0,c.Xd)({onCopyQuery:e.onCopyQuery}),l=(0,c.fE)();return(0,i.useEffect)((()=>{n&&d(n)}),[s,n]),(0,i.useEffect)((()=>{r&&d(r)}),[s,r]),(0,i.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",d),d(t))}),[t]),(0,i.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",d))}),[n]),(0,i.useEffect)((()=>{r&&(r.setOption("lineNumbers",!1),r.setOption("gutters",[]),r.on("change",d))}),[r]),(0,h.jsx)(c.u.Provider,{children:(0,h.jsxs)("div",{className:"graphiql-editors",children:[(0,h.jsx)("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor",children:(0,h.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,h.jsx)(c.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,h.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,h.jsx)(c._8,{}),(0,h.jsx)(c.wC,{onClick:()=>l(),label:"Prettify query (Shift-Ctrl-P)",children:(0,h.jsx)(c.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,h.jsx)(c.wC,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)",children:(0,h.jsx)(c.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,h.jsxs)(h.Fragment,{children:[(0,h.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,h.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,h.jsx)("div",{className:("variables"===s?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{a("variables"===s?"":"variables")},children:"Variables"}),(0,h.jsx)("div",{className:("headers"===s?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{a("headers"===s?"":"headers")},children:"Headers"})]})}),(0,h.jsxs)("section",{className:"graphiql-editor-tool "+(s&&s.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===s?"Variables":"Headers",children:[(0,h.jsx)(c.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==s,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,h.jsx)(c.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==s,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class u{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=n(73269);function g(){return(0,c.JB)({nonNull:!0}).isFetching?(0,h.jsx)(c.$j,{}):null}const x={typegraph:"Typegraph",playground:"Playground"};function y(e){let{typegraph:t,query:n,code:s,headers:d={},variables:y={},tab:f="",noTool:b=!1,defaultMode:v=null}=e;const{siteConfig:{customFields:{tgUrl:j}}}=(0,a.Z)(),w=(0,i.useMemo)((()=>new u),[]),N=(0,i.useMemo)((()=>(0,r.nq)({url:`${j}/${t}`})),[]),[C,k]=(0,i.useState)(v);return(0,h.jsxs)("div",{className:"@container miniql mb-5",children:[v?(0,h.jsx)(m.r,{name:"mode",choices:x,choice:C,onChange:k,className:"mb-2"}):null,(0,h.jsx)(c.j$,{fetcher:N,defaultQuery:n.loc?.source.body.trim(),defaultHeaders:JSON.stringify(d),shouldPersistHeaders:!0,variables:JSON.stringify(y),storage:w,children:(0,h.jsxs)("div",{className:(v?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[v&&"typegraph"!==C?null:s?.map((e=>(0,h.jsxs)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0",children:[e?.codeFileUrl?(0,h.jsxs)("div",{className:"p-2 text-xs font-light",children:["See/edit full code on"," ",(0,h.jsx)(l.Z,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,children:e?.codeFileUrl})]}):null,e?(0,h.jsx)(o.Z,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content}):null]}))),v&&"playground"!==C?null:(0,h.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,h.jsx)("div",{className:"flex-1 graphiql-session",children:(0,h.jsx)(p,{defaultTab:f,noTool:b})}),(0,h.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,h.jsx)(g,{}),(0,h.jsx)(c.iB,{})]})]})]})})]})}function f(e){return(0,h.jsx)(s.Z,{fallback:(0,h.jsx)("div",{children:"Loading..."}),children:()=>(0,h.jsx)(y,{...e})})}},47550:(e,t,n)=>{"use strict";n.d(t,{Z:()=>s});var i=n(31572),r=(n(50959),n(11527));function s(e){let{python:t,typescript:n,...s}=e;const a=[t&&{content:t.content,codeLanguage:"python",codeFileUrl:t.path},n&&{content:n.content,codeLanguage:"typescript",codeFileUrl:n.path}].filter((e=>!!e));return(0,r.jsx)(i.Z,{code:0==a.length?void 0:a,...s})}},88992:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"catch_me_if_you_can"},arguments:[],directives:[]}]}}],loc:{start:0,end:75}};t.loc.source={body:"query {\n  catch_me_if_you_can\n  # the results panel should show an error\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&t.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var i={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),i[e.name.value]=t}})),e.exports=t},9237:e=>{e.exports={content:'@typegraph(\n  # highlight-next-line\n  cors=Cors(\n    # highlight-next-line\n    allow_origin=["https://not-this.domain"],\n    # highlight-next-line\n    allow_headers=["x-custom-header"],\n    # highlight-next-line\n    expose_headers=["header-1"],\n    # highlight-next-line\n    allow_credentials=True,\n    # highlight-next-line\n    max_age_sec=60,\n    # highlight-next-line\n  ),\n)\ndef auth(g: Graph):\n  random = RandomRuntime(seed=0, reset=None)\n  public = Policy.public()\n\n  g.expose(\n    public,\n    catch_me_if_you_can=random.gen(t.string()),\n  )',path:"examples/typegraphs/cors.py"}},53481:e=>{e.exports={content:'typegraph({\n  name: "auth",\n  // highlight-next-line\n  cors: {\n    // highlight-next-line\n    allowOrigin: ["https://not-this.domain"],\n    // highlight-next-line\n    allowHeaders: ["x-custom-header"],\n    // highlight-next-line\n    exposeHeaders: ["header-1"],\n    // highlight-next-line\n    allowCredentials: true,\n    // highlight-next-line\n    maxAgeSec: 60,\n  },\n}, (g) => {\n  const random = new RandomRuntime({ seed: 0 });\n  const pub = Policy.public();\n\n  g.expose({\n    catch_me_if_you_can: random.gen(t.string()).withPolicy(pub),\n  });\n});',path:"examples/typegraphs/cors.ts"}}}]);
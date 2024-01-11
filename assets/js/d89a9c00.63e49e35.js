(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[1479],{19326:(e,t,i)=>{"use strict";i.r(t),i.d(t,{assets:()=>c,contentTitle:()=>o,default:()=>p,frontMatter:()=>a,metadata:()=>l,toc:()=>d});var n=i(11527),r=i(67541),s=i(83060);const a={},o="CORS",l={id:"reference/typegate/cors/index",title:"CORS",description:"Cross-Origin Resource Sharing (CORS) on the one hand is a mechanism that allows or denies cross-origin requests in the browser. It avoids that other websites use your API without explicitly allowing it. Note that it doesn't protect other servers or a mobile app from using your typegraphs, only browsers implements the CORS mechanism. See this documentation for the details.",source:"@site/docs/reference/typegate/cors/index.mdx",sourceDirName:"reference/typegate/cors",slug:"/reference/typegate/cors/",permalink:"/docs/reference/typegate/cors/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/typegate/cors/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Authentication",permalink:"/docs/reference/typegate/authentication/"},next:{title:"Rate limiting",permalink:"/docs/reference/typegate/rate-limiting/"}},c={},d=[];function h(e){const t={a:"a",code:"code",h1:"h1",p:"p",pre:"pre",...(0,r.a)(),...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(t.h1,{id:"cors",children:"CORS"}),"\n",(0,n.jsxs)(t.p,{children:["Cross-Origin Resource Sharing (CORS) on the one hand is a mechanism that allows or denies cross-origin requests in the browser. It avoids that other websites use your API without explicitly allowing it. Note that it doesn't protect other servers or a mobile app from using your typegraphs, only browsers implements the CORS mechanism. See this ",(0,n.jsx)(t.a,{href:"https://developer.mozilla.org/en/docs/Web/HTTP/CORS",children:"documentation"})," for the details."]}),"\n",(0,n.jsx)(s.Z,{typegraph:"cors",python:i(87470),query:i(88992)}),"\n",(0,n.jsx)(t.p,{children:"If your browser support well CORS, you should see an error and even more if you try to run the interactive demo. By the way, there is a hidden core header in all interactive demos you have met so far:"}),"\n",(0,n.jsx)(t.pre,{children:(0,n.jsx)(t.code,{className:"language-python",children:'TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"])\n'})})]})}function p(e={}){const{wrapper:t}={...(0,r.a)(),...e.components};return t?(0,n.jsx)(t,{...e,children:(0,n.jsx)(h,{...e})}):h(e)}},39805:(e,t,i)=>{"use strict";i.d(t,{r:()=>r});i(50959);var n=i(11527);function r(e){let{name:t,choices:i,choice:r,onChange:s,className:a}=e;return(0,n.jsx)("ul",{className:`pl-0 m-0 list-none w-full ${a??""}`,children:Object.entries(i).map((e=>{let[i,a]=e;return(0,n.jsx)("li",{className:"inline-block rounded-md overflow-clip mr-1",children:(0,n.jsx)("div",{children:(0,n.jsxs)("label",{className:"cursor-pointer",children:[(0,n.jsx)("input",{type:"radio",name:t,value:i,checked:i===r,onChange:()=>s(i),className:"hidden peer"}),(0,n.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:a})]})})},i)}))})}},814:(e,t,i)=>{"use strict";i.d(t,{Z:()=>y});var n=i(50959),r=i(73327),s=i(49790),a=i(56096),o=i(40067),l=i(25920),c=i(54314),d=i(11527);const h=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function p(e){const{queryEditor:t,variableEditor:i,headerEditor:r}=(0,c._i)({nonNull:!0}),[s,a]=(0,n.useState)(e.defaultTab),o=(0,c.Xd)({onCopyQuery:e.onCopyQuery}),l=(0,c.fE)();return(0,n.useEffect)((()=>{i&&h(i)}),[s,i]),(0,n.useEffect)((()=>{r&&h(r)}),[s,r]),(0,n.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",h),h(t))}),[t]),(0,n.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("gutters",[]),i.on("change",h))}),[i]),(0,n.useEffect)((()=>{r&&(r.setOption("lineNumbers",!1),r.setOption("gutters",[]),r.on("change",h))}),[r]),(0,d.jsx)(c.u.Provider,{children:(0,d.jsxs)("div",{className:"graphiql-editors",children:[(0,d.jsx)("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor",children:(0,d.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,d.jsx)(c.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,d.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,d.jsx)(c._8,{}),(0,d.jsx)(c.wC,{onClick:()=>l(),label:"Prettify query (Shift-Ctrl-P)",children:(0,d.jsx)(c.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,d.jsx)(c.wC,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)",children:(0,d.jsx)(c.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,d.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,d.jsx)("div",{className:("variables"===s?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{a("variables"===s?"":"variables")},children:"Variables"}),(0,d.jsx)("div",{className:("headers"===s?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{a("headers"===s?"":"headers")},children:"Headers"})]})}),(0,d.jsxs)("section",{className:"graphiql-editor-tool "+(s&&s.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===s?"Variables":"Headers",children:[(0,d.jsx)(c.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==s,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,d.jsx)(c.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==s,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class u{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=i(39805);function g(){return(0,c.JB)({nonNull:!0}).isFetching?(0,d.jsx)(c.$j,{}):null}const f={typegraph:"Typegraph",playground:"Playground"};function x(e){let{typegraph:t,query:i,code:s,codeLanguage:h,codeFileUrl:x,headers:y={},variables:b={},tab:v="",noTool:j=!1,defaultMode:w=null}=e;const{siteConfig:{customFields:{tgUrl:N}}}=(0,a.Z)(),C=(0,n.useMemo)((()=>new u),[]),k=(0,n.useMemo)((()=>(0,r.nq)({url:`${N}/${t}`})),[]),[O,S]=(0,n.useState)(w);return(0,d.jsxs)("div",{className:"@container miniql mb-5",children:[w?(0,d.jsx)(m.r,{name:"mode",choices:f,choice:O,onChange:S,className:"mb-2"}):null,(0,d.jsx)(c.j$,{fetcher:k,defaultQuery:i.loc?.source.body.trim(),defaultHeaders:JSON.stringify(y),shouldPersistHeaders:!0,variables:JSON.stringify(b),storage:C,children:(0,d.jsxs)("div",{className:(w?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[w&&"typegraph"!==O?null:(0,d.jsxs)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0",children:[x?(0,d.jsxs)("div",{className:"p-2 text-xs font-light",children:["See/edit full code on"," ",(0,d.jsx)(l.Z,{href:`https://github.com/metatypedev/metatype/blob/main/${x}`,children:x})]}):null,s?(0,d.jsx)(o.Z,{language:h,wrap:!0,className:"flex-1",children:s}):null]}),w&&"playground"!==O?null:(0,d.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,d.jsx)("div",{className:"flex-1 graphiql-session",children:(0,d.jsx)(p,{defaultTab:v,noTool:j})}),(0,d.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,d.jsx)(g,{}),(0,d.jsx)(c.iB,{})]})]})]})})]})}function y(e){return(0,d.jsx)(s.Z,{fallback:(0,d.jsx)("div",{children:"Loading..."}),children:()=>(0,d.jsx)(x,{...e})})}},83060:(e,t,i)=>{"use strict";i.d(t,{Z:()=>s});var n=i(814),r=(i(50959),i(11527));function s(e){let{python:t,...i}=e;return(0,r.jsx)(n.Z,{code:t.content,codeLanguage:"python",codeFileUrl:t.path,...i})}},88992:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"catch_me_if_you_can"},arguments:[],directives:[]}]}}],loc:{start:0,end:75}};t.loc.source={body:"query {\n  catch_me_if_you_can\n  # the results panel should show an error\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function i(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var n=e.type;"NamedType"===n.kind&&t.add(n.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){i(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){i(e,t)})),e.definitions&&e.definitions.forEach((function(e){i(e,t)}))}var n={};t.definitions.forEach((function(e){if(e.name){var t=new Set;i(e,t),n[e.name.value]=t}})),e.exports=t},87470:e=>{e.exports={content:'@typegraph(\n  # highlight-next-line\n  cors=Cors(\n    # highlight-next-line\n    allow_origin=["https://not-this.domain"],\n    # highlight-next-line\n    allow_headers=["x-custom-header"],\n    # highlight-next-line\n    expose_headers=["header-1"],\n    # highlight-next-line\n    allow_credentials=True,\n    # highlight-next-line\n    max_age_sec=60,\n    # highlight-next-line\n  ),\n)\ndef auth(g: Graph):\n  random = RandomRuntime(seed=0)\n  public = Policy.public()\n\n  g.expose(\n    public,\n    catch_me_if_you_can=random.gen(t.string()),\n  )',path:"website/docs/reference/typegate/cors/cors.py"}}}]);
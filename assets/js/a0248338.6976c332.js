(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[1036],{1982:(e,s,t)=>{"use strict";t.r(s),t.d(s,{assets:()=>d,contentTitle:()=>n,default:()=>p,frontMatter:()=>l,metadata:()=>o,toc:()=>c});var r=t(11527),i=t(67541),a=(t(83060),t(40067));const l={sidebar_position:50},n="Write REST endpoints",o={id:"guides/rest/index",title:"Write REST endpoints",description:"Typegraph",source:"@site/docs/guides/rest/index.mdx",sourceDirName:"guides/rest",slug:"/guides/rest/",permalink:"/docs/guides/rest/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/guides/rest/index.mdx",tags:[],version:"current",sidebarPosition:50,frontMatter:{sidebar_position:50},sidebar:"docs",previous:{title:"Upload files to cloud storage",permalink:"/docs/guides/files-upload/"},next:{title:"Secure your requests",permalink:"/docs/guides/securing-requests/"}},d={},c=[{value:"Typegraph",id:"typegraph",level:2}];function h(e){const s={h1:"h1",h2:"h2",...(0,i.a)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(s.h1,{id:"write-rest-endpoints",children:"Write REST endpoints"}),"\n",(0,r.jsx)(s.h2,{id:"typegraph",children:"Typegraph"}),"\n",(0,r.jsx)(a.Z,{language:"python",children:t(73243).content})]})}function p(e={}){const{wrapper:s}={...(0,i.a)(),...e.components};return s?(0,r.jsx)(s,{...e,children:(0,r.jsx)(h,{...e})}):h(e)}},39805:(e,s,t)=>{"use strict";t.d(s,{r:()=>i});t(50959);var r=t(11527);function i(e){let{name:s,choices:t,choice:i,onChange:a,className:l}=e;return(0,r.jsx)("ul",{className:`pl-0 m-0 list-none w-full ${l??""}`,children:Object.entries(t).map((e=>{let[t,l]=e;return(0,r.jsx)("li",{className:"inline-block rounded-md overflow-clip mr-1",children:(0,r.jsx)("div",{children:(0,r.jsxs)("label",{className:"cursor-pointer",children:[(0,r.jsx)("input",{type:"radio",name:s,value:t,checked:t===i,onChange:()=>a(t),className:"hidden peer"}),(0,r.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:l})]})})},t)}))})}},814:(e,s,t)=>{"use strict";t.d(s,{Z:()=>b});var r=t(50959),i=t(73327),a=t(49790),l=t(56096),n=t(40067),o=t(25920),d=t(54314),c=t(11527);const h=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function p(e){const{queryEditor:s,variableEditor:t,headerEditor:i}=(0,d._i)({nonNull:!0}),[a,l]=(0,r.useState)(e.defaultTab),n=(0,d.Xd)({onCopyQuery:e.onCopyQuery}),o=(0,d.fE)();return(0,r.useEffect)((()=>{t&&h(t)}),[a,t]),(0,r.useEffect)((()=>{i&&h(i)}),[a,i]),(0,r.useEffect)((()=>{s&&(s.setOption("lineNumbers",!1),s.setOption("extraKeys",{"Alt-G":()=>{s.replaceSelection("@")}}),s.setOption("gutters",[]),s.on("change",h),h(s))}),[s]),(0,r.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("gutters",[]),t.on("change",h))}),[t]),(0,r.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("gutters",[]),i.on("change",h))}),[i]),(0,c.jsx)(d.u.Provider,{children:(0,c.jsxs)("div",{className:"graphiql-editors",children:[(0,c.jsx)("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor",children:(0,c.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,c.jsx)(d.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,c.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,c.jsx)(d._8,{}),(0,c.jsx)(d.wC,{onClick:()=>o(),label:"Prettify query (Shift-Ctrl-P)",children:(0,c.jsx)(d.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,c.jsx)(d.wC,{onClick:()=>n(),label:"Copy query (Shift-Ctrl-C)",children:(0,c.jsx)(d.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,c.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,c.jsx)("div",{className:("variables"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{l("variables"===a?"":"variables")},children:"Variables"}),(0,c.jsx)("div",{className:("headers"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{l("headers"===a?"":"headers")},children:"Headers"})]})}),(0,c.jsxs)("section",{className:"graphiql-editor-tool "+(a&&a.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===a?"Variables":"Headers",children:[(0,c.jsx)(d.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==a,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,c.jsx)(d.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==a,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class u{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,s){this.map.has(e)||(this.length+=1),this.map.set(e,s)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=t(39805);function g(){return(0,d.JB)({nonNull:!0}).isFetching?(0,c.jsx)(d.$j,{}):null}const x={typegraph:"Typegraph",playground:"Playground"};function y(e){let{typegraph:s,query:t,code:a,codeLanguage:h,codeFileUrl:y,headers:b={},variables:f={},tab:j="",noTool:v=!1,defaultMode:N=null}=e;const{siteConfig:{customFields:{tgUrl:q}}}=(0,l.Z)(),k=(0,r.useMemo)((()=>new u),[]),C=(0,r.useMemo)((()=>(0,i.nq)({url:`${q}/${s}`})),[]),[E,T]=(0,r.useState)(N);return(0,c.jsxs)("div",{className:"@container miniql mb-5",children:[N?(0,c.jsx)(m.r,{name:"mode",choices:x,choice:E,onChange:T,className:"mb-2"}):null,(0,c.jsx)(d.j$,{fetcher:C,defaultQuery:t.loc?.source.body.trim(),defaultHeaders:JSON.stringify(b),shouldPersistHeaders:!0,variables:JSON.stringify(f),storage:k,children:(0,c.jsxs)("div",{className:(N?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[N&&"typegraph"!==E?null:(0,c.jsxs)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0",children:[y?(0,c.jsxs)("div",{className:"p-2 text-xs font-light",children:["See/edit full code on"," ",(0,c.jsx)(o.Z,{href:`https://github.com/metatypedev/metatype/blob/main/${y}`,children:y})]}):null,a?(0,c.jsx)(n.Z,{language:h,wrap:!0,className:"flex-1",children:a}):null]}),N&&"playground"!==E?null:(0,c.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,c.jsx)("div",{className:"flex-1 graphiql-session",children:(0,c.jsx)(p,{defaultTab:j,noTool:v})}),(0,c.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,c.jsx)(g,{}),(0,c.jsx)(d.iB,{})]})]})]})})]})}function b(e){return(0,c.jsx)(a.Z,{fallback:(0,c.jsx)("div",{children:"Loading..."}),children:()=>(0,c.jsx)(y,{...e})})}},83060:(e,s,t)=>{"use strict";t.d(s,{Z:()=>a});var r=t(814),i=(t(50959),t(11527));function a(e){let{python:s,...t}=e;return(0,i.jsx)(r.Z,{code:s.content,codeLanguage:"python",codeFileUrl:s.path,...t})}},73243:e=>{e.exports={content:"",path:"website/docs/guides/rest/example_rest.py"}}}]);
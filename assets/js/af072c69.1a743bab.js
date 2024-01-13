(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[1797],{13927:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>l,contentTitle:()=>o,default:()=>u,frontMatter:()=>r,metadata:()=>d,toc:()=>c});var a=n(11527),i=n(67541),s=n(83060);const r={},o="Backend for frontend",d={id:"backend-for-frontend/index",title:"Backend for frontend",description:"Backend for frontend (BFF) is an architectural pattern in which each frontend client has a dedicated backend system. It enables client-specific customization of backend APIs with data transformations and optimizes requests by pre-fetching and caching data.",source:"@site/use-cases/backend-for-frontend/index.mdx",sourceDirName:"backend-for-frontend",slug:"/backend-for-frontend/",permalink:"/use-cases/backend-for-frontend/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/backend-for-frontend/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",previous:{title:"Instant APIs on your database",permalink:"/use-cases/automatic-crud-validation/"},next:{title:"Cloud function runner",permalink:"/use-cases/faas-runner/"}},l={},c=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}];function h(e){const t={h1:"h1",h2:"h2",img:"img",p:"p",...(0,i.a)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(t.h1,{id:"backend-for-frontend",children:"Backend for frontend"}),"\n",(0,a.jsx)(t.p,{children:"Backend for frontend (BFF) is an architectural pattern in which each frontend client has a dedicated backend system. It enables client-specific customization of backend APIs with data transformations and optimizes requests by pre-fetching and caching data."}),"\n",(0,a.jsx)(t.h2,{id:"case-study",children:"Case study"}),"\n",(0,a.jsx)("div",{className:"text-center md:float-right p-8",children:(0,a.jsx)(t.p,{children:(0,a.jsx)(t.img,{src:n(31848).Z+""})})}),"\n",(0,a.jsx)(t.p,{children:"Imagine you have a web frontend and a mobile app that both consume data from a microservices-based backend. The web frontend requires certain data fields in a given format, and the mobile app requires the same additional fields in another format."}),"\n",(0,a.jsx)(t.p,{children:"In a traditional architecture, both the web and mobile frontends would have to make separate API calls to the microservices, and then format the data into the appropriate structure themselves. This can lead to duplicated code, increased latency due heavier calls with non-necessary data, and decreased developer efficiency."}),"\n",(0,a.jsx)(t.p,{children:"With a BFF in place, it handles the formatting of the data based on the specific needs of each client. All frontends can thus make a single API call to the BFF, which then communicates with the microservices, retrieves the data, and formats it into the required structure before returning it to the frontend."}),"\n",(0,a.jsx)(t.h2,{id:"metatypes-solution",children:"Metatype's solution"}),"\n",(0,a.jsx)(t.p,{children:"Metatype can act as a generic BFF component, serving multiple dedicated APIs and handling security, authentication and authorization for you. By encapsulating the logic for communicating with the microservices, Metatype helps to ensure that the frontends are as decoupled as possible from the other services, making it easier to make changes to either the frontend or the backend without affecting the other side."}),"\n",(0,a.jsx)(s.Z,{typegraph:"backend-for-frontend",python:n(83006),query:n(96131)})]})}function u(e={}){const{wrapper:t}={...(0,i.a)(),...e.components};return t?(0,a.jsx)(t,{...e,children:(0,a.jsx)(h,{...e})}):h(e)}},39805:(e,t,n)=>{"use strict";n.d(t,{r:()=>i});n(50959);var a=n(11527);function i(e){let{name:t,choices:n,choice:i,onChange:s,className:r}=e;return(0,a.jsx)("ul",{className:`pl-0 m-0 list-none w-full ${r??""}`,children:Object.entries(n).map((e=>{let[n,r]=e;return(0,a.jsx)("li",{className:"inline-block rounded-md overflow-clip mr-1",children:(0,a.jsx)("div",{children:(0,a.jsxs)("label",{className:"cursor-pointer",children:[(0,a.jsx)("input",{type:"radio",name:t,value:n,checked:n===i,onChange:()=>s(n),className:"hidden peer"}),(0,a.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:r})]})})},n)}))})}},814:(e,t,n)=>{"use strict";n.d(t,{Z:()=>x});var a=n(50959),i=n(73327),s=n(49790),r=n(56096),o=n(40067),d=n(25920),l=n(54314),c=n(11527);const h=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function u(e){const{queryEditor:t,variableEditor:n,headerEditor:i}=(0,l._i)({nonNull:!0}),[s,r]=(0,a.useState)(e.defaultTab),o=(0,l.Xd)({onCopyQuery:e.onCopyQuery}),d=(0,l.fE)();return(0,a.useEffect)((()=>{n&&h(n)}),[s,n]),(0,a.useEffect)((()=>{i&&h(i)}),[s,i]),(0,a.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",h),h(t))}),[t]),(0,a.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",h))}),[n]),(0,a.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("gutters",[]),i.on("change",h))}),[i]),(0,c.jsx)(l.u.Provider,{children:(0,c.jsxs)("div",{className:"graphiql-editors",children:[(0,c.jsx)("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor",children:(0,c.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,c.jsx)(l.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,c.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,c.jsx)(l._8,{}),(0,c.jsx)(l.wC,{onClick:()=>d(),label:"Prettify query (Shift-Ctrl-P)",children:(0,c.jsx)(l.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,c.jsx)(l.wC,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)",children:(0,c.jsx)(l.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,c.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,c.jsx)("div",{className:("variables"===s?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("variables"===s?"":"variables")},children:"Variables"}),(0,c.jsx)("div",{className:("headers"===s?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("headers"===s?"":"headers")},children:"Headers"})]})}),(0,c.jsxs)("section",{className:"graphiql-editor-tool "+(s&&s.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===s?"Variables":"Headers",children:[(0,c.jsx)(l.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==s,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,c.jsx)(l.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==s,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class m{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var p=n(39805);function f(){return(0,l.JB)({nonNull:!0}).isFetching?(0,c.jsx)(l.$j,{}):null}const g={typegraph:"Typegraph",playground:"Playground"};function b(e){let{typegraph:t,query:n,code:s,codeLanguage:h,codeFileUrl:b,headers:x={},variables:y={},tab:v="",noTool:j=!1,defaultMode:k=null}=e;const{siteConfig:{customFields:{tgUrl:N}}}=(0,r.Z)(),w=(0,a.useMemo)((()=>new m),[]),q=(0,a.useMemo)((()=>(0,i.nq)({url:`${N}/${t}`})),[]),[C,E]=(0,a.useState)(k);return(0,c.jsxs)("div",{className:"@container miniql mb-5",children:[k?(0,c.jsx)(p.r,{name:"mode",choices:g,choice:C,onChange:E,className:"mb-2"}):null,(0,c.jsx)(l.j$,{fetcher:q,defaultQuery:n.loc?.source.body.trim(),defaultHeaders:JSON.stringify(x),shouldPersistHeaders:!0,variables:JSON.stringify(y),storage:w,children:(0,c.jsxs)("div",{className:(k?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[k&&"typegraph"!==C?null:(0,c.jsxs)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0",children:[b?(0,c.jsxs)("div",{className:"p-2 text-xs font-light",children:["See/edit full code on"," ",(0,c.jsx)(d.Z,{href:`https://github.com/metatypedev/metatype/blob/main/${b}`,children:b})]}):null,s?(0,c.jsx)(o.Z,{language:h,wrap:!0,className:"flex-1",children:s}):null]}),k&&"playground"!==C?null:(0,c.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,c.jsx)("div",{className:"flex-1 graphiql-session",children:(0,c.jsx)(u,{defaultTab:v,noTool:j})}),(0,c.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,c.jsx)(f,{}),(0,c.jsx)(l.iB,{})]})]})]})})]})}function x(e){return(0,c.jsx)(s.Z,{fallback:(0,c.jsx)("div",{children:"Loading..."}),children:()=>(0,c.jsx)(b,{...e})})}},83060:(e,t,n)=>{"use strict";n.d(t,{Z:()=>s});var a=n(814),i=(n(50959),n(11527));function s(e){let{python:t,...n}=e;return(0,i.jsx)(a.Z,{code:t.content,codeLanguage:"python",codeFileUrl:t.path,...n})}},96131:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"stargazers"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"login"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"user"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]}]}}]}}]}}],loc:{start:0,end:67}};t.loc.source={body:"query {\n  stargazers {\n    login\n    user {\n      name\n    }\n  }\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var a=e.type;"NamedType"===a.kind&&t.add(a.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var a={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),a[e.name.value]=t}})),e.exports=t},31848:(e,t,n)=>{"use strict";n.d(t,{Z:()=>a});const a=n.p+"assets/images/image.drawio-8088ee38fb8a48af0f464425dcd4e5cd.svg"},83006:e=>{e.exports={content:"",path:"website/use-cases/backend-for-frontend/t.py"}}}]);
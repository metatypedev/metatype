"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[7403],{17942:(e,t,r)=>{r.d(t,{Zo:()=>p,kt:()=>g});var n=r(50959);function a(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function i(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function l(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?i(Object(r),!0).forEach((function(t){a(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):i(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function o(e,t){if(null==e)return{};var r,n,a=function(e,t){if(null==e)return{};var r,n,a={},i=Object.keys(e);for(n=0;n<i.length;n++)r=i[n],t.indexOf(r)>=0||(a[r]=e[r]);return a}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(n=0;n<i.length;n++)r=i[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(a[r]=e[r])}return a}var s=n.createContext({}),c=function(e){var t=n.useContext(s),r=t;return e&&(r="function"==typeof e?e(t):l(l({},t),e)),r},p=function(e){var t=c(e.components);return n.createElement(s.Provider,{value:t},e.children)},d="mdxType",m={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},u=n.forwardRef((function(e,t){var r=e.components,a=e.mdxType,i=e.originalType,s=e.parentName,p=o(e,["components","mdxType","originalType","parentName"]),d=c(r),u=a,g=d["".concat(s,".").concat(u)]||d[u]||m[u]||i;return r?n.createElement(g,l(l({ref:t},p),{},{components:r})):n.createElement(g,l({ref:t},p))}));function g(e,t){var r=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var i=r.length,l=new Array(i);l[0]=u;var o={};for(var s in t)hasOwnProperty.call(t,s)&&(o[s]=t[s]);o.originalType=e,o[d]="string"==typeof e?e:a,l[1]=o;for(var c=2;c<i;c++)l[c]=r[c];return n.createElement.apply(null,l)}return n.createElement.apply(null,r)}u.displayName="MDXCreateElement"},43726:(e,t,r)=>{r.d(t,{r:()=>a});var n=r(50959);function a(e){let{name:t,choices:r,choice:a,onChange:i,className:l}=e;return n.createElement("ul",{className:`pl-0 m-0 list-none w-full ${l??""}`},Object.entries(r).map((e=>{let[r,l]=e;return n.createElement("li",{key:r,className:"inline-block rounded-md overflow-clip mr-1"},n.createElement("div",null,n.createElement("label",{className:"cursor-pointer"},n.createElement("input",{type:"radio",name:t,value:r,checked:r===a,onChange:()=>i(r),className:"hidden peer"}),n.createElement("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white"},l))))})))}},66360:(e,t,r)=>{r.d(t,{Z:()=>f});var n=r(50959),a=r(55362),i=r(90430),l=r(85551),o=r(90116),s=r(14623);const c=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function p(e){const{queryEditor:t,variableEditor:r,headerEditor:a}=(0,s._i)({nonNull:!0}),[i,l]=(0,n.useState)(e.defaultTab),o=(0,s.Xd)({onCopyQuery:e.onCopyQuery}),p=(0,s.fE)();return(0,n.useEffect)((()=>{r&&c(r)}),[i,r]),(0,n.useEffect)((()=>{a&&c(a)}),[i,a]),(0,n.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",c),c(t))}),[t]),(0,n.useEffect)((()=>{r&&(r.setOption("lineNumbers",!1),r.setOption("gutters",[]),r.on("change",c))}),[r]),(0,n.useEffect)((()=>{a&&(a.setOption("lineNumbers",!1),a.setOption("gutters",[]),a.on("change",c))}),[a]),n.createElement(s.u.Provider,null,n.createElement("div",{className:"graphiql-editors"},n.createElement("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor"},n.createElement("div",{className:"graphiql-query-editor-wrapper"},n.createElement(s.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),n.createElement("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands"},n.createElement(s._8,null),n.createElement(s.wC,{onClick:()=>p(),label:"Prettify query (Shift-Ctrl-P)"},n.createElement(s.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})),n.createElement(s.wC,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)"},n.createElement(s.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"}))))),e.noTool?null:n.createElement(n.Fragment,null,n.createElement("div",{className:"graphiql-editor-tools p-0 text-sm "},n.createElement("div",{className:"graphiql-editor-tools-tabs"},n.createElement("div",{className:("variables"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{l("variables"===i?"":"variables")}},"Variables"),n.createElement("div",{className:("headers"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{l("headers"===i?"":"headers")}},"Headers"))),n.createElement("section",{className:"graphiql-editor-tool "+(i&&i.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===i?"Variables":"Headers"},n.createElement(s.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==i,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),n.createElement(s.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==i,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})))))}class d{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=r(43726);function u(){return(0,s.JB)({nonNull:!0}).isFetching?n.createElement(s.$j,null):null}const g={typegraph:"Typegraph",playground:"Playground"};function h(e){let{typegraph:t,query:r,code:i,codeLanguage:c,codeFileUrl:h,headers:f={},variables:y={},tab:b="",noTool:E=!1,defaultMode:v=null}=e;const{siteConfig:{customFields:{tgUrl:O}}}=(0,l.Z)(),N=(0,n.useMemo)((()=>new d),[]),x=(0,n.useMemo)((()=>(0,a.nq)({url:`${O}/${t}`})),[]),[w,k]=(0,n.useState)(v);return n.createElement("div",{className:"@container miniql mb-5"},v?n.createElement(m.r,{name:"mode",choices:g,choice:w,onChange:k,className:"mb-2"}):null,n.createElement(s.j$,{fetcher:x,defaultQuery:r.loc?.source.body.trim(),defaultHeaders:JSON.stringify(f),shouldPersistHeaders:!0,variables:JSON.stringify(y),storage:N},n.createElement("div",{className:(v?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first"},v&&"typegraph"!==w?null:n.createElement("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0"},h?n.createElement("div",{className:"p-2 text-xs font-light"},"See/edit full code on"," ",n.createElement("a",{href:`https://github.com/metatypedev/metatype/blob/main/${h}`},h)):null,i?n.createElement(o.Z,{language:c,wrap:!0,className:"flex-1"},i):null),v&&"playground"!==w?null:n.createElement("div",{className:"flex flex-col graphiql-container"},n.createElement("div",{className:"flex-1 graphiql-session"},n.createElement(p,{defaultTab:b,noTool:E})),n.createElement("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg"},n.createElement(u,null),n.createElement(s.iB,null))))))}function f(e){return n.createElement(i.Z,{fallback:n.createElement("div",null,"Loading...")},(()=>n.createElement(h,e)))}},31645:(e,t,r)=>{r.d(t,{Z:()=>l});var n=r(28957),a=r(66360),i=r(50959);function l(e){let{python:t,...r}=e;return i.createElement(a.Z,(0,n.Z)({code:t.content,codeLanguage:"python",codeFileUrl:t.path},r))}},74209:(e,t,r)=>{r.r(t),r.d(t,{assets:()=>s,contentTitle:()=>l,default:()=>m,frontMatter:()=>i,metadata:()=>o,toc:()=>c});var n=r(28957),a=(r(50959),r(17942));r(31645),r(90116);const i={},l="Importing openapi definitions",o={unversionedId:"guides/importing-openapi-definitions/index",id:"guides/importing-openapi-definitions/index",title:"Importing openapi definitions",description:"Typegraph",source:"@site/docs/guides/importing-openapi-definitions/index.mdx",sourceDirName:"guides/importing-openapi-definitions",slug:"/guides/importing-openapi-definitions/",permalink:"/docs/guides/importing-openapi-definitions/",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/guides/importing-openapi-definitions/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Importing graphql definitions",permalink:"/docs/guides/importing-graphql-definitions/"},next:{title:"Self-hosting",permalink:"/docs/guides/self-hosting"}},s={},c=[{value:"Typegraph",id:"typegraph",level:2}],p={toc:c},d="wrapper";function m(e){let{components:t,...r}=e;return(0,a.kt)(d,(0,n.Z)({},p,r,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("h1",{id:"importing-openapi-definitions"},"Importing openapi definitions"),(0,a.kt)("h2",{id:"typegraph"},"Typegraph"))}m.isMDXComponent=!0}}]);
(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[662],{17942:(e,t,r)=>{"use strict";r.d(t,{Zo:()=>d,kt:()=>h});var a=r(50959);function n(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function l(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,a)}return r}function i(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?l(Object(r),!0).forEach((function(t){n(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):l(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function o(e,t){if(null==e)return{};var r,a,n=function(e,t){if(null==e)return{};var r,a,n={},l=Object.keys(e);for(a=0;a<l.length;a++)r=l[a],t.indexOf(r)>=0||(n[r]=e[r]);return n}(e,t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(a=0;a<l.length;a++)r=l[a],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(n[r]=e[r])}return n}var s=a.createContext({}),c=function(e){var t=a.useContext(s),r=t;return e&&(r="function"==typeof e?e(t):i(i({},t),e)),r},d=function(e){var t=c(e.components);return a.createElement(s.Provider,{value:t},e.children)},u="mdxType",m={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},p=a.forwardRef((function(e,t){var r=e.components,n=e.mdxType,l=e.originalType,s=e.parentName,d=o(e,["components","mdxType","originalType","parentName"]),u=c(r),p=n,h=u["".concat(s,".").concat(p)]||u[p]||m[p]||l;return r?a.createElement(h,i(i({ref:t},d),{},{components:r})):a.createElement(h,i({ref:t},d))}));function h(e,t){var r=arguments,n=t&&t.mdxType;if("string"==typeof e||n){var l=r.length,i=new Array(l);i[0]=p;var o={};for(var s in t)hasOwnProperty.call(t,s)&&(o[s]=t[s]);o.originalType=e,o[u]="string"==typeof e?e:n,i[1]=o;for(var c=2;c<l;c++)i[c]=r[c];return a.createElement.apply(null,i)}return a.createElement.apply(null,r)}p.displayName="MDXCreateElement"},43726:(e,t,r)=>{"use strict";r.d(t,{r:()=>n});var a=r(50959);function n(e){let{name:t,choices:r,choice:n,onChange:l,className:i}=e;return a.createElement("ul",{className:`pl-0 m-0 list-none w-full ${i??""}`},Object.entries(r).map((e=>{let[r,i]=e;return a.createElement("li",{key:r,className:"inline-block rounded-md overflow-clip mr-1"},a.createElement("div",null,a.createElement("label",{className:"cursor-pointer"},a.createElement("input",{type:"radio",name:t,value:r,checked:r===n,onChange:()=>l(r),className:"hidden peer"}),a.createElement("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white"},i))))})))}},66360:(e,t,r)=>{"use strict";r.d(t,{Z:()=>y});var a=r(50959),n=r(55362),l=r(90430),i=r(85551),o=r(90116),s=r(14623);const c=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function d(e){const{queryEditor:t,variableEditor:r,headerEditor:n}=(0,s._i)({nonNull:!0}),[l,i]=(0,a.useState)(e.defaultTab),o=(0,s.Xd)({onCopyQuery:e.onCopyQuery}),d=(0,s.fE)();return(0,a.useEffect)((()=>{r&&c(r)}),[l,r]),(0,a.useEffect)((()=>{n&&c(n)}),[l,n]),(0,a.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",c),c(t))}),[t]),(0,a.useEffect)((()=>{r&&(r.setOption("lineNumbers",!1),r.setOption("gutters",[]),r.on("change",c))}),[r]),(0,a.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",c))}),[n]),a.createElement(s.u.Provider,null,a.createElement("div",{className:"graphiql-editors"},a.createElement("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor"},a.createElement("div",{className:"graphiql-query-editor-wrapper"},a.createElement(s.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),a.createElement("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands"},a.createElement(s._8,null),a.createElement(s.wC,{onClick:()=>d(),label:"Prettify query (Shift-Ctrl-P)"},a.createElement(s.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})),a.createElement(s.wC,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)"},a.createElement(s.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"}))))),e.noTool?null:a.createElement(a.Fragment,null,a.createElement("div",{className:"graphiql-editor-tools p-0 text-sm "},a.createElement("div",{className:"graphiql-editor-tools-tabs"},a.createElement("div",{className:("variables"===l?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{i("variables"===l?"":"variables")}},"Variables"),a.createElement("div",{className:("headers"===l?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{i("headers"===l?"":"headers")}},"Headers"))),a.createElement("section",{className:"graphiql-editor-tool "+(l&&l.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===l?"Variables":"Headers"},a.createElement(s.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==l,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),a.createElement(s.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==l,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})))))}class u{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=r(43726);function p(){return(0,s.JB)({nonNull:!0}).isFetching?a.createElement(s.$j,null):null}const h={typegraph:"Typegraph",playground:"Playground"};function g(e){let{typegraph:t,query:r,code:l,codeLanguage:c,codeFileUrl:g,headers:y={},variables:f={},tab:b="",noTool:E=!1,defaultMode:v=null}=e;const{siteConfig:{customFields:{tgUrl:w}}}=(0,i.Z)(),O=(0,a.useMemo)((()=>new u),[]),x=(0,a.useMemo)((()=>(0,n.nq)({url:`${w}/${t}`})),[]),[N,k]=(0,a.useState)(v);return a.createElement("div",{className:"@container miniql mb-5"},v?a.createElement(m.r,{name:"mode",choices:h,choice:N,onChange:k,className:"mb-2"}):null,a.createElement(s.j$,{fetcher:x,defaultQuery:r.loc?.source.body.trim(),defaultHeaders:JSON.stringify(y),shouldPersistHeaders:!0,variables:JSON.stringify(f),storage:O},a.createElement("div",{className:(v?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first"},v&&"typegraph"!==N?null:a.createElement("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0"},g?a.createElement("div",{className:"p-2 text-xs font-light"},"See/edit full code on"," ",a.createElement("a",{href:`https://github.com/metatypedev/metatype/blob/main/${g}`},g)):null,l?a.createElement(o.Z,{language:c,wrap:!0,className:"flex-1"},l):null),v&&"playground"!==N?null:a.createElement("div",{className:"flex flex-col graphiql-container"},a.createElement("div",{className:"flex-1 graphiql-session"},a.createElement(d,{defaultTab:b,noTool:E})),a.createElement("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg"},a.createElement(p,null),a.createElement(s.iB,null))))))}function y(e){return a.createElement(l.Z,{fallback:a.createElement("div",null,"Loading...")},(()=>a.createElement(g,e)))}},31645:(e,t,r)=>{"use strict";r.d(t,{Z:()=>i});var a=r(28957),n=r(66360),l=r(50959);function i(e){let{python:t,...r}=e;return l.createElement(n.Z,(0,a.Z)({code:t.content,codeLanguage:"python",codeFileUrl:t.path},r))}},90838:(e,t,r)=>{"use strict";r.r(t),r.d(t,{assets:()=>c,contentTitle:()=>o,default:()=>p,frontMatter:()=>i,metadata:()=>s,toc:()=>d});var a=r(28957),n=(r(50959),r(17942)),l=(r(31645),r(90116));const i={},o="Generate crud with prisma",s={unversionedId:"guides/crud-with-prisma/index",id:"guides/crud-with-prisma/index",title:"Generate crud with prisma",description:"Typegraph",source:"@site/docs/guides/crud-with-prisma/index.mdx",sourceDirName:"guides/crud-with-prisma",slug:"/guides/crud-with-prisma/",permalink:"/docs/guides/crud-with-prisma/",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/guides/crud-with-prisma/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Contributing",permalink:"/docs/guides/contributing"},next:{title:"Using external functions",permalink:"/docs/guides/external-functions/"}},c={},d=[{value:"Typegraph",id:"typegraph",level:2}],u={toc:d},m="wrapper";function p(e){let{components:t,...i}=e;return(0,n.kt)(m,(0,a.Z)({},u,i,{components:t,mdxType:"MDXLayout"}),(0,n.kt)("h1",{id:"generate-crud-with-prisma"},"Generate crud with prisma"),(0,n.kt)("h2",{id:"typegraph"},"Typegraph"),(0,n.kt)(l.Z,{language:"python",mdxType:"CodeBlock"},r(88048).content))}p.isMDXComponent=!0},88048:e=>{e.exports={content:"",path:"website/docs/guides/crud-with-prisma/prisma_blog.py"}}}]);
"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[3394],{17942:(e,t,a)=>{a.d(t,{Zo:()=>c,kt:()=>h});var r=a(50959);function n(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function i(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,r)}return a}function l(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?i(Object(a),!0).forEach((function(t){n(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):i(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function o(e,t){if(null==e)return{};var a,r,n=function(e,t){if(null==e)return{};var a,r,n={},i=Object.keys(e);for(r=0;r<i.length;r++)a=i[r],t.indexOf(a)>=0||(n[a]=e[a]);return n}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)a=i[r],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(n[a]=e[a])}return n}var s=r.createContext({}),p=function(e){var t=r.useContext(s),a=t;return e&&(a="function"==typeof e?e(t):l(l({},t),e)),a},c=function(e){var t=p(e.components);return r.createElement(s.Provider,{value:t},e.children)},m="mdxType",d={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},u=r.forwardRef((function(e,t){var a=e.components,n=e.mdxType,i=e.originalType,s=e.parentName,c=o(e,["components","mdxType","originalType","parentName"]),m=p(a),u=n,h=m["".concat(s,".").concat(u)]||m[u]||d[u]||i;return a?r.createElement(h,l(l({ref:t},c),{},{components:a})):r.createElement(h,l({ref:t},c))}));function h(e,t){var a=arguments,n=t&&t.mdxType;if("string"==typeof e||n){var i=a.length,l=new Array(i);l[0]=u;var o={};for(var s in t)hasOwnProperty.call(t,s)&&(o[s]=t[s]);o.originalType=e,o[m]="string"==typeof e?e:n,l[1]=o;for(var p=2;p<i;p++)l[p]=a[p];return r.createElement.apply(null,l)}return r.createElement.apply(null,a)}u.displayName="MDXCreateElement"},43726:(e,t,a)=>{a.d(t,{r:()=>n});var r=a(50959);function n(e){let{name:t,choices:a,choice:n,onChange:i,className:l}=e;return r.createElement("ul",{className:`pl-0 m-0 list-none w-full ${l??""}`},Object.entries(a).map((e=>{let[a,l]=e;return r.createElement("li",{key:a,className:"inline-block rounded-md overflow-clip mr-1"},r.createElement("div",null,r.createElement("label",{className:"cursor-pointer"},r.createElement("input",{type:"radio",name:t,value:a,checked:a===n,onChange:()=>i(a),className:"hidden peer"}),r.createElement("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white"},l))))})))}},66360:(e,t,a)=>{a.d(t,{Z:()=>y});var r=a(50959),n=a(55362),i=a(90430),l=a(85551),o=a(90116),s=a(14623);const p=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function c(e){const{queryEditor:t,variableEditor:a,headerEditor:n}=(0,s._i)({nonNull:!0}),[i,l]=(0,r.useState)(e.defaultTab),o=(0,s.Xd)({onCopyQuery:e.onCopyQuery}),c=(0,s.fE)();return(0,r.useEffect)((()=>{a&&p(a)}),[i,a]),(0,r.useEffect)((()=>{n&&p(n)}),[i,n]),(0,r.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",p),p(t))}),[t]),(0,r.useEffect)((()=>{a&&(a.setOption("lineNumbers",!1),a.setOption("gutters",[]),a.on("change",p))}),[a]),(0,r.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",p))}),[n]),r.createElement(s.u.Provider,null,r.createElement("div",{className:"graphiql-editors"},r.createElement("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor"},r.createElement("div",{className:"graphiql-query-editor-wrapper"},r.createElement(s.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),r.createElement("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands"},r.createElement(s._8,null),r.createElement(s.wC,{onClick:()=>c(),label:"Prettify query (Shift-Ctrl-P)"},r.createElement(s.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})),r.createElement(s.wC,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)"},r.createElement(s.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"}))))),e.noTool?null:r.createElement(r.Fragment,null,r.createElement("div",{className:"graphiql-editor-tools p-0 text-sm "},r.createElement("div",{className:"graphiql-editor-tools-tabs"},r.createElement("div",{className:("variables"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{l("variables"===i?"":"variables")}},"Variables"),r.createElement("div",{className:("headers"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{l("headers"===i?"":"headers")}},"Headers"))),r.createElement("section",{className:"graphiql-editor-tool "+(i&&i.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===i?"Variables":"Headers"},r.createElement(s.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==i,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),r.createElement(s.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==i,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})))))}class m{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var d=a(43726);function u(){return(0,s.JB)({nonNull:!0}).isFetching?r.createElement(s.$j,null):null}const h={typegraph:"Typegraph",playground:"Playground"};function g(e){let{typegraph:t,query:a,code:i,codeLanguage:p,codeFileUrl:g,headers:y={},variables:f={},tab:b="",noTool:k=!1,defaultMode:N=null}=e;const{siteConfig:{customFields:{tgUrl:E}}}=(0,l.Z)(),v=(0,r.useMemo)((()=>new m),[]),w=(0,r.useMemo)((()=>(0,n.nq)({url:`${E}/${t}`})),[]),[x,O]=(0,r.useState)(N);return r.createElement("div",{className:"@container miniql mb-5"},N?r.createElement(d.r,{name:"mode",choices:h,choice:x,onChange:O,className:"mb-2"}):null,r.createElement(s.j$,{fetcher:w,defaultQuery:a.loc?.source.body.trim(),defaultHeaders:JSON.stringify(y),shouldPersistHeaders:!0,variables:JSON.stringify(f),storage:v},r.createElement("div",{className:(N?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first"},N&&"typegraph"!==x?null:r.createElement("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0"},g?r.createElement("div",{className:"p-2 text-xs font-light"},"See/edit full code on"," ",r.createElement("a",{href:`https://github.com/metatypedev/metatype/blob/main/${g}`},g)):null,i?r.createElement(o.Z,{language:p,wrap:!0,className:"flex-1"},i):null),N&&"playground"!==x?null:r.createElement("div",{className:"flex flex-col graphiql-container"},r.createElement("div",{className:"flex-1 graphiql-session"},r.createElement(c,{defaultTab:b,noTool:k})),r.createElement("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg"},r.createElement(u,null),r.createElement(s.iB,null))))))}function y(e){return r.createElement(i.Z,{fallback:r.createElement("div",null,"Loading...")},(()=>r.createElement(g,e)))}},31645:(e,t,a)=>{a.d(t,{Z:()=>l});var r=a(28957),n=a(66360),i=a(50959);function l(e){let{python:t,...a}=e;return i.createElement(n.Z,(0,r.Z)({code:t.content,codeLanguage:"python",codeFileUrl:t.path},a))}},5488:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>s,contentTitle:()=>l,default:()=>d,frontMatter:()=>i,metadata:()=>o,toc:()=>p});var r=a(28957),n=(a(50959),a(17942));a(31645),a(90116);const i={sidebar_position:4},l="Import your existing APIs",o={unversionedId:"tutorials/import-your-existing-apis/index",id:"tutorials/import-your-existing-apis/index",title:"Import your existing APIs",description:"Let's summarize how far you progress made towards the chat-based app. The APIs should offer the following functionalities:",source:"@site/docs/tutorials/import-your-existing-apis/index.mdx",sourceDirName:"tutorials/import-your-existing-apis",slug:"/tutorials/import-your-existing-apis/",permalink:"/docs/tutorials/import-your-existing-apis/",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/tutorials/import-your-existing-apis/index.mdx",tags:[],version:"current",sidebarPosition:4,frontMatter:{sidebar_position:4},sidebar:"docs",previous:{title:"Adding more runtimes",permalink:"/docs/tutorials/adding-more-runtimes/"},next:{title:"Authentication and security",permalink:"/docs/tutorials/authentication-and-security/"}},s={},p=[{value:"Google importers",id:"google-importers",level:2},{value:"Effects",id:"effects",level:2},{value:"Introduction to typegraph_std",id:"introduction-to-typegraph_std",level:2}],c={toc:p},m="wrapper";function d(e){let{components:t,...a}=e;return(0,n.kt)(m,(0,r.Z)({},c,a,{components:t,mdxType:"MDXLayout"}),(0,n.kt)("h1",{id:"import-your-existing-apis"},"Import your existing APIs"),(0,n.kt)("p",null,"Let's summarize how far you progress made towards the chat-based app. The APIs should offer the following functionalities:"),(0,n.kt)("ul",null,(0,n.kt)("li",{parentName:"ul"},"list messages \u2705"),(0,n.kt)("li",{parentName:"ul"},"create a message \u2705"),(0,n.kt)("li",{parentName:"ul"},"retrieve the user from a message \u2705"),(0,n.kt)("li",{parentName:"ul"},"send a notification to all users when there is a new message \ud83d\udd63"),(0,n.kt)("li",{parentName:"ul"},"authentication and rate-limit the call \ud83d\udd63"),(0,n.kt)("li",{parentName:"ul"},"add access control management \ud83d\udd63"),(0,n.kt)("li",{parentName:"ul"},"some business logic \ud83d\udd63")),(0,n.kt)("p",null,"For the notifications, Google offer a ",(0,n.kt)("a",{parentName:"p",href:"https://firebase.google.com/docs/reference/fcm/rest"},"Firebase Cloud Messaging")," (FCM) API which supports push on iOS, Android and web. Sadly as most of Google service, they don't provide an OpenAPI specification or a friendly GraphQL API. Rather they developed their own API definition files called API Discovery Service which maps incoming REST request onto their internal GRPC implementation, but this is a digression."),(0,n.kt)("h2",{id:"google-importers"},"Google importers"),(0,n.kt)("p",null,"The typegraph module comes with some handy importers to avoid having to rewrite manually all types and materializers. Currently, it supports importers for OpenAPI, GraphQL API and Google APIs."),(0,n.kt)("admonition",{title:"Beta/unstable feature",type:"caution"},(0,n.kt)("p",{parentName:"admonition"},"Importers are quite recent and likely to evolve as feedback is received. Your voice and use cases matter a lot, let Metatype community know what suits you the best in this ",(0,n.kt)("a",{parentName:"p",href:"https://github.com/metatypedev/metatype/discussions/104"},"discussion"),".")),(0,n.kt)("p",null,"Importers are function call with a boolean re-writing the source code file where they live. As they can generate quite long type definition, the best practice is to separate them into a dedicated file that can be imported into your main typegraph. Let's create ",(0,n.kt)("inlineCode",{parentName:"p"},"google.py")," and run ",(0,n.kt)("inlineCode",{parentName:"p"},"python google.py")," to generate the types."),(0,n.kt)("p",null,"This should generate code similar to this:"),(0,n.kt)("p",null,"And can be imported/customized in your main typegraph file:"),(0,n.kt)("h2",{id:"effects"},"Effects"),(0,n.kt)("p",null,"Effects are a property of materializers and help categorization what happens to data when it gets transformed. Although they are similar to REST verbs and SQL statements, there is no direct one-to-one mapping."),(0,n.kt)("table",null,(0,n.kt)("thead",{parentName:"table"},(0,n.kt)("tr",{parentName:"thead"},(0,n.kt)("th",{parentName:"tr",align:null},"Effects"),(0,n.kt)("th",{parentName:"tr",align:null},"REST verbs"),(0,n.kt)("th",{parentName:"tr",align:null},"SQL statements"))),(0,n.kt)("tbody",{parentName:"table"},(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:null},(0,n.kt)("inlineCode",{parentName:"td"},"none")),(0,n.kt)("td",{parentName:"tr",align:null},"GET"),(0,n.kt)("td",{parentName:"tr",align:null},(0,n.kt)("inlineCode",{parentName:"td"},"SELECT"))),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:null},(0,n.kt)("inlineCode",{parentName:"td"},"create")),(0,n.kt)("td",{parentName:"tr",align:null},"POST"),(0,n.kt)("td",{parentName:"tr",align:null},(0,n.kt)("inlineCode",{parentName:"td"},"INSERT"))),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:null},(0,n.kt)("inlineCode",{parentName:"td"},"update")),(0,n.kt)("td",{parentName:"tr",align:null},"PUT/PATCH"),(0,n.kt)("td",{parentName:"tr",align:null},(0,n.kt)("inlineCode",{parentName:"td"},"UPDATE"))),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:null},(0,n.kt)("inlineCode",{parentName:"td"},"upsert")),(0,n.kt)("td",{parentName:"tr",align:null},"PUT"),(0,n.kt)("td",{parentName:"tr",align:null},(0,n.kt)("inlineCode",{parentName:"td"},"INSERT ON CONFLICT"))),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:null},(0,n.kt)("inlineCode",{parentName:"td"},"delete")),(0,n.kt)("td",{parentName:"tr",align:null},"DELETE"),(0,n.kt)("td",{parentName:"tr",align:null},(0,n.kt)("inlineCode",{parentName:"td"},"DELETE"))))),(0,n.kt)("p",null,"They provide hints to the typegates for the query orchestration by splitting the queries and mutations. For example, the ",(0,n.kt)("inlineCode",{parentName:"p"},"create")," effect is exposed as a mutation. They also allow setting different policies based on them, that's for the next page."),(0,n.kt)("h2",{id:"introduction-to-typegraph_std"},"Introduction to typegraph_std"),(0,n.kt)("p",null,"Alternatively, you can use the typegraph_std for the most common APIs.\nIt comes as a separate package so instead of maintening your own importers, you can use typegraph_std."),(0,n.kt)("p",null,"The package currently includes:"),(0,n.kt)("ul",null,(0,n.kt)("li",{parentName:"ul"},"Google APIs (fcm, firebase, youtube, etc.)"),(0,n.kt)("li",{parentName:"ul"},"Stripe"),(0,n.kt)("li",{parentName:"ul"},"Github")),(0,n.kt)("p",null,"As you can see, it works pretty much the same way as importers."))}d.isMDXComponent=!0}}]);
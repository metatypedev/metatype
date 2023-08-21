(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[1797],{17942:(e,t,n)=>{"use strict";n.d(t,{Zo:()=>d,kt:()=>h});var a=n(50959);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?i(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function s(e,t){if(null==e)return{};var n,a,r=function(e,t){if(null==e)return{};var n,a,r={},i=Object.keys(e);for(a=0;a<i.length;a++)n=i[a],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(a=0;a<i.length;a++)n=i[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var l=a.createContext({}),c=function(e){var t=a.useContext(l),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},d=function(e){var t=c(e.components);return a.createElement(l.Provider,{value:t},e.children)},u="mdxType",m={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},p=a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,i=e.originalType,l=e.parentName,d=s(e,["components","mdxType","originalType","parentName"]),u=c(n),p=r,h=u["".concat(l,".").concat(p)]||u[p]||m[p]||i;return n?a.createElement(h,o(o({ref:t},d),{},{components:n})):a.createElement(h,o({ref:t},d))}));function h(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var i=n.length,o=new Array(i);o[0]=p;var s={};for(var l in t)hasOwnProperty.call(t,l)&&(s[l]=t[l]);s.originalType=e,s[u]="string"==typeof e?e:r,o[1]=s;for(var c=2;c<i;c++)o[c]=n[c];return a.createElement.apply(null,o)}return a.createElement.apply(null,n)}p.displayName="MDXCreateElement"},30645:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>c,contentTitle:()=>s,default:()=>p,frontMatter:()=>o,metadata:()=>l,toc:()=>d});var a=n(52319),r=(n(50959),n(17942)),i=n(6809);const o={},s="Backend for frontend",l={unversionedId:"backend-for-frontend/index",id:"backend-for-frontend/index",title:"Backend for frontend",description:"Backend for frontend (BFF) is an architectural pattern in which each frontend client has a dedicated backend system. It enables client-specific customization of backend APIs with data transformations and optimizes requests by pre-fetching and caching data.",source:"@site/use-cases/backend-for-frontend/index.mdx",sourceDirName:"backend-for-frontend",slug:"/backend-for-frontend/",permalink:"/use-cases/backend-for-frontend/",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/backend-for-frontend/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",previous:{title:"Automatic CRUD + validation",permalink:"/use-cases/automatic-crud-validation/"},next:{title:"Function-as-a-service runner",permalink:"/use-cases/faas-runner/"}},c={},d=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}],u={toc:d},m="wrapper";function p(e){let{components:t,...o}=e;return(0,r.kt)(m,(0,a.Z)({},u,o,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("h1",{id:"backend-for-frontend"},"Backend for frontend"),(0,r.kt)("p",null,"Backend for frontend (BFF) is an architectural pattern in which each frontend client has a dedicated backend system. It enables client-specific customization of backend APIs with data transformations and optimizes requests by pre-fetching and caching data."),(0,r.kt)("h2",{id:"case-study"},"Case study"),(0,r.kt)("div",{className:"text-center md:float-right p-8"},(0,r.kt)("p",null,(0,r.kt)("img",{src:n(66115).Z,width:"311",height:"311"}))),(0,r.kt)("p",null,"Imagine you have a web frontend and a mobile app that both consume data from a microservices-based backend. The web frontend requires certain data fields in a given format, and the mobile app requires the same additional fields in another format."),(0,r.kt)("p",null,"In a traditional architecture, both the web and mobile frontends would have to make separate API calls to the microservices, and then format the data into the appropriate structure themselves. This can lead to duplicated code, increased latency due heavier calls with non-necessary data, and decreased developer efficiency."),(0,r.kt)("p",null,"With a BFF in place, it handles the formatting of the data based on the specific needs of each client. All frontends can thus make a single API call to the BFF, which then communicates with the microservices, retrieves the data, and formats it into the required structure before returning it to the frontend."),(0,r.kt)("h2",{id:"metatypes-solution"},"Metatype's solution"),(0,r.kt)("p",null,"Metatype can act as a generic BFF component, serving multiple dedicated APIs and handling security, authentication and authorization for you. By encapsulating the logic for communicating with the microservices, Metatype helps to ensure that the frontends are as decoupled as possible from the other services, making it easier to make changes to either the frontend or the backend without affecting the other side."),(0,r.kt)(i.Z,{typegraph:"backend-for-frontend",python:n(83006),query:n(24638),mdxType:"TGExample"}))}p.isMDXComponent=!0},3199:(e,t,n)=>{"use strict";n.d(t,{r:()=>r});var a=n(50959);function r(e){let{name:t,choices:n,choice:r,onChange:i,className:o}=e;return a.createElement("ul",{className:`pl-0 m-0 list-none w-full ${o??""}`},Object.entries(n).map((e=>{let[n,o]=e;return a.createElement("li",{key:n,className:"inline-block rounded-md overflow-clip mr-1"},a.createElement("div",null,a.createElement("label",{className:"cursor-pointer"},a.createElement("input",{type:"radio",name:t,value:n,checked:n===r,onChange:()=>i(n),className:"hidden peer"}),a.createElement("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white"},o))))})))}},53553:(e,t,n)=>{"use strict";n.d(t,{Z:()=>g});var a=n(50959),r=n(67243),i=n(66108),o=n(84318),s=n(23560),l=n(30391);const c=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function d(e){const{queryEditor:t,variableEditor:n,headerEditor:r}=(0,l._i)({nonNull:!0}),[i,o]=(0,a.useState)(e.defaultTab),s=(0,l.Xd)({onCopyQuery:e.onCopyQuery}),d=(0,l.fE)();return(0,a.useEffect)((()=>{n&&c(n)}),[i,n]),(0,a.useEffect)((()=>{r&&c(r)}),[i,r]),(0,a.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",c),c(t))}),[t]),(0,a.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",c))}),[n]),(0,a.useEffect)((()=>{r&&(r.setOption("lineNumbers",!1),r.setOption("gutters",[]),r.on("change",c))}),[r]),a.createElement(l.u.Provider,null,a.createElement("div",{className:"graphiql-editors"},a.createElement("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor"},a.createElement("div",{className:"graphiql-query-editor-wrapper"},a.createElement(l.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),a.createElement("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands"},a.createElement(l._8,null),a.createElement(l.wC,{onClick:()=>d(),label:"Prettify query (Shift-Ctrl-P)"},a.createElement(l.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})),a.createElement(l.wC,{onClick:()=>s(),label:"Copy query (Shift-Ctrl-C)"},a.createElement(l.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"}))))),e.noTool?null:a.createElement(a.Fragment,null,a.createElement("div",{className:"graphiql-editor-tools p-0 text-sm "},a.createElement("div",{className:"graphiql-editor-tools-tabs"},a.createElement("div",{className:("variables"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{o("variables"===i?"":"variables")}},"Variables"),a.createElement("div",{className:("headers"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{o("headers"===i?"":"headers")}},"Headers"))),a.createElement("section",{className:"graphiql-editor-tool "+(i&&i.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===i?"Variables":"Headers"},a.createElement(l.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==i,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),a.createElement(l.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==i,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})))))}class u{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=n(3199);function p(){return(0,l.JB)({nonNull:!0}).isFetching?a.createElement(l.$j,null):null}const h={typegraph:"Typegraph",playground:"Playground"};function f(e){let{typegraph:t,query:n,code:i,codeLanguage:c,codeFileUrl:f,headers:g={},variables:y={},tab:b="",noTool:v=!1,defaultMode:k=null}=e;const{siteConfig:{customFields:{tgUrl:E}}}=(0,o.Z)(),w=(0,a.useMemo)((()=>new u),[]),O=(0,a.useMemo)((()=>(0,r.nq)({url:`${E}/${t}`})),[]),[N,x]=(0,a.useState)(k);return a.createElement("div",{className:"@container miniql mb-5"},k?a.createElement(m.r,{name:"mode",choices:h,choice:N,onChange:x,className:"mb-2"}):null,a.createElement(l.j$,{fetcher:O,defaultQuery:n.loc?.source.body.trim(),defaultHeaders:JSON.stringify(g),shouldPersistHeaders:!0,variables:JSON.stringify(y),storage:w},a.createElement("div",{className:(k?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first"},k&&"typegraph"!==N?null:a.createElement("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0"},f?a.createElement("div",{className:"p-2 text-xs font-light"},"See/edit full code on"," ",a.createElement("a",{href:`https://github.com/metatypedev/metatype/blob/main/${f}`},f)):null,i?a.createElement(s.Z,{language:c,wrap:!0,className:"flex-1"},i):null),k&&"playground"!==N?null:a.createElement("div",{className:"flex flex-col graphiql-container"},a.createElement("div",{className:"flex-1 graphiql-session"},a.createElement(d,{defaultTab:b,noTool:v})),a.createElement("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg"},a.createElement(p,null),a.createElement(l.iB,null))))))}function g(e){return a.createElement(i.Z,{fallback:a.createElement("div",null,"Loading...")},(()=>a.createElement(f,e)))}},6809:(e,t,n)=>{"use strict";n.d(t,{Z:()=>o});var a=n(52319),r=n(53553),i=n(50959);function o(e){let{python:t,...n}=e;return i.createElement(r.Z,(0,a.Z)({code:t.content,codeLanguage:"python",codeFileUrl:t.path},n))}},24638:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"stargazers"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"login"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"user"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]}]}}]}}]}}],loc:{start:0,end:67}};t.loc.source={body:"query {\n  stargazers {\n    login\n    user {\n      name\n    }\n  }\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var a=e.type;"NamedType"===a.kind&&t.add(a.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var a={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),a[e.name.value]=t}})),e.exports=t},66115:(e,t,n)=>{"use strict";n.d(t,{Z:()=>a});const a=n.p+"assets/images/image.drawio-8088ee38fb8a48af0f464425dcd4e5cd.svg"},83006:e=>{e.exports={content:'with TypeGraph(\n  "backend-for-frontend",\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n) as g:\n  public = policies.public()\n  github = HTTPRuntime("https://api.github.com")\n\n  stargazer = t.struct(\n    {\n      "login": t.string().named("login"),\n      "user": github.get(\n        "/users/{user}",\n        t.struct(\n          {"user": t.string().from_parent(g("login"))}\n        ),\n        t.struct({"name": t.string().optional()}),\n      ),\n    }\n  )\n\n  g.expose(\n    stargazers=github.get(\n      "/repos/metatypedev/metatype/stargazers?per_page=2",\n      t.struct({}),\n      t.array(stargazer),\n    ),\n    default_policy=[public],\n  )',path:"website/use-cases/backend-for-frontend/t.py"}}}]);
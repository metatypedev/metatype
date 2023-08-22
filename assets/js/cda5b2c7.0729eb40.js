(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[4363],{17942:(e,t,n)=>{"use strict";n.d(t,{Zo:()=>d,kt:()=>h});var r=n(50959);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?i(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function s(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},i=Object.keys(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var l=r.createContext({}),c=function(e){var t=r.useContext(l),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},d=function(e){var t=c(e.components);return r.createElement(l.Provider,{value:t},e.children)},p="mdxType",m={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},u=r.forwardRef((function(e,t){var n=e.components,a=e.mdxType,i=e.originalType,l=e.parentName,d=s(e,["components","mdxType","originalType","parentName"]),p=c(n),u=a,h=p["".concat(l,".").concat(u)]||p[u]||m[u]||i;return n?r.createElement(h,o(o({ref:t},d),{},{components:n})):r.createElement(h,o({ref:t},d))}));function h(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var i=n.length,o=new Array(i);o[0]=u;var s={};for(var l in t)hasOwnProperty.call(t,l)&&(s[l]=t[l]);s.originalType=e,s[p]="string"==typeof e?e:a,o[1]=s;for(var c=2;c<i;c++)o[c]=n[c];return r.createElement.apply(null,o)}return r.createElement.apply(null,n)}u.displayName="MDXCreateElement"},27394:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>c,contentTitle:()=>s,default:()=>u,frontMatter:()=>o,metadata:()=>l,toc:()=>d});var r=n(52319),a=(n(50959),n(17942)),i=n(6809);const o={},s="Microservices orchestration",l={unversionedId:"microservice-orchestration/index",id:"microservice-orchestration/index",title:"Microservices orchestration",description:"Microservices and miniservices are architectural styles for developing applications by breaking them down into small, independent services that can be deployed and scaled independently. Each micro or mini service typically focuses on a specific business function or task, and communicates with other services through well-defined APIs.",source:"@site/use-cases/microservice-orchestration/index.mdx",sourceDirName:"microservice-orchestration",slug:"/microservice-orchestration/",permalink:"/use-cases/microservice-orchestration/",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/microservice-orchestration/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",previous:{title:"IAM provider",permalink:"/use-cases/iam-provider/"},next:{title:"ORM for the edge",permalink:"/use-cases/orm-for-the-edge/"}},c={},d=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}],p={toc:d},m="wrapper";function u(e){let{components:t,...o}=e;return(0,a.kt)(m,(0,r.Z)({},p,o,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("h1",{id:"microservices-orchestration"},"Microservices orchestration"),(0,a.kt)("p",null,"Microservices and miniservices are architectural styles for developing applications by breaking them down into small, independent services that can be deployed and scaled independently. Each micro or mini service typically focuses on a specific business function or task, and communicates with other services through well-defined APIs."),(0,a.kt)("h2",{id:"case-study"},"Case study"),(0,a.kt)("div",{className:"text-center md:float-right p-8"},(0,a.kt)("p",null,(0,a.kt)("img",{src:n(9395).Z,width:"261",height:"301"}))),(0,a.kt)("p",null,"Let's say your company develop a healthcare platform and that one of the microservices is responsible for handling patient records (owned by team A), and another microservice is responsible for handling appointment scheduling (owned by team B)."),(0,a.kt)("p",null,"When a patient schedules an appointment, the appointment scheduling microservice needs access to the patient's records to ensure that the appointment is scheduled with the right provider and that the provider has the necessary information to provide effective care. However, since patient records contain sensitive information, it is important to ensure that only authorized users have access to them."),(0,a.kt)("p",null,"To achieve this, the healthcare platform must use authentication and authorization on each API, which allows sharing only required information."),(0,a.kt)("h2",{id:"metatypes-solution"},"Metatype's solution"),(0,a.kt)("p",null,"Metatype can act as a central entry point for all incoming requests and responses between the microservices themselves and external clients. It is responsible for routing requests to the appropriate microservices and handling responses from those microservices, while verifying the authentication and authorization for each request."),(0,a.kt)("p",null,"Additionally, Metatype gateway can provide other important features such as rate limiting, caching, and request/response transformations. It can even provide an API from another typegraph and delegate the query processing to it."),(0,a.kt)(i.Z,{typegraph:"team-a",python:n(76887),query:n(51027),mdxType:"TGExample"}))}u.isMDXComponent=!0},3199:(e,t,n)=>{"use strict";n.d(t,{r:()=>a});var r=n(50959);function a(e){let{name:t,choices:n,choice:a,onChange:i,className:o}=e;return r.createElement("ul",{className:`pl-0 m-0 list-none w-full ${o??""}`},Object.entries(n).map((e=>{let[n,o]=e;return r.createElement("li",{key:n,className:"inline-block rounded-md overflow-clip mr-1"},r.createElement("div",null,r.createElement("label",{className:"cursor-pointer"},r.createElement("input",{type:"radio",name:t,value:n,checked:n===a,onChange:()=>i(n),className:"hidden peer"}),r.createElement("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white"},o))))})))}},53553:(e,t,n)=>{"use strict";n.d(t,{Z:()=>y});var r=n(50959),a=n(67243),i=n(66108),o=n(84318),s=n(23560),l=n(30391);const c=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function d(e){const{queryEditor:t,variableEditor:n,headerEditor:a}=(0,l._i)({nonNull:!0}),[i,o]=(0,r.useState)(e.defaultTab),s=(0,l.Xd)({onCopyQuery:e.onCopyQuery}),d=(0,l.fE)();return(0,r.useEffect)((()=>{n&&c(n)}),[i,n]),(0,r.useEffect)((()=>{a&&c(a)}),[i,a]),(0,r.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",c),c(t))}),[t]),(0,r.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",c))}),[n]),(0,r.useEffect)((()=>{a&&(a.setOption("lineNumbers",!1),a.setOption("gutters",[]),a.on("change",c))}),[a]),r.createElement(l.u.Provider,null,r.createElement("div",{className:"graphiql-editors"},r.createElement("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor"},r.createElement("div",{className:"graphiql-query-editor-wrapper"},r.createElement(l.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),r.createElement("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands"},r.createElement(l._8,null),r.createElement(l.wC,{onClick:()=>d(),label:"Prettify query (Shift-Ctrl-P)"},r.createElement(l.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})),r.createElement(l.wC,{onClick:()=>s(),label:"Copy query (Shift-Ctrl-C)"},r.createElement(l.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"}))))),e.noTool?null:r.createElement(r.Fragment,null,r.createElement("div",{className:"graphiql-editor-tools p-0 text-sm "},r.createElement("div",{className:"graphiql-editor-tools-tabs"},r.createElement("div",{className:("variables"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{o("variables"===i?"":"variables")}},"Variables"),r.createElement("div",{className:("headers"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{o("headers"===i?"":"headers")}},"Headers"))),r.createElement("section",{className:"graphiql-editor-tool "+(i&&i.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===i?"Variables":"Headers"},r.createElement(l.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==i,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),r.createElement(l.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==i,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})))))}class p{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=n(3199);function u(){return(0,l.JB)({nonNull:!0}).isFetching?r.createElement(l.$j,null):null}const h={typegraph:"Typegraph",playground:"Playground"};function f(e){let{typegraph:t,query:n,code:i,codeLanguage:c,codeFileUrl:f,headers:y={},variables:v={},tab:g="",noTool:b=!1,defaultMode:E=null}=e;const{siteConfig:{customFields:{tgUrl:w}}}=(0,o.Z)(),k=(0,r.useMemo)((()=>new p),[]),O=(0,r.useMemo)((()=>(0,a.nq)({url:`${w}/${t}`})),[]),[x,N]=(0,r.useState)(E);return r.createElement("div",{className:"@container miniql mb-5"},E?r.createElement(m.r,{name:"mode",choices:h,choice:x,onChange:N,className:"mb-2"}):null,r.createElement(l.j$,{fetcher:O,defaultQuery:n.loc?.source.body.trim(),defaultHeaders:JSON.stringify(y),shouldPersistHeaders:!0,variables:JSON.stringify(v),storage:k},r.createElement("div",{className:(E?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first"},E&&"typegraph"!==x?null:r.createElement("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0"},f?r.createElement("div",{className:"p-2 text-xs font-light"},"See/edit full code on"," ",r.createElement("a",{href:`https://github.com/metatypedev/metatype/blob/main/${f}`},f)):null,i?r.createElement(s.Z,{language:c,wrap:!0,className:"flex-1"},i):null),E&&"playground"!==x?null:r.createElement("div",{className:"flex flex-col graphiql-container"},r.createElement("div",{className:"flex-1 graphiql-session"},r.createElement(d,{defaultTab:g,noTool:b})),r.createElement("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg"},r.createElement(u,null),r.createElement(l.iB,null))))))}function y(e){return r.createElement(i.Z,{fallback:r.createElement("div",null,"Loading...")},(()=>r.createElement(f,e)))}},6809:(e,t,n)=>{"use strict";n.d(t,{Z:()=>o});var r=n(52319),a=n(53553),i=n(50959);function o(e){let{python:t,...n}=e;return i.createElement(a.Z,(0,r.Z)({code:t.content,codeLanguage:"python",codeFileUrl:t.path},n))}},51027:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"version_team_b"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"version_team_a"},arguments:[],directives:[]}]}}],loc:{start:0,end:45}};t.loc.source={body:"query {\n  version_team_b\n\n  version_team_a\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var r=e.type;"NamedType"===r.kind&&t.add(r.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var r={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),r[e.name.value]=t}})),e.exports=t},9395:(e,t,n)=>{"use strict";n.d(t,{Z:()=>r});const r=n.p+"assets/images/image.drawio-bfa7a9325fe21576a24a097c2c28615c.svg"},76887:e=>{e.exports={content:'with TypeGraph(\n  "team-a",\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n) as g1:\n  public = policies.public()\n\n  deno = DenoRuntime()\n  records = GraphQLRuntime(\n    environ.get("TG_URL", "http://localhost:7890") + "/team-b"\n  )\n\n  g1.expose(\n    version_team_b=records.query(\n      t.struct({}), t.integer(), path=("version",)\n    ),\n    version_team_a=deno.static(t.integer(), 3),\n    default_policy=[public],\n  )\n\nwith TypeGraph(\n  "team-b",\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n) as g2:\n  public = policies.public()\n\n  deno = DenoRuntime()\n\n  g2.expose(\n    version=deno.static(t.integer(), 12),\n    record=deno.static(\n      t.struct({"weight": t.integer()}), {"weight": 100}\n    ),\n    default_policy=[public],\n  )',path:"website/use-cases/microservice-orchestration/t.py"}}}]);
(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[8351],{7942:(e,t,a)=>{"use strict";a.d(t,{Zo:()=>d,kt:()=>f});var n=a(959);function r(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function i(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,n)}return a}function o(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?i(Object(a),!0).forEach((function(t){r(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):i(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function l(e,t){if(null==e)return{};var a,n,r=function(e,t){if(null==e)return{};var a,n,r={},i=Object.keys(e);for(n=0;n<i.length;n++)a=i[n],t.indexOf(a)>=0||(r[a]=e[a]);return r}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(n=0;n<i.length;n++)a=i[n],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(r[a]=e[a])}return r}var s=n.createContext({}),c=function(e){var t=n.useContext(s),a=t;return e&&(a="function"==typeof e?e(t):o(o({},t),e)),a},d=function(e){var t=c(e.components);return n.createElement(s.Provider,{value:t},e.children)},p="mdxType",m={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},u=n.forwardRef((function(e,t){var a=e.components,r=e.mdxType,i=e.originalType,s=e.parentName,d=l(e,["components","mdxType","originalType","parentName"]),p=c(a),u=r,f=p["".concat(s,".").concat(u)]||p[u]||m[u]||i;return a?n.createElement(f,o(o({ref:t},d),{},{components:a})):n.createElement(f,o({ref:t},d))}));function f(e,t){var a=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var i=a.length,o=new Array(i);o[0]=u;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l[p]="string"==typeof e?e:r,o[1]=l;for(var c=2;c<i;c++)o[c]=a[c];return n.createElement.apply(null,o)}return n.createElement.apply(null,a)}u.displayName="MDXCreateElement"},999:(e,t,a)=>{"use strict";a.r(t),a.d(t,{assets:()=>c,contentTitle:()=>l,default:()=>u,frontMatter:()=>o,metadata:()=>s,toc:()=>d});var n=a(2564),r=(a(959),a(7942)),i=a(7035);const o={},l="Programmable API gateway",s={unversionedId:"programmable-api-gateway/index",id:"programmable-api-gateway/index",title:"Programmable API gateway",description:"A programmable API gateway is an API gateway that provides a customizable framework for developers to create and deploy custom logic and policies for incoming requests and outgoing responses. Unlike traditional API gateways that provide a fixed set of features and policies, programmable API gateways offer a more flexible and extensible approach to managing APIs.",source:"@site/use-cases/programmable-api-gateway/index.mdx",sourceDirName:"programmable-api-gateway",slug:"/programmable-api-gateway/",permalink:"/use-cases/programmable-api-gateway/",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/programmable-api-gateway/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",previous:{title:"ORM for the edge",permalink:"/use-cases/orm-for-the-edge/"}},c={},d=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}],p={toc:d},m="wrapper";function u(e){let{components:t,...o}=e;return(0,r.kt)(m,(0,n.Z)({},p,o,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("h1",{id:"programmable-api-gateway"},"Programmable API gateway"),(0,r.kt)("p",null,"A programmable API gateway is an API gateway that provides a customizable framework for developers to create and deploy custom logic and policies for incoming requests and outgoing responses. Unlike traditional API gateways that provide a fixed set of features and policies, programmable API gateways offer a more flexible and extensible approach to managing APIs."),(0,r.kt)("h2",{id:"case-study"},"Case study"),(0,r.kt)("div",{className:"text-center md:float-right p-8"},(0,r.kt)("p",null,(0,r.kt)("img",{src:a(2453).Z,width:"321",height:"301"}))),(0,r.kt)("p",null,"Suppose that your company needs to implement various policies and logic to manage and secure its APIs, such as rate limiting, caching, and request/response transformations."),(0,r.kt)("p",null,"To achieve this, the company can adopt a programmable API gateway that allows developers to create and deploy custom function to implement additional logic and policies for incoming requests and outgoing responses."),(0,r.kt)("p",null,"It also provides a platform for the company to manage its API infrastructure more efficiently and flexibly. Developers can leverage existing libraries and frameworks to quickly build and deploy custom logic, reducing the time and effort required to develop and maintain the API gateway."),(0,r.kt)("h2",{id:"metatypes-solution"},"Metatype's solution"),(0,r.kt)("p",null,"Metatype provide a Python SDK for developers to create and deploy custom logic and policies, which can later be deployed to the gateway in a single command line. Importers can also be used to import existing API or logic definitions from other sources, such as OpenAPI, GraphQL, and gRPC."),(0,r.kt)("p",null,"This enables developer to quickly build and deploy any update the API or the business logic without having to worry about the underlying infrastructure."),(0,r.kt)(i.Z,{typegraph:"programmable-api-gateway",python:a(57),query:a(8055),mdxType:"TGExample"}))}u.isMDXComponent=!0},4133:(e,t,a)=>{"use strict";a.d(t,{r:()=>r});var n=a(959);function r(e){let{name:t,choices:a,choice:r,onChange:i}=e;return n.createElement("ul",{className:"pl-0 m-0 list-none rounded-md overflow-clip"},Object.entries(a).map((e=>{let[a,o]=e;return n.createElement("li",{key:a,className:"inline-block"},n.createElement("div",null,n.createElement("label",{className:"cursor-pointer"},n.createElement("input",{type:"radio",name:t,value:a,checked:a===r,onChange:()=>i(a),className:"hidden peer"}),n.createElement("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white"},o))))})))}},2481:(e,t,a)=>{"use strict";a.d(t,{Z:()=>y});var n=a(959),r=a(4087),i=a(7731),o=a(1996),l=a(3117),s=a(884);const c=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function d(e){const{queryEditor:t,variableEditor:a,headerEditor:r}=(0,s._i)({nonNull:!0}),[i,o]=(0,n.useState)(e.defaultTab),l=(0,s.Xd)({onCopyQuery:e.onCopyQuery}),d=(0,s.fE)();return(0,n.useEffect)((()=>{a&&c(a)}),[i,a]),(0,n.useEffect)((()=>{r&&c(r)}),[i,r]),(0,n.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",c),c(t))}),[t]),(0,n.useEffect)((()=>{a&&(a.setOption("lineNumbers",!1),a.setOption("gutters",[]),a.on("change",c))}),[a]),(0,n.useEffect)((()=>{r&&(r.setOption("lineNumbers",!1),r.setOption("gutters",[]),r.on("change",c))}),[r]),n.createElement("div",{className:"graphiql-editors"},n.createElement("section",{className:"graphiql-query-editor","aria-label":"Query Editor"},n.createElement("div",{className:"graphiql-query-editor-wrapper"},n.createElement(s.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly})),n.createElement("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands"},n.createElement(s._8,null),n.createElement(s.wC,{onClick:()=>d(),label:"Prettify query (Shift-Ctrl-P)"},n.createElement(s.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})),n.createElement(s.wC,{onClick:()=>l(),label:"Copy query (Shift-Ctrl-C)"},n.createElement(s.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})))),e.noTool?null:n.createElement(n.Fragment,null,n.createElement("div",{className:"graphiql-editor-tools p-0 text-sm "},n.createElement("div",{className:"graphiql-editor-tools-tabs"},n.createElement("div",{className:("variables"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{o("variables"===i?"":"variables")}},"Variables"),n.createElement("div",{className:("headers"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{o("headers"===i?"":"headers")}},"Headers"))),n.createElement("section",{className:"graphiql-editor-tool "+(i&&i.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===i?"Variables":"Headers"},n.createElement(s.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==i,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),n.createElement(s.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==i,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly}))))}class p{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=a(4133);function u(){return(0,s.JB)({nonNull:!0}).isFetching?n.createElement(s.$j,null):null}const f={typegraph:"Typegraph",playground:"Playground"};function g(e){let{typegraph:t,query:a,code:i,codeLanguage:c,codeFileUrl:g,headers:y={},variables:h={},tab:b="",noTool:v=!1,defaultMode:E=null}=e;const{siteConfig:{customFields:{tgUrl:w}}}=(0,o.Z)(),k=(0,n.useMemo)((()=>new p),[]),x=(0,n.useMemo)((()=>(0,r.nq)({url:`${w}/${t}`})),[]),[O,P]=(0,n.useState)(E);return n.createElement("div",{className:"@container miniql"},E?n.createElement("div",{className:"mb-2"},n.createElement(m.r,{name:"mode",choices:f,choice:O,onChange:P})):null,n.createElement(s.j$,{fetcher:x,defaultQuery:a.loc?.source.body.trim(),defaultHeaders:JSON.stringify(y),shouldPersistHeaders:!0,variables:JSON.stringify(h),storage:k},n.createElement("div",{className:`grid ${E?"":"@2xl:grid-cols-2"} gap-2 w-full order-first`},E&&"typegraph"!==O?null:n.createElement("div",{className:" bg-slate-100 rounded-lg relative"},g?n.createElement("div",{className:"absolute p-2 text-xs font-light"},"See/edit full code on"," ",n.createElement("a",{href:`https://github.com/metatypedev/metatype/blob/main/${g}`},g)):null,i?n.createElement(l.Z,{language:c,wrap:!0,className:"pt-7 h-full"},i):null),E&&"playground"!==O?null:n.createElement("div",{className:"flex flex-col graphiql-container"},n.createElement("div",{className:"flex-1 graphiql-session"},n.createElement(d,{defaultTab:b,noTool:v})),n.createElement("div",{className:"flex-1 graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg"},n.createElement(u,null),n.createElement(s.iB,null))))))}function y(e){return n.createElement(i.Z,{fallback:n.createElement("div",null,"Loading...")},(()=>n.createElement(g,e)))}},7035:(e,t,a)=>{"use strict";a.d(t,{Z:()=>o});var n=a(2564),r=a(2481),i=a(959);function o(e){let{python:t,...a}=e;return i.createElement(r.Z,(0,n.Z)({code:t.content,codeLanguage:"python",codeFileUrl:t.path},a))}},8055:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"A"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"static_a"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"foo"},arguments:[],directives:[]}]}}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"B"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"static_b"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"foo"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:75}};t.loc.source={body:"query A {\n  static_a {\n    foo\n  }\n}\n\nquery B {\n  static_b {\n    foo\n  }\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function a(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var n=e.type;"NamedType"===n.kind&&t.add(n.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){a(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){a(e,t)})),e.definitions&&e.definitions.forEach((function(e){a(e,t)}))}var n={};function r(e,t){for(var a=0;a<e.definitions.length;a++){var n=e.definitions[a];if(n.name&&n.name.value==t)return n}}function i(e,t){var a={kind:e.kind,definitions:[r(e,t)]};e.hasOwnProperty("loc")&&(a.loc=e.loc);var i=n[t]||new Set,o=new Set,l=new Set;for(i.forEach((function(e){l.add(e)}));l.size>0;){var s=l;l=new Set,s.forEach((function(e){o.has(e)||(o.add(e),(n[e]||new Set).forEach((function(e){l.add(e)})))}))}return o.forEach((function(t){var n=r(e,t);n&&a.definitions.push(n)})),a}t.definitions.forEach((function(e){if(e.name){var t=new Set;a(e,t),n[e.name.value]=t}})),e.exports=t,e.exports.A=i(t,"A"),e.exports.B=i(t,"B")},2453:(e,t,a)=>{"use strict";a.d(t,{Z:()=>n});const n=a.p+"assets/images/image.drawio-c3feec9409b941440f13260d6a23c2d4.svg"},57:e=>{e.exports={content:'with TypeGraph(\n  "programmable-api-gateway",\n) as g:\n  deno = DenoRuntime()\n\n  public = policies.public()\n  roulette_access = policies.Policy(PureFunMat("() => Math.random() < 0.5"))\n\n  my_api_format = """\n  static_a:\n    access: roulette_access\n    foo: rab\n  static_b:\n    access: public\n    foo: bar\n  """\n\n  exposition = {}\n  for field, static_vals in yaml.safe_load(my_api_format).items():\n    g.expose(\n      **{field: deno.static(t.struct({"foo": t.string()}), static_vals)},\n      default_policy=public\n      if static_vals.pop("access") == "public"\n      else roulette_access\n    )',path:"website/use-cases/programmable-api-gateway/typegraph.py"}}}]);
(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[8927],{17942:(e,t,n)=>{"use strict";n.d(t,{Zo:()=>d,kt:()=>f});var i=n(50959);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function r(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);t&&(i=i.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,i)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?r(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):r(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,i,a=function(e,t){if(null==e)return{};var n,i,a={},r=Object.keys(e);for(i=0;i<r.length;i++)n=r[i],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);for(i=0;i<r.length;i++)n=r[i],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var s=i.createContext({}),c=function(e){var t=i.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},d=function(e){var t=c(e.components);return i.createElement(s.Provider,{value:t},e.children)},u="mdxType",p={inlineCode:"code",wrapper:function(e){var t=e.children;return i.createElement(i.Fragment,{},t)}},m=i.forwardRef((function(e,t){var n=e.components,a=e.mdxType,r=e.originalType,s=e.parentName,d=l(e,["components","mdxType","originalType","parentName"]),u=c(n),m=a,f=u["".concat(s,".").concat(m)]||u[m]||p[m]||r;return n?i.createElement(f,o(o({ref:t},d),{},{components:n})):i.createElement(f,o({ref:t},d))}));function f(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var r=n.length,o=new Array(r);o[0]=m;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l[u]="string"==typeof e?e:a,o[1]=l;for(var c=2;c<r;c++)o[c]=n[c];return i.createElement.apply(null,o)}return i.createElement.apply(null,n)}m.displayName="MDXCreateElement"},3199:(e,t,n)=>{"use strict";n.d(t,{r:()=>a});var i=n(50959);function a(e){let{name:t,choices:n,choice:a,onChange:r,className:o}=e;return i.createElement("ul",{className:`pl-0 m-0 list-none w-full ${o??""}`},Object.entries(n).map((e=>{let[n,o]=e;return i.createElement("li",{key:n,className:"inline-block rounded-md overflow-clip mr-1"},i.createElement("div",null,i.createElement("label",{className:"cursor-pointer"},i.createElement("input",{type:"radio",name:t,value:n,checked:n===a,onChange:()=>r(n),className:"hidden peer"}),i.createElement("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white"},o))))})))}},53553:(e,t,n)=>{"use strict";n.d(t,{Z:()=>y});var i=n(50959),a=n(55362),r=n(79923),o=n(26469),l=n(11716),s=n(1100);const c=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function d(e){const{queryEditor:t,variableEditor:n,headerEditor:a}=(0,s._i)({nonNull:!0}),[r,o]=(0,i.useState)(e.defaultTab),l=(0,s.Xd)({onCopyQuery:e.onCopyQuery}),d=(0,s.fE)();return(0,i.useEffect)((()=>{n&&c(n)}),[r,n]),(0,i.useEffect)((()=>{a&&c(a)}),[r,a]),(0,i.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",c),c(t))}),[t]),(0,i.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",c))}),[n]),(0,i.useEffect)((()=>{a&&(a.setOption("lineNumbers",!1),a.setOption("gutters",[]),a.on("change",c))}),[a]),i.createElement(s.u.Provider,null,i.createElement("div",{className:"graphiql-editors"},i.createElement("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor"},i.createElement("div",{className:"graphiql-query-editor-wrapper"},i.createElement(s.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),i.createElement("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands"},i.createElement(s._8,null),i.createElement(s.wC,{onClick:()=>d(),label:"Prettify query (Shift-Ctrl-P)"},i.createElement(s.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})),i.createElement(s.wC,{onClick:()=>l(),label:"Copy query (Shift-Ctrl-C)"},i.createElement(s.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"}))))),e.noTool?null:i.createElement(i.Fragment,null,i.createElement("div",{className:"graphiql-editor-tools p-0 text-sm "},i.createElement("div",{className:"graphiql-editor-tools-tabs"},i.createElement("div",{className:("variables"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{o("variables"===r?"":"variables")}},"Variables"),i.createElement("div",{className:("headers"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{o("headers"===r?"":"headers")}},"Headers"))),i.createElement("section",{className:"graphiql-editor-tool "+(r&&r.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===r?"Variables":"Headers"},i.createElement(s.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==r,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),i.createElement(s.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==r,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})))))}class u{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var p=n(3199);function m(){return(0,s.JB)({nonNull:!0}).isFetching?i.createElement(s.$j,null):null}const f={typegraph:"Typegraph",playground:"Playground"};function h(e){let{typegraph:t,query:n,code:r,codeLanguage:c,codeFileUrl:h,headers:y={},variables:v={},tab:b="",noTool:g=!1,defaultMode:k=null}=e;const{siteConfig:{customFields:{tgUrl:E}}}=(0,o.Z)(),w=(0,i.useMemo)((()=>new u),[]),N=(0,i.useMemo)((()=>(0,a.nq)({url:`${E}/${t}`})),[]),[x,O]=(0,i.useState)(k);return i.createElement("div",{className:"@container miniql mb-5"},k?i.createElement(p.r,{name:"mode",choices:f,choice:x,onChange:O,className:"mb-2"}):null,i.createElement(s.j$,{fetcher:N,defaultQuery:n.loc?.source.body.trim(),defaultHeaders:JSON.stringify(y),shouldPersistHeaders:!0,variables:JSON.stringify(v),storage:w},i.createElement("div",{className:(k?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first"},k&&"typegraph"!==x?null:i.createElement("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0"},h?i.createElement("div",{className:"p-2 text-xs font-light"},"See/edit full code on"," ",i.createElement("a",{href:`https://github.com/metatypedev/metatype/blob/main/${h}`},h)):null,r?i.createElement(l.Z,{language:c,wrap:!0,className:"flex-1"},r):null),k&&"playground"!==x?null:i.createElement("div",{className:"flex flex-col graphiql-container"},i.createElement("div",{className:"flex-1 graphiql-session"},i.createElement(d,{defaultTab:b,noTool:g})),i.createElement("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg"},i.createElement(m,null),i.createElement(s.iB,null))))))}function y(e){return i.createElement(r.Z,{fallback:i.createElement("div",null,"Loading...")},(()=>i.createElement(h,e)))}},6809:(e,t,n)=>{"use strict";n.d(t,{Z:()=>o});var i=n(52319),a=n(53553),r=n(50959);function o(e){let{python:t,...n}=e;return r.createElement(a.Z,(0,i.Z)({code:t.content,codeLanguage:"python",codeFileUrl:t.path},n))}},13198:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>c,contentTitle:()=>l,default:()=>m,frontMatter:()=>o,metadata:()=>s,toc:()=>d});var i=n(52319),a=(n(50959),n(17942)),r=(n(11716),n(6809));const o={sidebar_position:6},l="Policies and materializers",s={unversionedId:"tutorials/policies-and-materializers/index",id:"tutorials/policies-and-materializers/index",title:"Policies and materializers",description:"This section also makes use of toy typegraph for the sake of clarity. You will continue the chat-based app on the next one.",source:"@site/docs/tutorials/policies-and-materializers/index.mdx",sourceDirName:"tutorials/policies-and-materializers",slug:"/tutorials/policies-and-materializers/",permalink:"/docs/tutorials/policies-and-materializers/",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/tutorials/policies-and-materializers/index.mdx",tags:[],version:"current",sidebarPosition:6,frontMatter:{sidebar_position:6},sidebar:"docs",previous:{title:"Authentication and security",permalink:"/docs/tutorials/authentication-and-security/"},next:{title:"Your chat app",permalink:"/docs/tutorials/your-chat-app/"}},c={},d=[{value:"Deno runtime",id:"deno-runtime",level:2},{value:"Policy based access control (PBAC)",id:"policy-based-access-control-pbac",level:2}],u={toc:d},p="wrapper";function m(e){let{components:t,...o}=e;return(0,a.kt)(p,(0,i.Z)({},u,o,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("h1",{id:"policies-and-materializers"},"Policies and materializers"),(0,a.kt)("p",null,"This section also makes use of toy typegraph for the sake of clarity. You will continue the chat-based app on the next one."),(0,a.kt)("h2",{id:"deno-runtime"},"Deno runtime"),(0,a.kt)("p",null,"While the tutorial covered already interesting runtimes, allowing you to connect to already a lot of systems and different protocols, there is still one powerful that wasn't covered yet: the typescript or Deno runtime."),(0,a.kt)("p",null,"This enables to run lightweight and short-lived typescript function in a sandboxed environment. Permissions can be customized per typegraph and by default only include some HTTPs domains. It's a great way to implement custom logic and materializers. All typegraphs can lazily spawn a web worker and get an incredible cold-start and continuous performance thanks to the V8 engine powering Deno."),(0,a.kt)(r.Z,{typegraph:"deno",python:n(37140),query:n(36785),mdxType:"TGExample"}),(0,a.kt)("h2",{id:"policy-based-access-control-pbac"},"Policy based access control (PBAC)"),(0,a.kt)("p",null,"The Deno runtime enable to understand the last abstraction. Policies are a way to verify for each type whether the user is authorized or not to access it. It's a very powerful concept that can be for instance used to guarantee a given type is never accidentally exposed to the outside world."),(0,a.kt)("p",null,"Metatype comes with some built-in policies, but you can use the Deno runtime to define your own:"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"policies.public()")," is an alias for ",(0,a.kt)("inlineCode",{parentName:"li"},'Policy(PureFunMat("() => true"))')," providing everyone open access."),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},'policies.ctx("role_value", "role_field")')," is a companion policy for the authentication strategy you learned in the previous section. It will verify the context and give adequate access to the user.")),(0,a.kt)("p",null,"Policies are hierarchical in the sense that the request starts with a denial, and the root materializers must explicitly provide an access or not. Once access granted, any further types can either inherit or override the access. Policies evaluate in order in case multiple ones are defined."),(0,a.kt)(r.Z,{typegraph:"policies",python:n(32162),query:n(5040),mdxType:"TGExample"}),(0,a.kt)("p",null,"Enough studied, let's go back to your app and finalize it."))}m.isMDXComponent=!0},36785:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"compute_fib"},arguments:[{kind:"Argument",name:{kind:"Name",value:"n"},value:{kind:"IntValue",value:"3"}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"res"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"ms"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:51}};t.loc.source={body:"query {\n  compute_fib(n: 3) {\n    res\n    ms\n  }\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&t.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var i={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),i[e.name.value]=t}})),e.exports=t},5040:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"A"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"public"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"B"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"admin_only"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"C"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"user_only"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"D"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"both"},arguments:[],directives:[]}]}}],loc:{start:0,end:92}};t.loc.source={body:"query A {\n  public\n}\n\nquery B {\n  admin_only\n}\n\nquery C {\n  user_only\n}\n\nquery D {\n  both\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&t.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var i={};function a(e,t){for(var n=0;n<e.definitions.length;n++){var i=e.definitions[n];if(i.name&&i.name.value==t)return i}}function r(e,t){var n={kind:e.kind,definitions:[a(e,t)]};e.hasOwnProperty("loc")&&(n.loc=e.loc);var r=i[t]||new Set,o=new Set,l=new Set;for(r.forEach((function(e){l.add(e)}));l.size>0;){var s=l;l=new Set,s.forEach((function(e){o.has(e)||(o.add(e),(i[e]||new Set).forEach((function(e){l.add(e)})))}))}return o.forEach((function(t){var i=a(e,t);i&&n.definitions.push(i)})),n}t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),i[e.name.value]=t}})),e.exports=t,e.exports.A=r(t,"A"),e.exports.B=r(t,"B"),e.exports.C=r(t,"C"),e.exports.D=r(t,"D")},37140:e=>{e.exports={content:"",path:"website/docs/tutorials/policies-and-materializers/deno.py"}},32162:e=>{e.exports={content:"",path:"website/docs/tutorials/policies-and-materializers/policies.py"}}}]);
(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[1565],{17942:(e,t,n)=>{"use strict";n.d(t,{Zo:()=>u,kt:()=>h});var i=n(50959);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function r(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);t&&(i=i.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,i)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?r(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):r(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,i,a=function(e,t){if(null==e)return{};var n,i,a={},r=Object.keys(e);for(i=0;i<r.length;i++)n=r[i],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);for(i=0;i<r.length;i++)n=r[i],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var s=i.createContext({}),c=function(e){var t=i.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},u=function(e){var t=c(e.components);return i.createElement(s.Provider,{value:t},e.children)},d="mdxType",m={inlineCode:"code",wrapper:function(e){var t=e.children;return i.createElement(i.Fragment,{},t)}},p=i.forwardRef((function(e,t){var n=e.components,a=e.mdxType,r=e.originalType,s=e.parentName,u=l(e,["components","mdxType","originalType","parentName"]),d=c(n),p=a,h=d["".concat(s,".").concat(p)]||d[p]||m[p]||r;return n?i.createElement(h,o(o({ref:t},u),{},{components:n})):i.createElement(h,o({ref:t},u))}));function h(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var r=n.length,o=new Array(r);o[0]=p;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l[d]="string"==typeof e?e:a,o[1]=l;for(var c=2;c<r;c++)o[c]=n[c];return i.createElement.apply(null,o)}return i.createElement.apply(null,n)}p.displayName="MDXCreateElement"},96892:(e,t,n)=>{"use strict";n.d(t,{r:()=>a});var i=n(50959);function a(e){let{name:t,choices:n,choice:a,onChange:r,className:o}=e;return i.createElement("ul",{className:`pl-0 m-0 list-none w-full ${o??""}`},Object.entries(n).map((e=>{let[n,o]=e;return i.createElement("li",{key:n,className:"inline-block rounded-md overflow-clip mr-1"},i.createElement("div",null,i.createElement("label",{className:"cursor-pointer"},i.createElement("input",{type:"radio",name:t,value:n,checked:n===a,onChange:()=>r(n),className:"hidden peer"}),i.createElement("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white"},o))))})))}},38193:(e,t,n)=>{"use strict";n.d(t,{Z:()=>y});var i=n(50959),a=n(24386),r=n(95181),o=n(75213),l=n(6388),s=n(59452);const c=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function u(e){const{queryEditor:t,variableEditor:n,headerEditor:a}=(0,s._i)({nonNull:!0}),[r,o]=(0,i.useState)(e.defaultTab),l=(0,s.Xd)({onCopyQuery:e.onCopyQuery}),u=(0,s.fE)();return(0,i.useEffect)((()=>{n&&c(n)}),[r,n]),(0,i.useEffect)((()=>{a&&c(a)}),[r,a]),(0,i.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",c),c(t))}),[t]),(0,i.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",c))}),[n]),(0,i.useEffect)((()=>{a&&(a.setOption("lineNumbers",!1),a.setOption("gutters",[]),a.on("change",c))}),[a]),i.createElement("div",{className:"graphiql-editors"},i.createElement("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor"},i.createElement("div",{className:"graphiql-query-editor-wrapper"},i.createElement(s.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly})),i.createElement("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands"},i.createElement(s._8,null),i.createElement(s.wC,{onClick:()=>u(),label:"Prettify query (Shift-Ctrl-P)"},i.createElement(s.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})),i.createElement(s.wC,{onClick:()=>l(),label:"Copy query (Shift-Ctrl-C)"},i.createElement(s.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})))),e.noTool?null:i.createElement(i.Fragment,null,i.createElement("div",{className:"graphiql-editor-tools p-0 text-sm "},i.createElement("div",{className:"graphiql-editor-tools-tabs"},i.createElement("div",{className:("variables"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{o("variables"===r?"":"variables")}},"Variables"),i.createElement("div",{className:("headers"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{o("headers"===r?"":"headers")}},"Headers"))),i.createElement("section",{className:"graphiql-editor-tool "+(r&&r.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===r?"Variables":"Headers"},i.createElement(s.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==r,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),i.createElement(s.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==r,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly}))))}class d{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=n(96892);function p(){return(0,s.JB)({nonNull:!0}).isFetching?i.createElement(s.$j,null):null}const h={typegraph:"Typegraph",playground:"Playground"};function f(e){let{typegraph:t,query:n,code:r,codeLanguage:c,codeFileUrl:f,headers:y={},variables:g={},tab:v="",noTool:b=!1,defaultMode:k=null}=e;const{siteConfig:{customFields:{tgUrl:w}}}=(0,o.Z)(),x=(0,i.useMemo)((()=>new d),[]),E=(0,i.useMemo)((()=>(0,a.nq)({url:`${w}/${t}`})),[]),[N,_]=(0,i.useState)(k);return i.createElement("div",{className:"@container miniql mb-5"},k?i.createElement(m.r,{name:"mode",choices:h,choice:N,onChange:_,className:"mb-2"}):null,i.createElement(s.j$,{fetcher:E,defaultQuery:n.loc?.source.body.trim(),defaultHeaders:JSON.stringify(y),shouldPersistHeaders:!0,variables:JSON.stringify(g),storage:x},i.createElement("div",{className:(k?"":"grid @2xl:grid-cols-2")+" gap-2 w-full order-first"},k&&"typegraph"!==N?null:i.createElement("div",{className:" bg-slate-100 rounded-lg flex flex-col"},f?i.createElement("div",{className:"p-2 text-xs font-light"},"See/edit full code on"," ",i.createElement("a",{href:`https://github.com/metatypedev/metatype/blob/main/${f}`},f)):null,r?i.createElement(l.Z,{language:c,wrap:!0,className:"flex-1"},r):null),k&&"playground"!==N?null:i.createElement("div",{className:"flex flex-col graphiql-container"},i.createElement("div",{className:"flex-1 graphiql-session"},i.createElement(u,{defaultTab:v,noTool:b})),i.createElement("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg"},i.createElement(p,null),i.createElement(s.iB,null))))))}function y(e){return i.createElement(r.Z,{fallback:i.createElement("div",null,"Loading...")},(()=>i.createElement(f,e)))}},97723:(e,t,n)=>{"use strict";n.d(t,{Z:()=>o});var i=n(60795),a=n(38193),r=n(50959);function o(e){let{python:t,...n}=e;return r.createElement(a.Z,(0,i.Z)({code:t.content,codeLanguage:"python",codeFileUrl:t.path},n))}},25857:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>c,contentTitle:()=>l,default:()=>p,frontMatter:()=>o,metadata:()=>s,toc:()=>u});var i=n(60795),a=(n(50959),n(17942)),r=n(97723);const o={sidebar_position:5},l="Authentication and security",s={unversionedId:"tutorials/authentication-and-security/index",id:"tutorials/authentication-and-security/index",title:"Authentication and security",description:"Let's pause the chat-based app typegraph for a moment and talk about some important authentication and security features. In order to understand deeply the concepts, you will make use of toy typegraph and the tutorial invite you to integrate similar mechanism for the chat-based app.",source:"@site/docs/tutorials/authentication-and-security/index.mdx",sourceDirName:"tutorials/authentication-and-security",slug:"/tutorials/authentication-and-security/",permalink:"/docs/tutorials/authentication-and-security/",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/tutorials/authentication-and-security/index.mdx",tags:[],version:"current",sidebarPosition:5,frontMatter:{sidebar_position:5},sidebar:"docs",previous:{title:"Import your existing APIs",permalink:"/docs/tutorials/import-your-existing-apis/"},next:{title:"Policies and materializers",permalink:"/docs/tutorials/policies-and-materializers/"}},c={},u=[{value:"CORS",id:"cors",level:2},{value:"Authentication",id:"authentication",level:2},{value:"Rate limiting",id:"rate-limiting",level:2}],d={toc:u},m="wrapper";function p(e){let{components:t,...o}=e;return(0,a.kt)(m,(0,i.Z)({},d,o,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("h1",{id:"authentication-and-security"},"Authentication and security"),(0,a.kt)("p",null,"Let's pause the chat-based app typegraph for a moment and talk about some important authentication and security features. In order to understand deeply the concepts, you will make use of toy typegraph and the tutorial invite you to integrate similar mechanism for the chat-based app."),(0,a.kt)("p",null,"GraphQL comes with many neat features like the ability to select the wanted you want to query, but this also creates new challenges. As users can select as much data as they want, it's important to protect your systems from malicious queries."),(0,a.kt)("h2",{id:"cors"},"CORS"),(0,a.kt)("p",null,"Cross-Origin Resource Sharing (CORS) on the one hand is a mechanism that allows or denies cross-origin requests in the browser. It avoids that other websites use your API without explicitly allowing it. Note that it doesn't protect other servers or a mobile app from using your typegraphs, only browsers implements the CORS mechanism. See this ",(0,a.kt)("a",{parentName:"p",href:"https://developer.mozilla.org/en/docs/Web/HTTP/CORS"},"documentation")," for the details."),(0,a.kt)(r.Z,{typegraph:"cors",python:n(55946),query:n(42127),mdxType:"TGExample"}),(0,a.kt)("p",null,"If your browser support well CORS, you should see an error and even more if you try to run the interactive demo. By the way, there is a hidden core header in all interactive demos you have met so far:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-python"},'TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"])\n')),(0,a.kt)("h2",{id:"authentication"},"Authentication"),(0,a.kt)("p",null,"Metatype supports multiple ",(0,a.kt)("a",{parentName:"p",href:"/docs/guides/authentication"},"authentication schemes"),": Basic authentication, JSON Web Tokens (JWT) and OAuth2. This enables every request to have a context and store some information about the user. You can then use the context to set specific fields with ",(0,a.kt)("inlineCode",{parentName:"p"},"from_context")," or as you will see next step, to restrict accesses via the policies."),(0,a.kt)("p",null,"For your app, you will use basic authentication in order to restrict some actions for admin users. In order to do so, adding the following secret to your ",(0,a.kt)("inlineCode",{parentName:"p"},"metatype.yml")," file: ",(0,a.kt)("inlineCode",{parentName:"p"},"TG_AUTHENTICATION_BASIC_ADMIN=password"),"."),(0,a.kt)(r.Z,{typegraph:"authentication",python:n(3921),query:n(73623),headers:{Authorization:"Basic YWRtaW46cGFzc3dvcmQ="},tab:"headers",mdxType:"TGExample"}),(0,a.kt)("h2",{id:"rate-limiting"},"Rate limiting"),(0,a.kt)("p",null,"The rate limiting algorithm works as follows:"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},"each function type can either count the # of calls it gets or the # of results returned ",(0,a.kt)("inlineCode",{parentName:"li"},"rate_calls=False")),(0,a.kt)("li",{parentName:"ul"},"each function type can have a weight ",(0,a.kt)("inlineCode",{parentName:"li"},"rate_weight=1")),(0,a.kt)("li",{parentName:"ul"},"each request is identified by its IP or by one value of its context if set ",(0,a.kt)("inlineCode",{parentName:"li"},"context_identifier")),(0,a.kt)("li",{parentName:"ul"},"a single query can score a maximum of ",(0,a.kt)("inlineCode",{parentName:"li"},"query_limit")),(0,a.kt)("li",{parentName:"ul"},"multiple queries can sum up to ",(0,a.kt)("inlineCode",{parentName:"li"},"window_limit")," in a ",(0,a.kt)("inlineCode",{parentName:"li"},"window_sec")," window"),(0,a.kt)("li",{parentName:"ul"},"when there is multiple typegates (",(0,a.kt)("inlineCode",{parentName:"li"},"N"),"), you can improve performance by avoiding score synchronizing while the typegate has not reached ",(0,a.kt)("inlineCode",{parentName:"li"},"local_excess"),": the real maximum score is thus ",(0,a.kt)("inlineCode",{parentName:"li"},"window_limit + min(local_excess, query_limit) * N"))),(0,a.kt)(r.Z,{typegraph:"rate",python:n(70262),query:n(87672),mdxType:"TGExample"}),(0,a.kt)("p",null,"Playing with the above should allow you to quickly hit the limits."))}p.isMDXComponent=!0},73623:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"get_context"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"username"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:43}};t.loc.source={body:"query {\n  get_context {\n    username\n  }\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&t.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var i={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),i[e.name.value]=t}})),e.exports=t},42127:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"catch_me_if_you_can"},arguments:[],directives:[]}]}}],loc:{start:0,end:75}};t.loc.source={body:"query {\n  catch_me_if_you_can\n  # the results panel should show an error\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&t.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var i={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),i[e.name.value]=t}})),e.exports=t},87672:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"A"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"lightweight_call"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"B"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"medium_call"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"C"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"heavy_call"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"D"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"by_result_count"},arguments:[],directives:[]}]}}],loc:{start:0,end:115}};t.loc.source={body:"query A {\n  lightweight_call\n}\n\nquery B {\n  medium_call\n}\n\nquery C {\n  heavy_call\n}\n\nquery D {\n  by_result_count\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&t.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var i={};function a(e,t){for(var n=0;n<e.definitions.length;n++){var i=e.definitions[n];if(i.name&&i.name.value==t)return i}}function r(e,t){var n={kind:e.kind,definitions:[a(e,t)]};e.hasOwnProperty("loc")&&(n.loc=e.loc);var r=i[t]||new Set,o=new Set,l=new Set;for(r.forEach((function(e){l.add(e)}));l.size>0;){var s=l;l=new Set,s.forEach((function(e){o.has(e)||(o.add(e),(i[e]||new Set).forEach((function(e){l.add(e)})))}))}return o.forEach((function(t){var i=a(e,t);i&&n.definitions.push(i)})),n}t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),i[e.name.value]=t}})),e.exports=t,e.exports.A=r(t,"A"),e.exports.B=r(t,"B"),e.exports.C=r(t,"C"),e.exports.D=r(t,"D")},3921:e=>{e.exports={content:'with TypeGraph(\n  "authentication",\n  auths=[\n    # highlight-start\n    # expects a secret in metatype.yml\n    # `TG_[typegraph]_BASIC_[username]`\n    # highlight-next-line\n    TypeGraph.Auth.basic(["admin"]),\n    # highlight-end\n  ],\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n) as g:\n  deno = DenoRuntime()\n  public = policies.public()\n\n  ctx = t.struct(\n    {"username": t.string().optional().from_context("username")}\n  )\n\n  g.expose(\n    get_context=deno.identity(ctx),\n    default_policy=[public],\n  )',path:"website/docs/tutorials/authentication-and-security/authentication.py"}},55946:e=>{e.exports={content:'with TypeGraph(\n  "cors",\n  # highlight-next-line\n  cors=TypeGraph.Cors(\n    # highlight-next-line\n    allow_origin=["https://not-this.domain"],\n    # highlight-next-line\n    allow_headers=["x-custom-header"],\n    # highlight-next-line\n    expose_headers=["header-1"],\n    # highlight-next-line\n    allow_credentials=True,\n    # highlight-next-line\n    max_age_sec=60,\n    # highlight-next-line\n  ),\n) as g:\n  random = RandomRuntime(seed=0)\n  public = policies.public()\n\n  g.expose(\n    catch_me_if_you_can=random.generate(t.string()),\n    default_policy=[public],\n  )',path:"website/docs/tutorials/authentication-and-security/cors.py"}},70262:e=>{e.exports={content:'with TypeGraph(\n  "rate",\n  # highlight-next-line\n  rate=TypeGraph.Rate(\n    # highlight-next-line\n    window_limit=35,\n    # highlight-next-line\n    window_sec=15,\n    # highlight-next-line\n    query_limit=25,\n    # highlight-next-line\n    context_identifier=None,\n    # highlight-next-line\n    local_excess=0,\n    # highlight-next-line\n  ),\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n) as g:\n  random = RandomRuntime(seed=0)\n  public = policies.public()\n\n  g.expose(\n    lightweight_call=random.generate(\n      t.string(), rate_weight=1, rate_calls=True\n    ),\n    medium_call=random.generate(\n      t.string(), rate_weight=5, rate_calls=True\n    ),\n    heavy_call=random.generate(\n      t.string(), rate_weight=15, rate_calls=True\n    ),\n    by_result_count=random.generate(\n      t.array(t.string()),\n      rate_weight=2,\n      rate_calls=False,  # increment by # of results returned\n    ),\n    default_policy=[public],\n  )',path:"website/docs/tutorials/authentication-and-security/rate.py"}}}]);
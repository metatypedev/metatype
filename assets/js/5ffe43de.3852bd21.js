(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[625],{17942:(e,t,a)=>{"use strict";a.d(t,{Zo:()=>c,kt:()=>h});var n=a(50959);function r(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function i(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,n)}return a}function o(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?i(Object(a),!0).forEach((function(t){r(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):i(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function l(e,t){if(null==e)return{};var a,n,r=function(e,t){if(null==e)return{};var a,n,r={},i=Object.keys(e);for(n=0;n<i.length;n++)a=i[n],t.indexOf(a)>=0||(r[a]=e[a]);return r}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(n=0;n<i.length;n++)a=i[n],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(r[a]=e[a])}return r}var s=n.createContext({}),p=function(e){var t=n.useContext(s),a=t;return e&&(a="function"==typeof e?e(t):o(o({},t),e)),a},c=function(e){var t=p(e.components);return n.createElement(s.Provider,{value:t},e.children)},m="mdxType",d={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},u=n.forwardRef((function(e,t){var a=e.components,r=e.mdxType,i=e.originalType,s=e.parentName,c=l(e,["components","mdxType","originalType","parentName"]),m=p(a),u=r,h=m["".concat(s,".").concat(u)]||m[u]||d[u]||i;return a?n.createElement(h,o(o({ref:t},c),{},{components:a})):n.createElement(h,o({ref:t},c))}));function h(e,t){var a=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var i=a.length,o=new Array(i);o[0]=u;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l[m]="string"==typeof e?e:r,o[1]=l;for(var p=2;p<i;p++)o[p]=a[p];return n.createElement.apply(null,o)}return n.createElement.apply(null,a)}u.displayName="MDXCreateElement"},22332:(e,t,a)=>{"use strict";a.d(t,{r:()=>r});var n=a(50959);function r(e){let{name:t,choices:a,choice:r,onChange:i,className:o}=e;return n.createElement("ul",{className:`pl-0 m-0 list-none w-full ${o??""}`},Object.entries(a).map((e=>{let[a,o]=e;return n.createElement("li",{key:a,className:"inline-block rounded-md overflow-clip mr-1"},n.createElement("div",null,n.createElement("label",{className:"cursor-pointer"},n.createElement("input",{type:"radio",name:t,value:a,checked:a===r,onChange:()=>i(a),className:"hidden peer"}),n.createElement("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white"},o))))})))}},73034:(e,t,a)=>{"use strict";a.d(t,{Z:()=>g});var n=a(50959),r=a(54629),i=a(39767),o=a(58111),l=a(28840),s=a(11217);const p=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function c(e){const{queryEditor:t,variableEditor:a,headerEditor:r}=(0,s._i)({nonNull:!0}),[i,o]=(0,n.useState)(e.defaultTab),l=(0,s.Xd)({onCopyQuery:e.onCopyQuery}),c=(0,s.fE)();return(0,n.useEffect)((()=>{a&&p(a)}),[i,a]),(0,n.useEffect)((()=>{r&&p(r)}),[i,r]),(0,n.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",p),p(t))}),[t]),(0,n.useEffect)((()=>{a&&(a.setOption("lineNumbers",!1),a.setOption("gutters",[]),a.on("change",p))}),[a]),(0,n.useEffect)((()=>{r&&(r.setOption("lineNumbers",!1),r.setOption("gutters",[]),r.on("change",p))}),[r]),n.createElement(s.u.Provider,null,n.createElement("div",{className:"graphiql-editors"},n.createElement("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor"},n.createElement("div",{className:"graphiql-query-editor-wrapper"},n.createElement(s.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),n.createElement("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands"},n.createElement(s._8,null),n.createElement(s.wC,{onClick:()=>c(),label:"Prettify query (Shift-Ctrl-P)"},n.createElement(s.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})),n.createElement(s.wC,{onClick:()=>l(),label:"Copy query (Shift-Ctrl-C)"},n.createElement(s.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"}))))),e.noTool?null:n.createElement(n.Fragment,null,n.createElement("div",{className:"graphiql-editor-tools p-0 text-sm "},n.createElement("div",{className:"graphiql-editor-tools-tabs"},n.createElement("div",{className:("variables"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{o("variables"===i?"":"variables")}},"Variables"),n.createElement("div",{className:("headers"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{o("headers"===i?"":"headers")}},"Headers"))),n.createElement("section",{className:"graphiql-editor-tool "+(i&&i.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===i?"Variables":"Headers"},n.createElement(s.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==i,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),n.createElement(s.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==i,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})))))}class m{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var d=a(22332);function u(){return(0,s.JB)({nonNull:!0}).isFetching?n.createElement(s.$j,null):null}const h={typegraph:"Typegraph",playground:"Playground"};function y(e){let{typegraph:t,query:a,code:i,codeLanguage:p,codeFileUrl:y,headers:g={},variables:f={},tab:k="",noTool:v=!1,defaultMode:b=null}=e;const{siteConfig:{customFields:{tgUrl:N}}}=(0,o.Z)(),E=(0,n.useMemo)((()=>new m),[]),w=(0,n.useMemo)((()=>(0,r.nq)({url:`${N}/${t}`})),[]),[x,C]=(0,n.useState)(b);return n.createElement("div",{className:"@container miniql mb-5"},b?n.createElement(d.r,{name:"mode",choices:h,choice:x,onChange:C,className:"mb-2"}):null,n.createElement(s.j$,{fetcher:w,defaultQuery:a.loc?.source.body.trim(),defaultHeaders:JSON.stringify(g),shouldPersistHeaders:!0,variables:JSON.stringify(f),storage:E},n.createElement("div",{className:(b?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first"},b&&"typegraph"!==x?null:n.createElement("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0"},y?n.createElement("div",{className:"p-2 text-xs font-light"},"See/edit full code on"," ",n.createElement("a",{href:`https://github.com/metatypedev/metatype/blob/main/${y}`},y)):null,i?n.createElement(l.Z,{language:p,wrap:!0,className:"flex-1"},i):null),b&&"playground"!==x?null:n.createElement("div",{className:"flex flex-col graphiql-container"},n.createElement("div",{className:"flex-1 graphiql-session"},n.createElement(c,{defaultTab:k,noTool:v})),n.createElement("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg"},n.createElement(u,null),n.createElement(s.iB,null))))))}function g(e){return n.createElement(i.Z,{fallback:n.createElement("div",null,"Loading...")},(()=>n.createElement(y,e)))}},63637:(e,t,a)=>{"use strict";a.d(t,{Z:()=>o});var n=a(87366),r=a(73034),i=a(50959);function o(e){let{python:t,...a}=e;return i.createElement(r.Z,(0,n.Z)({code:t.content,codeLanguage:"python",codeFileUrl:t.path},a))}},18150:(e,t,a)=>{"use strict";a.r(t),a.d(t,{assets:()=>c,contentTitle:()=>s,default:()=>h,frontMatter:()=>l,metadata:()=>p,toc:()=>m});var n=a(87366),r=(a(50959),a(17942)),i=a(28840),o=a(63637);const l={sidebar_position:2},s="Your first typegraph",p={unversionedId:"tutorials/your-first-typegraph/index",id:"tutorials/your-first-typegraph/index",title:"Your first typegraph",description:"Before you jump into coding, a brief introduction. The typegraphs - virtual graphs of types - are the secret sauce of the ecosystem. They establish the foundation for all the abstraction that will be introduced later. Similar to programming languages, they let the developer describe with a type system:",source:"@site/docs/tutorials/your-first-typegraph/index.mdx",sourceDirName:"tutorials/your-first-typegraph",slug:"/tutorials/your-first-typegraph/",permalink:"/docs/tutorials/your-first-typegraph/",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/tutorials/your-first-typegraph/index.mdx",tags:[],version:"current",sidebarPosition:2,frontMatter:{sidebar_position:2},sidebar:"docs",previous:{title:"Getting started",permalink:"/docs/tutorials/getting-started"},next:{title:"Adding more runtimes",permalink:"/docs/tutorials/adding-more-runtimes/"}},c={},m=[{value:"Zooming on the types",id:"zooming-on-the-types",level:2},{value:"The typegraph package",id:"the-typegraph-package",level:2},{value:"The meta CLI",id:"the-meta-cli",level:2}],d={toc:m},u="wrapper";function h(e){let{components:t,...l}=e;return(0,r.kt)(u,(0,n.Z)({},d,l,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("h1",{id:"your-first-typegraph"},"Your first typegraph"),(0,r.kt)("p",null,"Before you jump into coding, a brief introduction. The typegraphs - virtual graphs of types - are the secret sauce of the ecosystem. They establish the foundation for all the abstraction that will be introduced later. Similar to programming languages, they let the developer describe with a type system:"),(0,r.kt)("ol",null,(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("em",{parentName:"li"},"what")," data types exists"),(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("em",{parentName:"li"},"how")," these data get transformed"),(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("em",{parentName:"li"},"where")," these data and transformations run"),(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("em",{parentName:"li"},"who")," can access them")),(0,r.kt)("h2",{id:"zooming-on-the-types"},"Zooming on the types"),(0,r.kt)("p",null,'There is no "object" or "primitive" type, only 4 main categories of types:'),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"value types: ",(0,r.kt)("inlineCode",{parentName:"li"},"t.integer()"),", ",(0,r.kt)("inlineCode",{parentName:"li"},"t.string()"),", ",(0,r.kt)("inlineCode",{parentName:"li"},"t.uuid()"),", etc."),(0,r.kt)("li",{parentName:"ul"},"quantifier types: ",(0,r.kt)("inlineCode",{parentName:"li"},"t.optional(\xb7)"),", ",(0,r.kt)("inlineCode",{parentName:"li"},"t.array(\xb7)"),", etc."),(0,r.kt)("li",{parentName:"ul"},"consolidator types: ",(0,r.kt)("inlineCode",{parentName:"li"},"t.struct(\xb7, \xb7)"),", ",(0,r.kt)("inlineCode",{parentName:"li"},"t.union(\xb7, \xb7)"),", etc."),(0,r.kt)("li",{parentName:"ul"},"function types: ",(0,r.kt)("inlineCode",{parentName:"li"},"t.func(\xb7 \u2192 \xb7)"),", ",(0,r.kt)("inlineCode",{parentName:"li"},"t.policy(\xb7 \u2192 \xb7)"),", etc.")),(0,r.kt)("p",null,"You can combine them with each other to describe almost any data type you may need. The typegate enforces the data validation when data flows through it. Some syntactic sugar is available to make the type definition shorter:"),(0,r.kt)(i.Z,{language:"python",mdxType:"CodeBlock"},a(21323).content),(0,r.kt)("h2",{id:"the-typegraph-package"},"The typegraph package"),(0,r.kt)("p",null,"The typegraph package is a Python package that allows to describe a full typegraph. It's a thin wrapper around the type system, and provides a few helpers to make the typegraph definition easier. It builds on the type system to provide some more building blocks:"),(0,r.kt)("ol",null,(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("em",{parentName:"li"},"what")," data types exists \u2192 value, quantifier, consolidator ",(0,r.kt)("strong",{parentName:"li"},"types")),(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("em",{parentName:"li"},"how")," these data get transformed \u2192 function types and ",(0,r.kt)("strong",{parentName:"li"},"materializers")," that specify the transformation"),(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("em",{parentName:"li"},"where")," these data and transformations run \u2192 ",(0,r.kt)("strong",{parentName:"li"},"runtimes")," that describe materializers operate"),(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("em",{parentName:"li"},"who")," can access them \u2192 a special case of function types named ",(0,r.kt)("strong",{parentName:"li"},"policies")," that control accesses")),(0,r.kt)("p",null,"This tutorial will cover these abstractions concept by concept and show how to use them by example."),(0,r.kt)("admonition",{title:"Code sample are interactive",type:"info"},(0,r.kt)("p",{parentName:"admonition"},'You can interact with most of the typegraph in the documentation. Press command/ctrl + enter to submit the selected query or use the "play" button. Some parts might be voluntarily hidden and full source can be found by clicking on the link.')),(0,r.kt)("p",null,"A complete typegraph definition may look like the following:"),(0,r.kt)(o.Z,{typegraph:"first-typegraph",python:a(42840),query:a(83301),mdxType:"TGExample"}),(0,r.kt)("p",null,"To start with the chat app design, copy the typegraph into the file named ",(0,r.kt)("inlineCode",{parentName:"p"},"example.py")," next to your ",(0,r.kt)("inlineCode",{parentName:"p"},"compose.yml")," file."),(0,r.kt)("h2",{id:"the-meta-cli"},"The meta CLI"),(0,r.kt)("p",null,"The meta CLI use a YAML configuration file to source some information and avoid typing the same arguments over and over again. Copy the following into named ",(0,r.kt)("inlineCode",{parentName:"p"},"metatype.yml")," also next to previous files:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-yaml"},'typegates:\n  dev:\n    url: "http://localhost:7890"\n    # default values\n    username: admin\n    password: password\ntypegraphs:\n  python:\n    include: "**/*.py"\n')),(0,r.kt)("p",null,"At this point, you should have everything ready for your first typegraph. Run the following command in your terminal:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-shell"},"$ ls -1a\n./\n../\n.venv/\napi/\ncompose.yml\nmetatype.yml\npyproject.toml\n\n$ ls -1a api\n./\n../\nexample.py\n\n$ meta dev\nLoaded 1 typegraph from ./api/example.py:\n  \u2192 Pushing typegraph first-typegraph...\n  \u2713 Success!\n")),(0,r.kt)("p",null,"You can now open ",(0,r.kt)("a",{parentName:"p",href:"http://localhost:7890/first-typegraph"},"http://localhost:7890/first-typegraph")," in your browser. The CLI will automatically watch for changes in the typegraph and reload the typegraph. You should see a GraphQL playground with a query editor and some auto-generated documentation clicking the top-left menu item. ",(0,r.kt)("strong",{parentName:"p"},"Congrats"),", you can now to play with your first typegraph!"),(0,r.kt)("div",{className:"text-center"},(0,r.kt)("img",{src:a(56371).Z,width:"600",alt:"typegate playground"})))}h.isMDXComponent=!0},83301:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"get_message"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"title"},arguments:[],directives:[]}]}},{kind:"Field",alias:{kind:"Name",value:"second_one"},name:{kind:"Name",value:"get_message"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"user_id"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:106}};t.loc.source={body:"query {\n  get_message {\n    id\n    title\n    # user_id\n  }\n\n  second_one: get_message {\n    user_id\n  }\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function a(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var n=e.type;"NamedType"===n.kind&&t.add(n.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){a(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){a(e,t)})),e.definitions&&e.definitions.forEach((function(e){a(e,t)}))}var n={};t.definitions.forEach((function(e){if(e.name){var t=new Set;a(e,t),n[e.name.value]=t}})),e.exports=t},56371:(e,t,a)=>{"use strict";a.d(t,{Z:()=>n});const n=a.p+"assets/images/playground-e2945136e370af514015f00940316a79.png"},42840:e=>{e.exports={content:'from typegraph import TypeGraph, policies, t\nfrom typegraph.runtimes.random import RandomMat, RandomRuntime\n\nwith TypeGraph(\n  "first-typegraph",\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n) as g:\n  # declare runtimes and policies\n  random = RandomRuntime()\n  public = policies.public()\n\n  # declare types\n  message = t.struct(\n    {\n      "id": t.integer(),\n      "title": t.string(),\n      "user_id": t.integer(),\n    }\n  )\n\n  # expose them with policies\n  g.expose(\n    # input \u2192 output via materializer\n    get_message=t.func(t.struct(), message, RandomMat(random)),\n    default_policy=[public],\n  )',path:"website/docs/tutorials/your-first-typegraph/t.py"}},21323:e=>{e.exports={content:'t.struct(\n  {\n    "name": t.string().max(200),\n    "age": t.optional(\n      t.integer()\n    ),  # or t.integer().optional()\n    "messages": t.array(\n      t.struct({"text": t.string(), "sentAt": t.datetime()})\n    ),\n  }\n)\n\n# the typegate will accept data as follow\n{\n  "name": "Alan",\n  "age": 28,\n  "messages": [\n    {"text": "Hello!", "sentAt": "2022-12-28T01:11:10Z"}\n  ],\n}\n\n# and reject invalid data\n{"name": "Turing", "messages": [{"sentAt": 1}]}',path:"website/docs/tutorials/your-first-typegraph/types.py"}}}]);
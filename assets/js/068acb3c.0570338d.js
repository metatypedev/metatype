(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[526],{17942:(e,t,n)=>{"use strict";n.d(t,{Zo:()=>d,kt:()=>h});var a=n(50959);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function l(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?l(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):l(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function o(e,t){if(null==e)return{};var n,a,r=function(e,t){if(null==e)return{};var n,a,r={},l=Object.keys(e);for(a=0;a<l.length;a++)n=l[a],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(a=0;a<l.length;a++)n=l[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var s=a.createContext({}),c=function(e){var t=a.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):i(i({},t),e)),n},d=function(e){var t=c(e.components);return a.createElement(s.Provider,{value:t},e.children)},m="mdxType",u={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},p=a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,l=e.originalType,s=e.parentName,d=o(e,["components","mdxType","originalType","parentName"]),m=c(n),p=r,h=m["".concat(s,".").concat(p)]||m[p]||u[p]||l;return n?a.createElement(h,i(i({ref:t},d),{},{components:n})):a.createElement(h,i({ref:t},d))}));function h(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var l=n.length,i=new Array(l);i[0]=p;var o={};for(var s in t)hasOwnProperty.call(t,s)&&(o[s]=t[s]);o.originalType=e,o[m]="string"==typeof e?e:r,i[1]=o;for(var c=2;c<l;c++)i[c]=n[c];return a.createElement.apply(null,i)}return a.createElement.apply(null,n)}p.displayName="MDXCreateElement"},19440:(e,t,n)=>{"use strict";n.d(t,{ZP:()=>o});var a=n(87366),r=(n(50959),n(17942));const l={toc:[]},i="wrapper";function o(e){let{components:t,...n}=e;return(0,r.kt)(i,(0,a.Z)({},l,n,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("p",null,"Metatype is an open source platform for developers to ",(0,r.kt)("strong",{parentName:"p"},"declaratively build APIs"),". It offers a unique approach to building backends, where the focus is all on data modelling and the platform takes care of the rest."),(0,r.kt)("p",null,"The intent is to find a convenient computing model that tackles the following challenges:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"most developers still spend too much time on tasks with low-value (crud, data validation, compliance, etc.)"),(0,r.kt)("li",{parentName:"ul"},"when growing a product, it is hard to keep up with business needs and remain innovative with technology"),(0,r.kt)("li",{parentName:"ul"},"managing server and infrastructure shall never be a concern for developers nor slow them down")),(0,r.kt)("p",null,"In that respect, Metatype can be seen as an alternative to Hasura, Strapi, Firebase, or even web frameworks like Django or NestJS. You can see how Metatype differs reading the ",(0,r.kt)("a",{parentName:"p",href:"/docs/concepts/overview"},"conceptual overview")," or the ",(0,r.kt)("a",{parentName:"p",href:"/docs/concepts/comparisons"},"comparison summary"),"."),(0,r.kt)("p",null,"The platform consists of the following components:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"/docs/concepts/typegraph"},(0,r.kt)("strong",{parentName:"a"},"Typegraph")),": a package to describe typegraphs - virtual graphs of types - and compose them"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"/docs/concepts/typegate"},(0,r.kt)("strong",{parentName:"a"},"Typegate")),": a distributed REST/GraphQL query engine to execute queries over typegraphs"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"/docs/concepts/meta-cli"},(0,r.kt)("strong",{parentName:"a"},"Meta CLI")),": a command-line tool to provide great developer experience and serverless deployment")),(0,r.kt)("p",null,"A vast range of ",(0,r.kt)("a",{parentName:"p",href:"/docs/reference/runtimes"},"runtimes")," is implemented by the platform and provides out of the box support for storing data in databases/S3, connecting to third-party/internal APIs and running business logic in Deno/Python/WebAssembly."))}o.isMDXComponent=!0},80381:(e,t,n)=>{"use strict";n.d(t,{r:()=>r});var a=n(50959);function r(e){let{name:t,choices:n,choice:r,onChange:l,className:i}=e;return a.createElement("ul",{className:`pl-0 m-0 list-none w-full ${i??""}`},Object.entries(n).map((e=>{let[n,i]=e;return a.createElement("li",{key:n,className:"inline-block rounded-md overflow-clip mr-1"},a.createElement("div",null,a.createElement("label",{className:"cursor-pointer"},a.createElement("input",{type:"radio",name:t,value:n,checked:n===r,onChange:()=>l(n),className:"hidden peer"}),a.createElement("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white"},i))))})))}},75719:(e,t,n)=>{"use strict";n.d(t,{a:()=>r});var a=n(50959);function r(){return a.createElement("div",{className:"flex justify-center mt-8 overflow-auto"},a.createElement("table",{className:"table-fixed text-center",id:"landscape"},a.createElement("tbody",null,a.createElement("tr",{className:"border-none"},a.createElement("td",{className:"border-none"}),a.createElement("td",null,a.createElement("small",null,"\u2190 individual level"),a.createElement("br",null),"transactional"),a.createElement("td",null,a.createElement("small",null,"large data \u2192"),a.createElement("br",null),"analytical")),a.createElement("tr",null,a.createElement("td",null,a.createElement("small",null,"instantaneous \u2191"),a.createElement("br",null),"short-lived"),a.createElement("td",{className:"bg-slate-100"},a.createElement("strong",null,"Metatype"),a.createElement("br",null),a.createElement("small",null,"query engine for data entities in evolving systems")),a.createElement("td",null,"Trino",a.createElement("br",null),a.createElement("small",null,"query engine for large data from multiples sources"))),a.createElement("tr",null,a.createElement("td",null,"long-running",a.createElement("br",null),a.createElement("small",null,"asynchronous \u2193")),a.createElement("td",null,"Temporal",a.createElement("br",null),a.createElement("small",null,"workflow orchestration engine for data operations")),a.createElement("td",null,"Spark",a.createElement("br",null),a.createElement("small",null,"batch/streaming engine for large data processing"))))))}},35751:(e,t,n)=>{"use strict";n.d(t,{Z:()=>f});var a=n(50959),r=n(11253),l=n(41474),i=n(13365),o=n(44354),s=n(24602);const c=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function d(e){const{queryEditor:t,variableEditor:n,headerEditor:r}=(0,s._i)({nonNull:!0}),[l,i]=(0,a.useState)(e.defaultTab),o=(0,s.Xd)({onCopyQuery:e.onCopyQuery}),d=(0,s.fE)();return(0,a.useEffect)((()=>{n&&c(n)}),[l,n]),(0,a.useEffect)((()=>{r&&c(r)}),[l,r]),(0,a.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",c),c(t))}),[t]),(0,a.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",c))}),[n]),(0,a.useEffect)((()=>{r&&(r.setOption("lineNumbers",!1),r.setOption("gutters",[]),r.on("change",c))}),[r]),a.createElement(s.u.Provider,null,a.createElement("div",{className:"graphiql-editors"},a.createElement("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor"},a.createElement("div",{className:"graphiql-query-editor-wrapper"},a.createElement(s.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),a.createElement("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands"},a.createElement(s._8,null),a.createElement(s.wC,{onClick:()=>d(),label:"Prettify query (Shift-Ctrl-P)"},a.createElement(s.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})),a.createElement(s.wC,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)"},a.createElement(s.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"}))))),e.noTool?null:a.createElement(a.Fragment,null,a.createElement("div",{className:"graphiql-editor-tools p-0 text-sm "},a.createElement("div",{className:"graphiql-editor-tools-tabs"},a.createElement("div",{className:("variables"===l?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{i("variables"===l?"":"variables")}},"Variables"),a.createElement("div",{className:("headers"===l?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{i("headers"===l?"":"headers")}},"Headers"))),a.createElement("section",{className:"graphiql-editor-tool "+(l&&l.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===l?"Variables":"Headers"},a.createElement(s.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==l,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),a.createElement(s.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==l,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})))))}class m{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var u=n(80381);function p(){return(0,s.JB)({nonNull:!0}).isFetching?a.createElement(s.$j,null):null}const h={typegraph:"Typegraph",playground:"Playground"};function g(e){let{typegraph:t,query:n,code:l,codeLanguage:c,codeFileUrl:g,headers:f={},variables:y={},tab:v="",noTool:b=!1,defaultMode:k=null}=e;const{siteConfig:{customFields:{tgUrl:E}}}=(0,i.Z)(),w=(0,a.useMemo)((()=>new m),[]),N=(0,a.useMemo)((()=>(0,r.nq)({url:`${E}/${t}`})),[]),[x,O]=(0,a.useState)(k);return a.createElement("div",{className:"@container miniql mb-5"},k?a.createElement(u.r,{name:"mode",choices:h,choice:x,onChange:O,className:"mb-2"}):null,a.createElement(s.j$,{fetcher:N,defaultQuery:n.loc?.source.body.trim(),defaultHeaders:JSON.stringify(f),shouldPersistHeaders:!0,variables:JSON.stringify(y),storage:w},a.createElement("div",{className:(k?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first"},k&&"typegraph"!==x?null:a.createElement("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0"},g?a.createElement("div",{className:"p-2 text-xs font-light"},"See/edit full code on"," ",a.createElement("a",{href:`https://github.com/metatypedev/metatype/blob/main/${g}`},g)):null,l?a.createElement(o.Z,{language:c,wrap:!0,className:"flex-1"},l):null),k&&"playground"!==x?null:a.createElement("div",{className:"flex flex-col graphiql-container"},a.createElement("div",{className:"flex-1 graphiql-session"},a.createElement(d,{defaultTab:v,noTool:b})),a.createElement("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg"},a.createElement(p,null),a.createElement(s.iB,null))))))}function f(e){return a.createElement(l.Z,{fallback:a.createElement("div",null,"Loading...")},(()=>a.createElement(g,e)))}},62444:(e,t,n)=>{"use strict";n.d(t,{Z:()=>i});var a=n(87366),r=n(35751),l=n(50959);function i(e){let{python:t,...n}=e;return l.createElement(r.Z,(0,a.Z)({code:t.content,codeLanguage:"python",codeFileUrl:t.path},n))}},45728:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>m,contentTitle:()=>c,default:()=>g,frontMatter:()=>s,metadata:()=>d,toc:()=>u});var a=n(87366),r=(n(50959),n(17942)),l=n(75719),i=n(19440),o=n(62444);const s={},c="Introducing Metatype: programmable glue for developers",d={permalink:"/blog/2023/06/18/programmable-glue",editUrl:"https://github.com/metatypedev/metatype/tree/main/website/blog/2023-06-18-programmable-glue/index.mdx",source:"@site/blog/2023-06-18-programmable-glue/index.mdx",title:"Introducing Metatype: programmable glue for developers",description:"What is Metatype?",date:"2023-06-18T00:00:00.000Z",formattedDate:"June 18, 2023",tags:[],readingTime:1.175,hasTruncateMarker:!1,authors:[],frontMatter:{}},m={authorsImageUrls:[]},u=[{value:"What is Metatype?",id:"what-is-metatype",level:2},{value:"What are virtual graphs?",id:"what-are-virtual-graphs",level:2},{value:"Where does this belong in the tech landscape?",id:"where-does-this-belong-in-the-tech-landscape",level:2},{value:"Give it a try!",id:"give-it-a-try",level:2}],p={toc:u},h="wrapper";function g(e){let{components:t,...s}=e;return(0,r.kt)(h,(0,a.Z)({},p,s,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("h2",{id:"what-is-metatype"},"What is Metatype?"),(0,r.kt)(i.ZP,{mdxType:"Metatype"}),(0,r.kt)("h2",{id:"what-are-virtual-graphs"},"What are virtual graphs?"),(0,r.kt)("p",null,"Typegraphs are a declarative way to expose all APIs, storage and business logic of your stack as a single graph. They take inspiration from domain-driven design principles and in the idea that the relation between of the data is as important as data itself, even though they might be in different locations or shapes."),(0,r.kt)(o.Z,{python:n(24802),typegraph:"homepage",variables:{email:"fill-me",message:"Great tool!"},defaultMode:"typegraph",query:n(66628),mdxType:"TGExample"}),(0,r.kt)("p",null,"These elements can then be combined and composed together similarly on how you would compose web components to create an interface in modern frontend practices. This allows developers to build modular and strongly typed APIs using typegraph as a programmable glue."),(0,r.kt)("h2",{id:"where-does-this-belong-in-the-tech-landscape"},"Where does this belong in the tech landscape?"),(0,r.kt)("p",null,"Before Metatype, there was a gap in the technological landscape for a solution that specifically addressed the transactional, short-lived use cases. While there were existing tools for analytical or long-running use cases, such as Trino and Temporal, there was no generic engine for handling transactional, short-lived tasks."),(0,r.kt)(l.a,{mdxType:"CompareLandscape"}),(0,r.kt)("h2",{id:"give-it-a-try"},"Give it a try!"),(0,r.kt)("p",null,"Let us know what you think! Metatype is open source and we welcome any feedback or contributions. The community primarily lives on ",(0,r.kt)("a",{parentName:"p",href:"https://github.com/metatypedev/metatype"},"GitHub"),"."),(0,r.kt)("admonition",{title:"Next steps",type:"info"},(0,r.kt)("p",{parentName:"admonition"},(0,r.kt)("a",{parentName:"p",href:"/docs/tutorials/getting-started"},"Build your first typegraph")," or read more about the ",(0,r.kt)("a",{parentName:"p",href:"/docs/concepts/overview"},"concepts behind Metatype"),".")))}g.isMDXComponent=!0},66628:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"A"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"stargazers"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"login"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"user"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]}]}}]}}]}},{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"B"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"send_feedback"},arguments:[{kind:"Argument",name:{kind:"Name",value:"data"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"email"},value:{kind:"StringValue",value:"",block:!1}},{kind:"ObjectField",name:{kind:"Name",value:"message"},value:{kind:"StringValue",value:"I love X!",block:!1}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"message"},arguments:[],directives:[]}]}}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"C"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"list_feedback"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"email"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"message"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:309}};t.loc.source={body:'query A {\n  stargazers {\n    login\n    # composition\n    user {\n      name\n    }\n  }\n}\n\nmutation B {\n  send_feedback(\n    data: {\n      email: "" # fill me\n      message: "I love X!"\n    }\n  ) {\n    id\n    message\n  }\n}\n\nquery C {\n  list_feedback {\n    email # cannot be accessed, delete me\n    message\n  }\n}\n',name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var a=e.type;"NamedType"===a.kind&&t.add(a.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var a={};function r(e,t){for(var n=0;n<e.definitions.length;n++){var a=e.definitions[n];if(a.name&&a.name.value==t)return a}}function l(e,t){var n={kind:e.kind,definitions:[r(e,t)]};e.hasOwnProperty("loc")&&(n.loc=e.loc);var l=a[t]||new Set,i=new Set,o=new Set;for(l.forEach((function(e){o.add(e)}));o.size>0;){var s=o;o=new Set,s.forEach((function(e){i.has(e)||(i.add(e),(a[e]||new Set).forEach((function(e){o.add(e)})))}))}return i.forEach((function(t){var a=r(e,t);a&&n.definitions.push(a)})),n}t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),a[e.name.value]=t}})),e.exports=t,e.exports.A=l(t,"A"),e.exports.B=l(t,"B"),e.exports.C=l(t,"C")},24802:e=>{e.exports={content:'with TypeGraph(\n  # out of the box authenfication support\n  auths=[oauth2.github("openid email")],\n) as g:\n  # every field may be controlled by a policy\n  public = policies.public()\n  meta_only = policies.ctx("email", re.compile(".+@metatype.dev"))\n  public_write_only = {"create": public, "none": meta_only}\n\n  # define runtimes where your queries are executed\n  github = HTTPRuntime("https://api.github.com")\n  db = PrismaRuntime("demo", "POSTGRES_CONN")\n\n  # a feedback object stored in Postgres\n  feedback = t.struct(\n    {\n      "id": t.uuid().as_id.config("auto"),\n      "email": t.email().add_policy(public_write_only),\n      "message": t.string().min(1).max(2000),\n    }\n  ).named("feedback")\n\n  # a stargazer object from Github\n  stargazer = t.struct(\n    {\n      "login": t.string().named("login"),\n      # link with the feedback across runtimes\n      "user": github.get(\n        "/users/{user}",\n        t.struct(\n          {"user": t.string().from_parent(g("login"))}\n        ),\n        t.struct({"name": t.string().optional()}),\n      ),\n    }\n  )\n\n  # expose part of the graph for queries\n  g.expose(\n    stargazers=github.get(\n      "/repos/metatypedev/metatype/stargazers?per_page=2",\n      t.struct({}),\n      t.array(stargazer),\n    ),\n    # automatically generate crud operations\n    send_feedback=db.create(feedback),\n    list_feedback=db.find_many(feedback),\n    default_policy=[public],\n  )',path:"website/src/pages/index.py"}}}]);
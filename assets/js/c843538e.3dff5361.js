(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[272],{17942:(e,t,n)=>{"use strict";n.d(t,{Zo:()=>u,kt:()=>h});var a=n(50959);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function l(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?i(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function o(e,t){if(null==e)return{};var n,a,r=function(e,t){if(null==e)return{};var n,a,r={},i=Object.keys(e);for(a=0;a<i.length;a++)n=i[a],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(a=0;a<i.length;a++)n=i[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var s=a.createContext({}),c=function(e){var t=a.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):l(l({},t),e)),n},u=function(e){var t=c(e.components);return a.createElement(s.Provider,{value:t},e.children)},m="mdxType",d={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},p=a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,i=e.originalType,s=e.parentName,u=o(e,["components","mdxType","originalType","parentName"]),m=c(n),p=r,h=m["".concat(s,".").concat(p)]||m[p]||d[p]||i;return n?a.createElement(h,l(l({ref:t},u),{},{components:n})):a.createElement(h,l({ref:t},u))}));function h(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var i=n.length,l=new Array(i);l[0]=p;var o={};for(var s in t)hasOwnProperty.call(t,s)&&(o[s]=t[s]);o.originalType=e,o[m]="string"==typeof e?e:r,l[1]=o;for(var c=2;c<i;c++)l[c]=n[c];return a.createElement.apply(null,l)}return a.createElement.apply(null,n)}p.displayName="MDXCreateElement"},38921:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>c,contentTitle:()=>o,default:()=>p,frontMatter:()=>l,metadata:()=>s,toc:()=>u});var a=n(52319),r=(n(50959),n(17942)),i=n(6809);const l={},o="Function-as-a-service runner",s={unversionedId:"faas-runner/index",id:"faas-runner/index",title:"Function-as-a-service runner",description:"A Function-as-a-Service (FaaS) runner is a platform that allows developers to deploy and run small, single-purpose functions in the cloud. FaaS runners typically provide a serverless architecture, which means that developers do not have to worry about infrastructure management or the scaling, as the platform automatically handles these tasks.",source:"@site/use-cases/faas-runner/index.mdx",sourceDirName:"faas-runner",slug:"/faas-runner/",permalink:"/use-cases/faas-runner/",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/faas-runner/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",previous:{title:"Backend for frontend",permalink:"/use-cases/backend-for-frontend/"},next:{title:"All-in-one GraphQL server",permalink:"/use-cases/graphql-server/"}},c={},u=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}],m={toc:u},d="wrapper";function p(e){let{components:t,...l}=e;return(0,r.kt)(d,(0,a.Z)({},m,l,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("h1",{id:"function-as-a-service-runner"},"Function-as-a-service runner"),(0,r.kt)("p",null,"A Function-as-a-Service (FaaS) runner is a platform that allows developers to deploy and run small, single-purpose functions in the cloud. FaaS runners typically provide a serverless architecture, which means that developers do not have to worry about infrastructure management or the scaling, as the platform automatically handles these tasks."),(0,r.kt)("h2",{id:"case-study"},"Case study"),(0,r.kt)("div",{className:"text-center md:float-right p-8"},(0,r.kt)("p",null,(0,r.kt)("img",{src:n(34869).Z,width:"337",height:"311"}))),(0,r.kt)("p",null,"For example, imagine you have an e-commerce application that uses FaaS to process orders. When a customer places an order, multiple functions may need to be executed, such as validating the order, processing the payment, and updating the inventory."),(0,r.kt)("p",null,"Each function may be executed independently by the FaaS platform and may take varying amounts of time to complete. Those functions may also be executed for historical reason on different platforms like AWS Lambda, Google Cloud Functions, or Azure Functions."),(0,r.kt)("p",null,"To collect the results of all the functions in a timely manner, you need to ensure that each function is executed in the correct order and that you are not waiting for a slow function to complete before moving on to the next function."),(0,r.kt)("h2",{id:"metatypes-solution"},"Metatype's solution"),(0,r.kt)("p",null,"To solve the use case of executing multiple functions and collecting their results, Metatype provides two key features."),(0,r.kt)("ol",null,(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("p",{parentName:"li"},"Function composition/chaining: functions can be chained together to form a pipeline. The output of one function can be used as the input of the next function in the pipeline. This allows us to execute multiple functions in a specific order.")),(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("p",{parentName:"li"},"Embedded runner: you can easily write a function that glues together multiple functions and executes them in a specific order. This allows you to execute multiple functions in a specific order. Currently, both Python and Typescript are supported."))),(0,r.kt)(i.Z,{typegraph:"faas-runner",python:n(75052),query:n(77725),mdxType:"TGExample"}))}p.isMDXComponent=!0},3199:(e,t,n)=>{"use strict";n.d(t,{r:()=>r});var a=n(50959);function r(e){let{name:t,choices:n,choice:r,onChange:i,className:l}=e;return a.createElement("ul",{className:`pl-0 m-0 list-none w-full ${l??""}`},Object.entries(n).map((e=>{let[n,l]=e;return a.createElement("li",{key:n,className:"inline-block rounded-md overflow-clip mr-1"},a.createElement("div",null,a.createElement("label",{className:"cursor-pointer"},a.createElement("input",{type:"radio",name:t,value:n,checked:n===r,onChange:()=>i(n),className:"hidden peer"}),a.createElement("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white"},l))))})))}},53553:(e,t,n)=>{"use strict";n.d(t,{Z:()=>y});var a=n(50959),r=n(67243),i=n(66108),l=n(84318),o=n(23560),s=n(30391);const c=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function u(e){const{queryEditor:t,variableEditor:n,headerEditor:r}=(0,s._i)({nonNull:!0}),[i,l]=(0,a.useState)(e.defaultTab),o=(0,s.Xd)({onCopyQuery:e.onCopyQuery}),u=(0,s.fE)();return(0,a.useEffect)((()=>{n&&c(n)}),[i,n]),(0,a.useEffect)((()=>{r&&c(r)}),[i,r]),(0,a.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",c),c(t))}),[t]),(0,a.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",c))}),[n]),(0,a.useEffect)((()=>{r&&(r.setOption("lineNumbers",!1),r.setOption("gutters",[]),r.on("change",c))}),[r]),a.createElement(s.u.Provider,null,a.createElement("div",{className:"graphiql-editors"},a.createElement("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor"},a.createElement("div",{className:"graphiql-query-editor-wrapper"},a.createElement(s.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),a.createElement("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands"},a.createElement(s._8,null),a.createElement(s.wC,{onClick:()=>u(),label:"Prettify query (Shift-Ctrl-P)"},a.createElement(s.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})),a.createElement(s.wC,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)"},a.createElement(s.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"}))))),e.noTool?null:a.createElement(a.Fragment,null,a.createElement("div",{className:"graphiql-editor-tools p-0 text-sm "},a.createElement("div",{className:"graphiql-editor-tools-tabs"},a.createElement("div",{className:("variables"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{l("variables"===i?"":"variables")}},"Variables"),a.createElement("div",{className:("headers"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{l("headers"===i?"":"headers")}},"Headers"))),a.createElement("section",{className:"graphiql-editor-tool "+(i&&i.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===i?"Variables":"Headers"},a.createElement(s.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==i,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),a.createElement(s.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==i,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})))))}class m{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var d=n(3199);function p(){return(0,s.JB)({nonNull:!0}).isFetching?a.createElement(s.$j,null):null}const h={typegraph:"Typegraph",playground:"Playground"};function f(e){let{typegraph:t,query:n,code:i,codeLanguage:c,codeFileUrl:f,headers:y={},variables:g={},tab:v="",noTool:b=!1,defaultMode:E=null}=e;const{siteConfig:{customFields:{tgUrl:k}}}=(0,l.Z)(),x=(0,a.useMemo)((()=>new m),[]),w=(0,a.useMemo)((()=>(0,r.nq)({url:`${k}/${t}`})),[]),[N,O]=(0,a.useState)(E);return a.createElement("div",{className:"@container miniql mb-5"},E?a.createElement(d.r,{name:"mode",choices:h,choice:N,onChange:O,className:"mb-2"}):null,a.createElement(s.j$,{fetcher:w,defaultQuery:n.loc?.source.body.trim(),defaultHeaders:JSON.stringify(y),shouldPersistHeaders:!0,variables:JSON.stringify(g),storage:x},a.createElement("div",{className:(E?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first"},E&&"typegraph"!==N?null:a.createElement("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0"},f?a.createElement("div",{className:"p-2 text-xs font-light"},"See/edit full code on"," ",a.createElement("a",{href:`https://github.com/metatypedev/metatype/blob/main/${f}`},f)):null,i?a.createElement(o.Z,{language:c,wrap:!0,className:"flex-1"},i):null),E&&"playground"!==N?null:a.createElement("div",{className:"flex flex-col graphiql-container"},a.createElement("div",{className:"flex-1 graphiql-session"},a.createElement(u,{defaultTab:v,noTool:b})),a.createElement("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg"},a.createElement(p,null),a.createElement(s.iB,null))))))}function y(e){return a.createElement(i.Z,{fallback:a.createElement("div",null,"Loading...")},(()=>a.createElement(f,e)))}},6809:(e,t,n)=>{"use strict";n.d(t,{Z:()=>l});var a=n(52319),r=n(53553),i=n(50959);function l(e){let{python:t,...n}=e;return i.createElement(r.Z,(0,a.Z)({code:t.content,codeLanguage:"python",codeFileUrl:t.path},n))}},77725:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"pycumsum"},arguments:[{kind:"Argument",name:{kind:"Name",value:"n"},value:{kind:"IntValue",value:"5"}}],directives:[]},{kind:"Field",name:{kind:"Name",value:"tscumsum"},arguments:[{kind:"Argument",name:{kind:"Name",value:"n"},value:{kind:"IntValue",value:"5"}}],directives:[]}]}}],loc:{start:0,end:45}};t.loc.source={body:"query {\n  pycumsum(n: 5)\n\n  tscumsum(n: 5)\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var a=e.type;"NamedType"===a.kind&&t.add(a.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var a={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),a[e.name.value]=t}})),e.exports=t},34869:(e,t,n)=>{"use strict";n.d(t,{Z:()=>a});const a=n.p+"assets/images/image.drawio-1eac40d204b6d3f2e3f634e3bd1b86b1.svg"},75052:e=>{e.exports={content:'with TypeGraph(\n  "faas-runner",\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n) as g:\n  public = policies.public()\n\n  deno = DenoRuntime()\n  python = Python()\n\n  def cumsum(mat):\n    inp = t.struct({"n": t.integer().min(0).max(100)})\n    out = t.integer()\n    return t.func(inp, out, mat)\n\n  g.expose(\n    pycumsum=cumsum(\n      python.from_lambda(lambda inp: sum(range(inp["n"])))\n    ),\n    tscumsum=cumsum(\n      PureFunMat(\n        "({n}) => Array.from(Array(5).keys()).reduce((sum, e) => sum + e, 0)"\n      )\n    ),\n    default_policy=[public],\n  )',path:"website/use-cases/faas-runner/t.py"}}}]);
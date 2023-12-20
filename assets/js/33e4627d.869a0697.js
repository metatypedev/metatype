(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[8421],{14803:(e,t,a)=>{"use strict";a.r(t),a.d(t,{assets:()=>d,contentTitle:()=>l,default:()=>p,frontMatter:()=>r,metadata:()=>o,toc:()=>c});var s=a(11527),n=a(63883),i=a(3643);const r={},l="Composable GraphQL server",o={id:"graphql-server/index",title:"Composable GraphQL server",description:"GraphQL is a query language for APIs that was developed by Facebook in 2012 and open-sourced in 2015. It provides a more efficient, powerful, and flexible alternative to REST APIs by allowing clients to request only the data they need and enabling servers to expose a schema that defines the available data and operations.",source:"@site/use-cases/graphql-server/index.mdx",sourceDirName:"graphql-server",slug:"/graphql-server/",permalink:"/use-cases/graphql-server/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/graphql-server/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",previous:{title:"Cloud function runner",permalink:"/use-cases/faas-runner/"},next:{title:"IAM gateway",permalink:"/use-cases/iam-provider/"}},d={},c=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}];function h(e){const t={h1:"h1",h2:"h2",img:"img",p:"p",...(0,n.a)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(t.h1,{id:"composable-graphql-server",children:"Composable GraphQL server"}),"\n",(0,s.jsx)(t.p,{children:"GraphQL is a query language for APIs that was developed by Facebook in 2012 and open-sourced in 2015. It provides a more efficient, powerful, and flexible alternative to REST APIs by allowing clients to request only the data they need and enabling servers to expose a schema that defines the available data and operations."}),"\n",(0,s.jsx)(t.h2,{id:"case-study",children:"Case study"}),"\n",(0,s.jsx)("div",{className:"text-center md:float-right p-8",children:(0,s.jsx)(t.p,{children:(0,s.jsx)(t.img,{src:a(81662).Z+"",width:"281",height:"301"})})}),"\n",(0,s.jsx)(t.p,{children:"Suppose you are building a subscription platform with a GraphQL API. You need to design a schema that accurately represents the available products, their attributes, and the operations that clients can perform, such as searching, filtering, and sorting."}),"\n",(0,s.jsx)(t.p,{children:"You also need to optimize the performance of complex queries that involve joining multiple data sources, such as products, categories, and user preferences. Additionally, you need to implement caching and pagination to improve the performance and scalability of your API."}),"\n",(0,s.jsx)(t.p,{children:"Finally, you need to ensure that your API is secure and implements appropriate authentication and authorization mechanisms to protect sensitive data and operations. Some challenges like the N+1 problem (when a single query results in multiple nested queries, each of which requires a separate database or API call) can also make the development of GraphQL resolver slow and complex to manage."}),"\n",(0,s.jsx)(t.h2,{id:"metatypes-solution",children:"Metatype's solution"}),"\n",(0,s.jsx)(t.p,{children:"Metatype's approach is to focus on schema design solely, and leave the GraphQL resolver implementation to the engine. By providing where the data is stored and how to access it, the queries are optimized by the engine to minimize the number of external API/database calls and to cache the results."}),"\n",(0,s.jsx)(t.p,{children:"This can be seen as a declarative GraphQL servers, where the server is orchestrated everything for you. Metatype also comes with pre-built functionalities like authentication, authorization, and rate limiting."}),"\n",(0,s.jsx)(i.Z,{typegraph:"graphql-server",python:a(28510),query:a(77282)})]})}function p(e={}){const{wrapper:t}={...(0,n.a)(),...e.components};return t?(0,s.jsx)(t,{...e,children:(0,s.jsx)(h,{...e})}):h(e)}},46153:(e,t,a)=>{"use strict";a.d(t,{r:()=>n});a(50959);var s=a(11527);function n(e){let{name:t,choices:a,choice:n,onChange:i,className:r}=e;return(0,s.jsx)("ul",{className:`pl-0 m-0 list-none w-full ${r??""}`,children:Object.entries(a).map((e=>{let[a,r]=e;return(0,s.jsx)("li",{className:"inline-block rounded-md overflow-clip mr-1",children:(0,s.jsx)("div",{children:(0,s.jsxs)("label",{className:"cursor-pointer",children:[(0,s.jsx)("input",{type:"radio",name:t,value:a,checked:a===n,onChange:()=>i(a),className:"hidden peer"}),(0,s.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:r})]})})},a)}))})}},48893:(e,t,a)=>{"use strict";a.d(t,{Z:()=>y});var s=a(50959),n=a(52691),i=a(45197),r=a(14899),l=a(86117),o=a(7587),d=a(33961),c=a(11527);const h=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function p(e){const{queryEditor:t,variableEditor:a,headerEditor:n}=(0,d._i)({nonNull:!0}),[i,r]=(0,s.useState)(e.defaultTab),l=(0,d.Xd)({onCopyQuery:e.onCopyQuery}),o=(0,d.fE)();return(0,s.useEffect)((()=>{a&&h(a)}),[i,a]),(0,s.useEffect)((()=>{n&&h(n)}),[i,n]),(0,s.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",h),h(t))}),[t]),(0,s.useEffect)((()=>{a&&(a.setOption("lineNumbers",!1),a.setOption("gutters",[]),a.on("change",h))}),[a]),(0,s.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",h))}),[n]),(0,c.jsx)(d.u.Provider,{children:(0,c.jsxs)("div",{className:"graphiql-editors",children:[(0,c.jsx)("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor",children:(0,c.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,c.jsx)(d.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,c.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,c.jsx)(d._8,{}),(0,c.jsx)(d.wC,{onClick:()=>o(),label:"Prettify query (Shift-Ctrl-P)",children:(0,c.jsx)(d.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,c.jsx)(d.wC,{onClick:()=>l(),label:"Copy query (Shift-Ctrl-C)",children:(0,c.jsx)(d.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,c.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,c.jsx)("div",{className:("variables"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("variables"===i?"":"variables")},children:"Variables"}),(0,c.jsx)("div",{className:("headers"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("headers"===i?"":"headers")},children:"Headers"})]})}),(0,c.jsxs)("section",{className:"graphiql-editor-tool "+(i&&i.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===i?"Variables":"Headers",children:[(0,c.jsx)(d.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==i,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,c.jsx)(d.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==i,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class u{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=a(46153);function g(){return(0,d.JB)({nonNull:!0}).isFetching?(0,c.jsx)(d.$j,{}):null}const f={typegraph:"Typegraph",playground:"Playground"};function v(e){let{typegraph:t,query:a,code:i,codeLanguage:h,codeFileUrl:v,headers:y={},variables:x={},tab:b="",noTool:j=!1,defaultMode:q=null}=e;const{siteConfig:{customFields:{tgUrl:k}}}=(0,r.Z)(),N=(0,s.useMemo)((()=>new u),[]),w=(0,s.useMemo)((()=>(0,n.nq)({url:`${k}/${t}`})),[]),[C,S]=(0,s.useState)(q);return(0,c.jsxs)("div",{className:"@container miniql mb-5",children:[q?(0,c.jsx)(m.r,{name:"mode",choices:f,choice:C,onChange:S,className:"mb-2"}):null,(0,c.jsx)(d.j$,{fetcher:w,defaultQuery:a.loc?.source.body.trim(),defaultHeaders:JSON.stringify(y),shouldPersistHeaders:!0,variables:JSON.stringify(x),storage:N,children:(0,c.jsxs)("div",{className:(q?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[q&&"typegraph"!==C?null:(0,c.jsxs)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0",children:[v?(0,c.jsxs)("div",{className:"p-2 text-xs font-light",children:["See/edit full code on"," ",(0,c.jsx)(o.Z,{href:`https://github.com/metatypedev/metatype/blob/main/${v}`,children:v})]}):null,i?(0,c.jsx)(l.Z,{language:h,wrap:!0,className:"flex-1",children:i}):null]}),q&&"playground"!==C?null:(0,c.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,c.jsx)("div",{className:"flex-1 graphiql-session",children:(0,c.jsx)(p,{defaultTab:b,noTool:j})}),(0,c.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,c.jsx)(g,{}),(0,c.jsx)(d.iB,{})]})]})]})})]})}function y(e){return(0,c.jsx)(i.Z,{fallback:(0,c.jsx)("div",{children:"Loading..."}),children:()=>(0,c.jsx)(v,{...e})})}},3643:(e,t,a)=>{"use strict";a.d(t,{Z:()=>i});var s=a(48893),n=(a(50959),a(11527));function i(e){let{python:t,...a}=e;return(0,n.jsx)(s.Z,{code:t.content,codeLanguage:"python",codeFileUrl:t.path,...a})}},77282:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"stargazers"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"login"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"user"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]}]}}]}}]}}],loc:{start:0,end:67}};t.loc.source={body:"query {\n  stargazers {\n    login\n    user {\n      name\n    }\n  }\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function a(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var s=e.type;"NamedType"===s.kind&&t.add(s.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){a(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){a(e,t)})),e.definitions&&e.definitions.forEach((function(e){a(e,t)}))}var s={};t.definitions.forEach((function(e){if(e.name){var t=new Set;a(e,t),s[e.name.value]=t}})),e.exports=t},81662:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});const s=a.p+"assets/images/image.drawio-3cff34f9795f8f92dd49230e78b28fc4.svg"},28510:e=>{e.exports={content:'@typegraph(\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n)\ndef graphql_server(g: Graph):\n  public = Policy.public()\n\n  github = HttpRuntime("https://api.github.com")\n\n  stargazer = t.struct(\n    {\n      "login": t.string(name="login"),\n      "user": github.get(\n        "/users/{user}",\n        t.struct({"user": t.string().from_parent("login")}),\n        t.struct({"name": t.string().optional()}),\n      ),\n    }\n  )\n\n  g.expose(\n    public,\n    stargazers=github.get(\n      "/repos/metatypedev/metatype/stargazers?per_page=2",\n      t.struct({}),\n      t.list(stargazer),\n    ),\n  )',path:"website/use-cases/graphql-server/t.py"}}}]);
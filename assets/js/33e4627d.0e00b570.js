(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[2731],{67610:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>p,contentTitle:()=>o,default:()=>u,frontMatter:()=>r,metadata:()=>l,toc:()=>c});var a=n(86070),s=n(25710),i=n(93214);const r={},o="Composable GraphQL server",l={id:"graphql-server/index",title:"Composable GraphQL server",description:"GraphQL is a query language for APIs that was developed by Facebook in 2012 and open-sourced in 2015. It provides a more efficient, powerful, and flexible alternative to REST APIs by allowing clients to request only the data they need and enabling servers to expose a schema that defines the available data and operations.",source:"@site/use-cases/graphql-server/index.mdx",sourceDirName:"graphql-server",slug:"/graphql-server/",permalink:"/use-cases/graphql-server/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/graphql-server/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",previous:{title:"Cloud function runner",permalink:"/use-cases/faas-runner/"},next:{title:"IAM gateway",permalink:"/use-cases/iam-provider/"}},p={},c=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}];function d(e){const t={h1:"h1",h2:"h2",img:"img",p:"p",...(0,s.R)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(t.h1,{id:"composable-graphql-server",children:"Composable GraphQL server"}),"\n",(0,a.jsx)(t.p,{children:"GraphQL is a query language for APIs that was developed by Facebook in 2012 and open-sourced in 2015. It provides a more efficient, powerful, and flexible alternative to REST APIs by allowing clients to request only the data they need and enabling servers to expose a schema that defines the available data and operations."}),"\n",(0,a.jsx)(t.h2,{id:"case-study",children:"Case study"}),"\n",(0,a.jsx)("div",{className:"text-center md:float-right p-8",children:(0,a.jsx)(t.p,{children:(0,a.jsx)(t.img,{src:n(59660).A+""})})}),"\n",(0,a.jsx)(t.p,{children:"Suppose you are building a subscription platform with a GraphQL API. You need to design a schema that accurately represents the available products, their attributes, and the operations that clients can perform, such as searching, filtering, and sorting."}),"\n",(0,a.jsx)(t.p,{children:"You also need to optimize the performance of complex queries that involve joining multiple data sources, such as products, categories, and user preferences. Additionally, you need to implement caching and pagination to improve the performance and scalability of your API."}),"\n",(0,a.jsx)(t.p,{children:"Finally, you need to ensure that your API is secure and implements appropriate authentication and authorization mechanisms to protect sensitive data and operations. Some challenges like the N+1 problem (when a single query results in multiple nested queries, each of which requires a separate database or API call) can also make the development of GraphQL resolver slow and complex to manage."}),"\n",(0,a.jsx)(t.h2,{id:"metatypes-solution",children:"Metatype's solution"}),"\n",(0,a.jsx)(t.p,{children:"Metatype's approach is to focus on schema design solely, and leave the GraphQL resolver implementation to the engine. By providing where the data is stored and how to access it, the queries are optimized by the engine to minimize the number of external API/database calls and to cache the results."}),"\n",(0,a.jsx)(t.p,{children:"This can be seen as a declarative GraphQL servers, where the server is orchestrated everything for you. Metatype also comes with pre-built functionalities like authentication, authorization, and rate limiting."}),"\n",(0,a.jsx)(i.A,{typegraph:"graphql-server",python:n(19017),typescript:n(42671),query:n(66509)})]})}function u(e={}){const{wrapper:t}={...(0,s.R)(),...e.components};return t?(0,a.jsx)(t,{...e,children:(0,a.jsx)(d,{...e})}):d(e)}},66509:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"stargazers"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"login"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"user"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]}]}}]}}]}}],loc:{start:0,end:67}};t.loc.source={body:"query {\n  stargazers {\n    login\n    user {\n      name\n    }\n  }\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var a=e.type;"NamedType"===a.kind&&t.add(a.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var a={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),a[e.name.value]=t}})),e.exports=t},59660:(e,t,n)=>{"use strict";n.d(t,{A:()=>a});const a=n.p+"assets/images/image.drawio-3cff34f9795f8f92dd49230e78b28fc4.svg"},19017:e=>{e.exports={content:'@typegraph(\n)\ndef graphql_server(g: Graph):\n  public = Policy.public()\n\n  github = HttpRuntime("https://api.github.com")\n\n  stargazer = t.struct(\n    {\n      "login": t.string().rename("login"),\n      "user": github.get(\n        "/users/{user}",\n        t.struct({"user": t.string().from_parent("login")}),\n        t.struct({"name": t.string().optional()}),\n      ),\n    }\n  )\n\n  g.expose(\n    public,\n    stargazers=github.get(\n      "/repos/metatypedev/metatype/stargazers?per_page=2",\n      t.struct({}),\n      t.list(stargazer),\n    ),\n  )',path:"examples/typegraphs/graphql-server.py"}},42671:e=>{e.exports={content:'await typegraph({\n  name: "graphql-server",\n}, (g) => {\n  const pub = Policy.public();\n\n  const github = new HttpRuntime("https://api.github.com");\n\n  const stargazer = t.struct(\n    {\n      "login": t.string().rename("login"),\n      "user": github.get(\n        t.struct({ "user": t.string().fromParent("login") }),\n        t.struct({ "name": t.string().optional() }),\n        { path: "/users/{user}" },\n      ),\n    },\n  );\n\n  g.expose({\n    stargazers: github.get(\n      t.struct({}),\n      t.list(stargazer),\n      { path: "/repos/metatypedev/metatype/stargazers?per_page=2" },\n    ),\n  }, pub);\n});',path:"examples/typegraphs/graphql-server.ts"}}}]);
(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[8237],{68305:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>u,contentTitle:()=>r,default:()=>p,frontMatter:()=>o,metadata:()=>c,toc:()=>l});var i=n(86070),s=n(25710),a=n(65671);const o={},r="IAM gateway",c={id:"iam-provider/index",title:"IAM gateway",description:"An Identity and Access Management (IAM) gateway is a core component of the cloud computing ecosystems. It provide an efficient and secure way to manage authentification for user identities and their authorized privileges within a system.",source:"@site/use-cases/iam-provider/index.mdx",sourceDirName:"iam-provider",slug:"/iam-provider/",permalink:"/use-cases/iam-provider/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/iam-provider/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",previous:{title:"Composable GraphQL server",permalink:"/use-cases/graphql-server/"},next:{title:"Microservices orchestration",permalink:"/use-cases/microservice-orchestration/"}},u={},l=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}];function d(e){const t={h1:"h1",h2:"h2",img:"img",p:"p",...(0,s.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(t.h1,{id:"iam-gateway",children:"IAM gateway"}),"\n",(0,i.jsx)(t.p,{children:"An Identity and Access Management (IAM) gateway is a core component of the cloud computing ecosystems. It provide an efficient and secure way to manage authentification for user identities and their authorized privileges within a system."}),"\n",(0,i.jsx)(t.h2,{id:"case-study",children:"Case study"}),"\n",(0,i.jsx)("div",{className:"text-center md:float-right p-8",children:(0,i.jsx)(t.p,{children:(0,i.jsx)(t.img,{src:n(51916).A+""})})}),"\n",(0,i.jsx)(t.p,{children:"Suppose a developer is building a social media platform that allows users to post updates and view other users' profiles. The developer wants to ensure that only authenticated users can access the platform's resources, and that each user can only access their own data."}),"\n",(0,i.jsx)(t.p,{children:"To achieve this, the developer can use OAuth2 for user authentication and access control. OAuth2 allows users to log in using their Google or GitHub credentials, which are verified by Google or GitHub's IAM system. Once the user is authenticated, the social media platform can use OAuth2 to obtain an access token, which is used to authorize the user's access to the platform's resources."}),"\n",(0,i.jsx)(t.p,{children:"The social media platform can also use IAM to control access to resources based on user roles and permissions. For example, only authenticated users can access the platform's resources, and each user can only access their own data."}),"\n",(0,i.jsx)(t.h2,{id:"metatypes-solution",children:"Metatype's solution"}),"\n",(0,i.jsx)(t.p,{children:"Metatype comes with a built-in IAM gateway that can be used to manage user identities and their authorized privileges within a system. It supports any OpenID/OAuth2 providers and includes a list of pre-configured ones like Google, GitHub, Facebook, Twitter or LinkedIn. You can also use your own identity provider and rely on JSON Web Tokens (JWT) for authentication."}),"\n",(0,i.jsx)(t.p,{children:"Once the user is authenticated, you can use policy access based control (PBAC) to control access to resources based on user identifies and permissions. For example, only authenticated users can access the platform's resources, and each user can only access their own data. Policies can be defined by any function, and run on or off Metatype."}),"\n",(0,i.jsx)(a.A,{typegraph:"iam-provider",python:n(13507),typescript:n(15133),query:n(40603)})]})}function p(e={}){const{wrapper:t}={...(0,s.R)(),...e.components};return t?(0,i.jsx)(t,{...e,children:(0,i.jsx)(d,{...e})}):d(e)}},40603:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"loginUrl"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"context"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"username"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"logoutUrl"},arguments:[],directives:[]}]}}],loc:{start:0,end:64}};t.loc.source={body:"query {\n  loginUrl\n\n  context {\n    username\n  }\n\n  logoutUrl\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&t.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var i={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),i[e.name.value]=t}})),e.exports=t},51916:(e,t,n)=>{"use strict";n.d(t,{A:()=>i});const i=n.p+"assets/images/image.drawio-b3345f8611397f333ceac94ea774b2d3.svg"},13507:e=>{e.exports={content:'@typegraph(\n)\ndef iam_provider(g: Graph):\n  g.auth(Auth.oauth2_github("openid profile email"))\n\n  public = Policy.public()\n\n  deno = DenoRuntime()\n  host = environ.get("TG_URL", "http://localhost:7890")\n  url = f"{host}/iam-provider/auth/github?redirect_uri={quote_plus(host)}"\n\n  g.expose(\n    public,\n    loginUrl=deno.static(t.string(), url),\n    logoutUrl=deno.static(t.string(), f"{url}&clear"),\n    context=deno.func(\n      t.struct({}),\n      t.struct({"username": t.string()}).optional(),\n      code="(_, { context }) => Object.keys(context).length === 0 ? null : context",\n    ),\n  )',path:"examples/typegraphs/iam-provider.py"}},15133:e=>{e.exports={content:'typegraph(\n  {\n    name: "iam-provider",\n  },\n  (g) => {\n    g.auth(Auth.oauth2Github("openid profile email"));\n\n    const pub = Policy.public();\n\n    const deno = new DenoRuntime();\n    const host = getEnvOrDefault("TG_URL", "http://localhost:7890");\n    const url = `${host}/iam-provider/auth/github?redirect_uri=${encodeURIComponent(\n      host\n    )}`;\n\n    g.expose(\n      {\n        loginUrl: deno.static(t.string(), url),\n        logoutUrl: deno.static(t.string(), `${url}&clear`),\n        context: deno.func(\n          t.struct({}),\n          t.struct({ username: t.string() }).optional(),\n          {\n            code: "(_, { context }) => Object.keys(context).length === 0 ? null : context",\n          }\n        ),\n      },\n      pub\n    );\n  }\n);',path:"examples/typegraphs/iam-provider.ts"}}}]);
(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[8237],{84431:(e,t,s)=>{"use strict";s.r(t),s.d(t,{assets:()=>c,contentTitle:()=>o,default:()=>h,frontMatter:()=>r,metadata:()=>l,toc:()=>d});var n=s(13274),i=s(99128),a=s(11640);const r={},o="IAM gateway",l={id:"iam-provider/index",title:"IAM gateway",description:"An Identity and Access Management (IAM) gateway is a core component of the cloud computing ecosystems. It provide an efficient and secure way to manage authentification for user identities and their authorized privileges within a system.",source:"@site/use-cases/iam-provider/index.mdx",sourceDirName:"iam-provider",slug:"/iam-provider/",permalink:"/use-cases/iam-provider/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/iam-provider/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",previous:{title:"Composable GraphQL server",permalink:"/use-cases/graphql-server/"},next:{title:"Microservices orchestration",permalink:"/use-cases/microservice-orchestration/"}},c={},d=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}];function u(e){const t={h1:"h1",h2:"h2",img:"img",p:"p",...(0,i.R)(),...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(t.h1,{id:"iam-gateway",children:"IAM gateway"}),"\n",(0,n.jsx)(t.p,{children:"An Identity and Access Management (IAM) gateway is a core component of the cloud computing ecosystems. It provide an efficient and secure way to manage authentification for user identities and their authorized privileges within a system."}),"\n",(0,n.jsx)(t.h2,{id:"case-study",children:"Case study"}),"\n",(0,n.jsx)("div",{className:"text-center md:float-right p-8",children:(0,n.jsx)(t.p,{children:(0,n.jsx)(t.img,{src:s(86442).A+""})})}),"\n",(0,n.jsx)(t.p,{children:"Suppose a developer is building a social media platform that allows users to post updates and view other users' profiles. The developer wants to ensure that only authenticated users can access the platform's resources, and that each user can only access their own data."}),"\n",(0,n.jsx)(t.p,{children:"To achieve this, the developer can use OAuth2 for user authentication and access control. OAuth2 allows users to log in using their Google or GitHub credentials, which are verified by Google or GitHub's IAM system. Once the user is authenticated, the social media platform can use OAuth2 to obtain an access token, which is used to authorize the user's access to the platform's resources."}),"\n",(0,n.jsx)(t.p,{children:"The social media platform can also use IAM to control access to resources based on user roles and permissions. For example, only authenticated users can access the platform's resources, and each user can only access their own data."}),"\n",(0,n.jsx)(t.h2,{id:"metatypes-solution",children:"Metatype's solution"}),"\n",(0,n.jsx)(t.p,{children:"Metatype comes with a built-in IAM gateway that can be used to manage user identities and their authorized privileges within a system. It supports any OpenID/OAuth2 providers and includes a list of pre-configured ones like Google, GitHub, Facebook, Twitter or LinkedIn. You can also use your own identity provider and rely on JSON Web Tokens (JWT) for authentication."}),"\n",(0,n.jsx)(t.p,{children:"Once the user is authenticated, you can use policy access based control (PBAC) to control access to resources based on user identifies and permissions. For example, only authenticated users can access the platform's resources, and each user can only access their own data. Policies can be defined by any function, and run on or off Metatype."}),"\n",(0,n.jsx)(a.A,{typegraph:"iam-provider",python:s(13507),typescript:s(15133),query:s(7135)})]})}function h(e={}){const{wrapper:t}={...(0,i.R)(),...e.components};return t?(0,n.jsx)(t,{...e,children:(0,n.jsx)(u,{...e})}):u(e)}},26787:(e,t,s)=>{"use strict";s.d(t,{A:()=>b});var n=s(79474),i=s(80126),a=s(8035),r=s(84221),o=s(80872),l=s(3649),c=s(34077),d=s(13274);const u=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function h(e){const{queryEditor:t,variableEditor:s,headerEditor:i}=(0,c.mi)({nonNull:!0}),[a,r]=(0,n.useState)(e.defaultTab),o=(0,c.xb)({onCopyQuery:e.onCopyQuery}),l=(0,c.Ln)();return(0,n.useEffect)((()=>{s&&u(s)}),[a,s]),(0,n.useEffect)((()=>{i&&u(i)}),[a,i]),(0,n.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",u),u(t))}),[t]),(0,n.useEffect)((()=>{s&&(s.setOption("lineNumbers",!1),s.setOption("gutters",[]),s.on("change",u))}),[s]),(0,n.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("gutters",[]),i.on("change",u))}),[i]),(0,d.jsx)(c.m_.Provider,{children:(0,d.jsxs)("div",{className:"graphiql-editors",children:[(0,d.jsx)("section",{className:"graphiql-query-editor ","aria-label":"Query Editor",children:(0,d.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,d.jsx)(c.wY,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,d.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,d.jsx)(c.cl,{}),(0,d.jsx)(c.IB,{onClick:()=>l(),label:"Prettify query (Shift-Ctrl-P)",children:(0,d.jsx)(c.RG,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,d.jsx)(c.IB,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)",children:(0,d.jsx)(c.Td,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,d.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,d.jsx)("div",{className:("variables"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("variables"===a?"":"variables")},children:"Variables"}),(0,d.jsx)("div",{className:("headers"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("headers"===a?"":"headers")},children:"Headers"})]})}),(0,d.jsxs)("section",{className:"graphiql-editor-tool "+(a&&a.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===a?"Variables":"Headers",children:[(0,d.jsx)(c.G0,{editorTheme:e.editorTheme,isHidden:"variables"!==a,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,d.jsx)(c.B4,{editorTheme:e.editorTheme,isHidden:"headers"!==a,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class p{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=s(2222),g=s(82192),y=s(30947);function f(){return(0,c.Vm)({nonNull:!0}).isFetching?(0,d.jsx)(c.y$,{}):null}const x={typegraph:"Typegraph",playground:"Playground"};function v(e){let{typegraph:t,query:s,code:a,headers:u={},variables:v={},panel:b="",noTool:j=!1,defaultMode:k=null,disablePlayground:w=!1}=e;const{siteConfig:{customFields:{tgUrl:N}}}=(0,r.A)(),A=(0,n.useMemo)((()=>new p),[]),M=(0,n.useMemo)((()=>(0,i.a5)({url:`${N}/${t}`})),[]),[O,q]=(0,n.useState)(k),[C,T]=(0,g.e)();return(0,d.jsxs)("div",{className:"@container miniql mb-4",children:[k&&!w?(0,d.jsx)(m.mS,{choices:x,choice:O,onChange:q}):null,(0,d.jsxs)("div",{className:(k||w?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[w||!k||"typegraph"===O?(0,d.jsx)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0 relative",children:(0,d.jsx)(m.mS,{choices:{typescript:"Typescript",python:"Python"},choice:C,onChange:T,className:"ml-2",children:a?.map((e=>(0,d.jsxs)(y.A,{value:e.codeLanguage,children:[(0,d.jsxs)(l.A,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,className:"absolute top-0 right-0 m-2 p-1",children:[e?.codeFileUrl?.split("/").pop()," \u2197"]}),(0,d.jsx)(o.A,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content})]},e.codeLanguage)))})}):null,w||k&&"playground"!==O?null:(0,d.jsx)(c.ql,{fetcher:M,defaultQuery:s.loc?.source.body.trim(),defaultHeaders:JSON.stringify(u),shouldPersistHeaders:!0,variables:JSON.stringify(v),storage:A,children:(0,d.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,d.jsx)("div",{className:"flex-1 graphiql-session",children:(0,d.jsx)(h,{defaultTab:b,noTool:j})}),(0,d.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,d.jsx)(f,{}),(0,d.jsx)(c.ny,{})]})]})})]})]})}function b(e){return(0,d.jsx)(a.A,{fallback:(0,d.jsx)("div",{children:"Loading..."}),children:()=>(0,d.jsx)(v,{...e})})}},11640:(e,t,s)=>{"use strict";s.d(t,{A:()=>a});var n=s(26787),i=(s(79474),s(13274));function a(e){let{python:t,typescript:s,...a}=e;const r=[t&&{content:t.content,codeLanguage:"python",codeFileUrl:t.path},s&&{content:s.content,codeLanguage:"typescript",codeFileUrl:s.path}].filter((e=>!!e));return(0,i.jsx)(n.A,{code:0==r.length?void 0:r,...a})}},7135:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"loginUrl"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"context"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"username"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"logoutUrl"},arguments:[],directives:[]}]}}],loc:{start:0,end:64}};t.loc.source={body:"query {\n  loginUrl\n\n  context {\n    username\n  }\n\n  logoutUrl\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function s(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var n=e.type;"NamedType"===n.kind&&t.add(n.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){s(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){s(e,t)})),e.definitions&&e.definitions.forEach((function(e){s(e,t)}))}var n={};t.definitions.forEach((function(e){if(e.name){var t=new Set;s(e,t),n[e.name.value]=t}})),e.exports=t},86442:(e,t,s)=>{"use strict";s.d(t,{A:()=>n});const n=s.p+"assets/images/image.drawio-b3345f8611397f333ceac94ea774b2d3.svg"},13507:e=>{e.exports={content:"",path:"examples/typegraphs/iam-provider.py"}},15133:e=>{e.exports={content:'typegraph({\n  name: "iam-provider",\n}, (g) => {\n  g.auth(Auth.oauth2Github("openid profile email"));\n\n  const pub = Policy.public();\n\n  const deno = new DenoRuntime();\n  const host = getEnvOrDefault("TG_URL", "http://localhost:7890");\n  const url = `${host}/iam-provider/auth/github?redirect_uri=${\n    encodeURIComponent(host)\n  }`;\n\n  g.expose({\n    loginUrl: deno.static(t.string(), url),\n    logoutUrl: deno.static(t.string(), `${url}&clear`),\n    context: deno.func(\n      t.struct({}),\n      t.struct({ "username": t.string() }).optional(),\n      {\n        code:\n          "(_, { context }) => Object.keys(context).length === 0 ? null : context",\n      },\n    ),\n  }, pub);\n});',path:"examples/typegraphs/iam-provider.ts"}}}]);
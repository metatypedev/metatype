(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[8237],{89818:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>c,contentTitle:()=>o,default:()=>h,frontMatter:()=>r,metadata:()=>l,toc:()=>d});var s=n(13274),i=n(25618),a=n(89009);const r={},o="IAM gateway",l={id:"iam-provider/index",title:"IAM gateway",description:"An Identity and Access Management (IAM) gateway is a core component of the cloud computing ecosystems. It provide an efficient and secure way to manage authentification for user identities and their authorized privileges within a system.",source:"@site/use-cases/iam-provider/index.mdx",sourceDirName:"iam-provider",slug:"/iam-provider/",permalink:"/use-cases/iam-provider/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/iam-provider/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",previous:{title:"Composable GraphQL server",permalink:"/use-cases/graphql-server/"},next:{title:"Microservices orchestration",permalink:"/use-cases/microservice-orchestration/"}},c={},d=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}];function u(e){const t={h1:"h1",h2:"h2",img:"img",p:"p",...(0,i.R)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(t.h1,{id:"iam-gateway",children:"IAM gateway"}),"\n",(0,s.jsx)(t.p,{children:"An Identity and Access Management (IAM) gateway is a core component of the cloud computing ecosystems. It provide an efficient and secure way to manage authentification for user identities and their authorized privileges within a system."}),"\n",(0,s.jsx)(t.h2,{id:"case-study",children:"Case study"}),"\n",(0,s.jsx)("div",{className:"text-center md:float-right p-8",children:(0,s.jsx)(t.p,{children:(0,s.jsx)(t.img,{src:n(97806).A+""})})}),"\n",(0,s.jsx)(t.p,{children:"Suppose a developer is building a social media platform that allows users to post updates and view other users' profiles. The developer wants to ensure that only authenticated users can access the platform's resources, and that each user can only access their own data."}),"\n",(0,s.jsx)(t.p,{children:"To achieve this, the developer can use OAuth2 for user authentication and access control. OAuth2 allows users to log in using their Google or GitHub credentials, which are verified by Google or GitHub's IAM system. Once the user is authenticated, the social media platform can use OAuth2 to obtain an access token, which is used to authorize the user's access to the platform's resources."}),"\n",(0,s.jsx)(t.p,{children:"The social media platform can also use IAM to control access to resources based on user roles and permissions. For example, only authenticated users can access the platform's resources, and each user can only access their own data."}),"\n",(0,s.jsx)(t.h2,{id:"metatypes-solution",children:"Metatype's solution"}),"\n",(0,s.jsx)(t.p,{children:"Metatype comes with a built-in IAM gateway that can be used to manage user identities and their authorized privileges within a system. It supports any OpenID/OAuth2 providers and includes a list of pre-configured ones like Google, GitHub, Facebook, Twitter or LinkedIn. You can also use your own identity provider and rely on JSON Web Tokens (JWT) for authentication."}),"\n",(0,s.jsx)(t.p,{children:"Once the user is authenticated, you can use policy access based control (PBAC) to control access to resources based on user identifies and permissions. For example, only authenticated users can access the platform's resources, and each user can only access their own data. Policies can be defined by any function, and run on or off Metatype."}),"\n",(0,s.jsx)(a.A,{typegraph:"iam-provider",python:n(13507),typescript:n(15133),query:n(7135)})]})}function h(e={}){const{wrapper:t}={...(0,i.R)(),...e.components};return t?(0,s.jsx)(t,{...e,children:(0,s.jsx)(u,{...e})}):u(e)}},6381:(e,t,n)=>{"use strict";n.d(t,{m:()=>a});var s=n(79474),i=n(13274);function a(e){let{choices:t,choice:n,onChange:a,className:r,children:o}=e;const l=s.Children.toArray(o).map((e=>{if(!s.isValidElement(e)||!t[e.props?.value])throw new Error("ChoicePicker only accepts children with a value prop");return e})).find((e=>e.props?.value===n));return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)("ul",{className:`pl-0 m-0 list-none text-sm ${r??""}`,children:Object.entries(t).map((e=>{let[t,s]=e;return(0,i.jsx)("li",{className:"inline-block rounded-md overflow-clip my-2 mr-2",children:(0,i.jsx)("div",{children:(0,i.jsxs)("label",{className:"cursor-pointer",children:[(0,i.jsx)("input",{type:"radio",value:t,checked:t===n,onChange:()=>a(t),className:"hidden peer"}),(0,i.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:s})]})})},t)}))}),l]})}},40150:(e,t,n)=>{"use strict";n.d(t,{A:()=>b});var s=n(79474),i=n(355),a=n(28331),r=n(54629),o=n(81628),l=n(56617),c=n(61607),d=n(13274);const u=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function h(e){const{queryEditor:t,variableEditor:n,headerEditor:i}=(0,c.mi)({nonNull:!0}),[a,r]=(0,s.useState)(e.defaultTab),o=(0,c.xb)({onCopyQuery:e.onCopyQuery}),l=(0,c.Ln)();return(0,s.useEffect)((()=>{n&&u(n)}),[a,n]),(0,s.useEffect)((()=>{i&&u(i)}),[a,i]),(0,s.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",u),u(t))}),[t]),(0,s.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",u))}),[n]),(0,s.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("gutters",[]),i.on("change",u))}),[i]),(0,d.jsx)(c.m_.Provider,{children:(0,d.jsxs)("div",{className:"graphiql-editors",children:[(0,d.jsx)("section",{className:"graphiql-query-editor ","aria-label":"Query Editor",children:(0,d.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,d.jsx)(c.wY,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,d.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,d.jsx)(c.cl,{}),(0,d.jsx)(c.IB,{onClick:()=>l(),label:"Prettify query (Shift-Ctrl-P)",children:(0,d.jsx)(c.RG,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,d.jsx)(c.IB,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)",children:(0,d.jsx)(c.Td,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,d.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,d.jsx)("div",{className:("variables"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("variables"===a?"":"variables")},children:"Variables"}),(0,d.jsx)("div",{className:("headers"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("headers"===a?"":"headers")},children:"Headers"})]})}),(0,d.jsxs)("section",{className:"graphiql-editor-tool "+(a&&a.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===a?"Variables":"Headers",children:[(0,d.jsx)(c.G0,{editorTheme:e.editorTheme,isHidden:"variables"!==a,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,d.jsx)(c.B4,{editorTheme:e.editorTheme,isHidden:"headers"!==a,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class p{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=n(6381),g=n(62607),y=n(88341);function f(){return(0,c.Vm)({nonNull:!0}).isFetching?(0,d.jsx)(c.y$,{}):null}const x={typegraph:"Typegraph",playground:"Playground"};function v(e){let{typegraph:t,query:n,code:a,headers:u={},variables:v={},panel:b="",noTool:j=!1,defaultMode:k=null}=e;const{siteConfig:{customFields:{tgUrl:w}}}=(0,r.A)(),N=(0,s.useMemo)((()=>new p),[]),A=(0,s.useMemo)((()=>(0,i.a5)({url:`${w}/${t}`})),[]),[C,O]=(0,s.useState)(k),[M,q]=(0,g.e)();return console.log(a),(0,d.jsxs)("div",{className:"@container miniql mb-4",children:[k?(0,d.jsx)(m.m,{choices:x,choice:C,onChange:O}):null,(0,d.jsx)(c.ql,{fetcher:A,defaultQuery:n.loc?.source.body.trim(),defaultHeaders:JSON.stringify(u),shouldPersistHeaders:!0,variables:JSON.stringify(v),storage:N,children:(0,d.jsxs)("div",{className:(k?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[k&&"typegraph"!==C?null:(0,d.jsx)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0 relative",children:(0,d.jsx)(m.m,{choices:{typescript:"Typescript",python:"Python"},choice:M,onChange:q,className:"ml-2",children:a?.map((e=>(0,d.jsxs)(y.A,{value:e.codeLanguage,children:[(0,d.jsxs)(l.A,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,className:"absolute top-0 right-0 m-2 p-1",children:[e?.codeFileUrl?.split("/").pop()," \u2197"]}),(0,d.jsx)(o.A,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content})]},e.codeLanguage)))})}),k&&"playground"!==C?null:(0,d.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,d.jsx)("div",{className:"flex-1 graphiql-session",children:(0,d.jsx)(h,{defaultTab:b,noTool:j})}),(0,d.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,d.jsx)(f,{}),(0,d.jsx)(c.ny,{})]})]})]})})]})}function b(e){return(0,d.jsx)(a.A,{fallback:(0,d.jsx)("div",{children:"Loading..."}),children:()=>(0,d.jsx)(v,{...e})})}},89009:(e,t,n)=>{"use strict";n.d(t,{A:()=>a});var s=n(40150),i=(n(79474),n(13274));function a(e){let{python:t,typescript:n,...a}=e;const r=[t&&{content:t.content,codeLanguage:"python",codeFileUrl:t.path},n&&{content:n.content,codeLanguage:"typescript",codeFileUrl:n.path}].filter((e=>!!e));return(0,i.jsx)(s.A,{code:0==r.length?void 0:r,...a})}},62607:(e,t,n)=>{"use strict";n.d(t,{e:()=>h});var s=n(52264),i=n(52116),a=n(38710),r=n(17604),o=n(79474);const l="sdk",c=(0,r.N)(),d=(0,s.eU)((e=>e(c).searchParams?.get(l)),((e,t,n)=>{const s=e(c).searchParams??new URLSearchParams;s.set(l,n),t(c,(e=>({...e,searchParams:s})))})),u=(0,a.tG)(l,"typescript",(0,a.KU)((()=>sessionStorage)));function h(){const[e,t]=(0,i.fp)(d),[n,s]=(0,i.fp)(u);(0,o.useEffect)((()=>{e&&e!==n&&s(e)}),[e,s]);const a=(0,o.useCallback)((e=>{t(e),s(e)}),[t,s]);return[e??n,a]}},7135:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"loginUrl"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"context"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"username"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"logoutUrl"},arguments:[],directives:[]}]}}],loc:{start:0,end:64}};t.loc.source={body:"query {\n  loginUrl\n\n  context {\n    username\n  }\n\n  logoutUrl\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var s=e.type;"NamedType"===s.kind&&t.add(s.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var s={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),s[e.name.value]=t}})),e.exports=t},97806:(e,t,n)=>{"use strict";n.d(t,{A:()=>s});const s=n.p+"assets/images/image.drawio-b3345f8611397f333ceac94ea774b2d3.svg"},13507:e=>{e.exports={content:'@typegraph(\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n)\ndef iam_provider(g: Graph):\n  g.auth(Auth.oauth2_github("openid profile email"))\n\n  public = Policy.public()\n\n  deno = DenoRuntime()\n  host = environ.get("TG_URL", "http://localhost:7890")\n  url = f"{host}/iam-provider/auth/github?redirect_uri={quote_plus(host)}"\n\n  g.expose(\n    public,\n    loginUrl=deno.static(t.string(), url),\n    logoutUrl=deno.static(t.string(), f"{url}&clear"),\n    context=deno.func(\n      t.struct({}),\n      t.struct({"username": t.string()}).optional(),\n      code="(_, { context }) => Object.keys(context).length === 0 ? null : context",\n    ),\n  )',path:"examples/typegraphs/iam-provider.py"}},15133:e=>{e.exports={content:'await typegraph({\n  name: "iam-provider",\n}, (g) => {\n  g.auth(Auth.oauth2Github("openid profile email"));\n\n  const pub = Policy.public();\n\n  const deno = new DenoRuntime();\n  const host = getEnvOrDefault("TG_URL", "http://localhost:7890");\n  const url = `${host}/iam-provider/auth/github?redirect_uri=${\n    encodeURIComponent(host)\n  }`;\n\n  g.expose({\n    loginUrl: deno.static(t.string(), url),\n    logoutUrl: deno.static(t.string(), `${url}&clear`),\n    context: deno.func(\n      t.struct({}),\n      t.struct({ "username": t.string() }).optional(),\n      {\n        code:\n          "(_, { context }) => Object.keys(context).length === 0 ? null : context",\n      },\n    ),\n  }, pub);\n});',path:"examples/typegraphs/iam-provider.ts"}},25618:(e,t,n)=>{"use strict";n.d(t,{R:()=>r,x:()=>o});var s=n(79474);const i={},a=s.createContext(i);function r(e){const t=s.useContext(a);return s.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function o(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(i):e.components||i:r(e.components),s.createElement(a.Provider,{value:t},e.children)}}}]);
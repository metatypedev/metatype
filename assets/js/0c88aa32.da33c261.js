(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[1201],{74793:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>y,contentTitle:()=>p,default:()=>f,frontMatter:()=>u,metadata:()=>x,toc:()=>m});var i=n(13274),o=n(99128),a=n(11640),s=n(79474),r=n(3649),c=n(84221),d=n(8035);function h(e){let{name:t,typegraph:n}=e;const{siteConfig:{customFields:{tgUrl:o}}}=(0,c.A)(),[a,d]=(0,s.useState)(null),h=(0,s.useCallback)((async()=>{try{const e=await fetch(`${o}/${n}/auth/take`,{credentials:"include"}),{token:t}=await e.json();d(t)}catch{d("not token found")}}),[d,o]),l=`${o}/${n}/auth/${t}?redirect_uri=${encodeURIComponent(window.location.href)}`;return(0,i.jsxs)("p",{className:"mb-6",children:["Start the flow via ",(0,i.jsx)(r.A,{href:l,children:l})," and take token by clicking"," ",(0,i.jsx)(r.A,{className:"cursor-pointer",onClick:h,children:"here"}),":",(0,i.jsx)("br",{}),(0,i.jsx)("input",{className:"py-1 border-0 bg-slate-200 w-full",value:a??""})]})}const l=e=>(0,i.jsx)(d.A,{children:()=>(0,i.jsx)(h,{...e})}),u={},p="Authentication",x={id:"reference/typegate/authentication/index",title:"Authentication",description:'Authentication enable the typegate to identify the user making the request and share some contextual data (called later "context" or "claims"). This data can then be used by policies or injected into various fields. Authenticated requests must use the Authorization header to provide a token in one of the following format.',source:"@site/docs/reference/typegate/authentication/index.mdx",sourceDirName:"reference/typegate/authentication",slug:"/reference/typegate/authentication/",permalink:"/docs/reference/typegate/authentication/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/typegate/authentication/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Typegate",permalink:"/docs/reference/typegate/"},next:{title:"CORS",permalink:"/docs/reference/typegate/cors/"}},y={},m=[{value:"Basic authentication",id:"basic-authentication",level:2},{value:"JWT authentication",id:"jwt-authentication",level:2},{value:"OAuth2 authorization",id:"oauth2-authorization",level:2},{value:"Take flow",id:"take-flow",level:3},{value:"OpenID Connect",id:"openid-connect",level:3},{value:"Embedded providers",id:"embedded-providers",level:3}];function g(e){const t={a:"a",code:"code",h1:"h1",h2:"h2",h3:"h3",li:"li",ol:"ol",p:"p",pre:"pre",strong:"strong",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",...(0,o.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(t.h1,{id:"authentication",children:"Authentication"}),"\n",(0,i.jsxs)(t.p,{children:['Authentication enable the typegate to identify the user making the request and share some contextual data (called later "context" or "claims"). This data can then be used by policies or injected into various fields. Authenticated requests must use the ',(0,i.jsx)(t.code,{children:"Authorization"})," header to provide a token in one of the following format."]}),"\n",(0,i.jsx)(t.h2,{id:"basic-authentication",children:"Basic authentication"}),"\n",(0,i.jsxs)(t.p,{children:["Basic authentication is the simplest way to authenticate requests. It is done by sending a base64 encoded string of your username and password in the authorization header. Recall that base64 encoding is not encryption and can be easily reversed, thus ",(0,i.jsx)(t.strong,{children:"the traffic must be encrypted with SSL/TLS"})," when using basic authentication as your password will otherwise be visible."]}),"\n",(0,i.jsxs)(t.table,{children:[(0,i.jsx)(t.thead,{children:(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.th,{children:"Components"}),(0,i.jsx)(t.th,{children:"Values"})]})}),(0,i.jsxs)(t.tbody,{children:[(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:"Secrets"}),(0,i.jsx)(t.td,{children:(0,i.jsx)(t.code,{children:"BASIC_[username]=password"})})]}),(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:"Header"}),(0,i.jsx)(t.td,{children:(0,i.jsx)(t.code,{children:"Authorization: Basic base64(username:password)"})})]}),(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:"Context"}),(0,i.jsx)(t.td,{children:(0,i.jsx)(t.code,{children:"{ username }"})})]})]})]}),"\n",(0,i.jsx)(a.A,{typegraph:"basic_authentification",python:n(98422),typescript:n(63328),query:n(85903),headers:{Authorization:"Basic YWRtaW46cGFzc3dvcmQ="},tab:"headers"}),"\n",(0,i.jsx)(t.h2,{id:"jwt-authentication",children:"JWT authentication"}),"\n",(0,i.jsx)(t.p,{children:"A more secure way to authenticate requests is to use JSON Web Tokens. The context of a user is signed with a secret key and the typegate will verify the signature to ensure the context has not been tampered with. The JWT is then sent in the authorization header."}),"\n",(0,i.jsxs)(t.p,{children:["The JWT is usually generated by an external identity provider (IdP) such as Keycloak or Auth0 and limited in time. The typegate will check that the ",(0,i.jsx)(t.code,{children:"exp"})," (expiration time) and ",(0,i.jsx)(t.code,{children:"nbf"})," (not before) are valid if they exist in the context. The logic of refreshing expired tokens is left to the user or the IdP client library being used."]}),"\n",(0,i.jsxs)(t.p,{children:['The typegate supports the most frequently used algorithms for signing the JWT and can be imported as using "jwk", "raw", "pkcs8" or "spki" formats (see SubtleCrypto ',(0,i.jsx)(t.a,{href:"https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey",children:"documentation"}),").\nFor instance, an asymmetric key pair can be generated with the following command:"]}),"\n",(0,i.jsx)(t.pre,{children:(0,i.jsx)(t.code,{className:"language-typescript",children:'const keys = await crypto.subtle.generateKey(\n  { name: "ECDSA", namedCurve: "P-384" },\n  true,\n  ["sign", "verify"]\n);\nconst publicKey = await crypto.subtle.exportKey("jwk", keys.publicKey);\n// save keys.privateKey for later use\nconsole.log(JSON.stringify(publicKey));\n// in typegraph: Auth.jwt("keycloak", "jwk", {"name": "ECDSA", "namedCurve": "P-384"})\n'})}),"\n",(0,i.jsx)(t.p,{children:"Even though, asymmetric encryption is recommended, HMAC-SHA256 is so commonly used that an alias is provided for it."}),"\n",(0,i.jsxs)(t.table,{children:[(0,i.jsx)(t.thead,{children:(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.th,{children:"Components"}),(0,i.jsx)(t.th,{children:"Values"})]})}),(0,i.jsxs)(t.tbody,{children:[(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:"Secrets"}),(0,i.jsx)(t.td,{children:(0,i.jsx)(t.code,{children:"[authentication]_JWT=secret"})})]}),(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:"Header"}),(0,i.jsx)(t.td,{children:(0,i.jsx)(t.code,{children:"Authorization: Bearer token"})})]}),(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:"Context"}),(0,i.jsx)(t.td,{children:(0,i.jsx)(t.code,{children:"{ your_own_content }"})})]})]})]}),"\n",(0,i.jsx)(a.A,{typegraph:"jwt_authentification",python:n(90357),typescript:n(2067),query:n(15806),headers:{Authorization:"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ5b3VyX293bl9jb250ZW50IjoiY3VzdG9tLXJvbGUifQ.r7sR34FQSJbZTz8PNHbnQBXaRlK9Mo3BM5Rd9R8XuNQ"},tab:"headers"}),"\n",(0,i.jsx)(t.p,{children:"Note that for the sake of the demo, the token has no expiration time. Tokens should always be shorted lived and refreshed frequently to reduce the risk of unexpected access."}),"\n",(0,i.jsx)(t.h2,{id:"oauth2-authorization",children:"OAuth2 authorization"}),"\n",(0,i.jsx)(t.p,{children:"OAuth2 allows a user to grant limited access to their resources on one site, to another site, without having to expose their credentials. It is commonly used when the typegate needed to access restricted information in third-parties such as Google or GitHub."}),"\n",(0,i.jsx)(t.p,{children:"Most of the time, the OAuth2 is managed by your identity provider and relies on the JWT authentication as explained above. However the typegate provides a simple way to handle the OAuth2 flow without IdP or when the system should be lightweight."}),"\n",(0,i.jsxs)(t.table,{children:[(0,i.jsx)(t.thead,{children:(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.th,{children:"Components"}),(0,i.jsx)(t.th,{children:"Values"})]})}),(0,i.jsxs)(t.tbody,{children:[(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:"Secrets"}),(0,i.jsxs)(t.td,{children:[(0,i.jsx)(t.code,{children:"[authentication]_CLIENT_ID=client_id"}),", ",(0,i.jsx)(t.code,{children:"[authentication]_CLIENT_SECRET=client_secret"})]})]}),(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:"Header"}),(0,i.jsx)(t.td,{children:(0,i.jsx)(t.code,{children:"Authorization: Bearer token"})})]}),(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:"Context"}),(0,i.jsx)(t.td,{children:(0,i.jsx)(t.code,{children:"{ content_from_your_idp }"})})]})]})]}),"\n",(0,i.jsx)(t.h3,{id:"take-flow",children:"Take flow"}),"\n",(0,i.jsxs)(t.ol,{children:["\n",(0,i.jsxs)(t.li,{children:["\n",(0,i.jsxs)(t.p,{children:["Redirect the user to ",(0,i.jsx)(t.code,{children:"https://[typegate].metatype.cloud/[typegraph]/auth/[authentication]?redirect_uri=https://your-website.com/login"})," and the OAuth2 starts for the user"]}),"\n"]}),"\n",(0,i.jsxs)(t.li,{children:["\n",(0,i.jsxs)(t.p,{children:["When the user has completed the flow, the typegate will redirect the user to ",(0,i.jsx)(t.code,{children:"https://your-website.com/login"}),' and you can "take" the token from the typegate as follows. This can be only done once and is limited in time:']}),"\n"]}),"\n"]}),"\n",(0,i.jsx)(t.pre,{children:(0,i.jsx)(t.code,{className:"language-typescript",children:'const take = await fetch(\n  "https://[typegate].metatype.cloud/[typegraph]/auth/take",\n  {\n    credentials: "include",\n  }\n);\nconst { token } = await take.json();\n'})}),"\n",(0,i.jsxs)(t.ol,{start:"3",children:["\n",(0,i.jsxs)(t.li,{children:["The token can then be used as JWT in the ",(0,i.jsx)(t.code,{children:"Authorization"})," header of your requests, and the response of the typegate will contain a header ",(0,i.jsx)(t.code,{children:"Next-Authorization"}),". When this header is present, the value should be used in follow-up calls (value will be empty if the authentication has expired)."]}),"\n"]}),"\n",(0,i.jsx)(l,{name:"github",typegraph:"oauth2_authentication"}),"\n",(0,i.jsx)(a.A,{typegraph:"oauth2_authentication",python:n(2641),typescript:n(21383),query:n(73912),headers:{Authorization:"Bearer your-token"},tab:"headers"}),"\n",(0,i.jsx)(t.h3,{id:"openid-connect",children:"OpenID Connect"}),"\n",(0,i.jsxs)(t.p,{children:["OpenID Connect is an authentication layer on top of OAuth2. It is used to verify the identity of the user and retrieve basic information about them. You can add ",(0,i.jsx)(t.code,{children:"openid"})," to the OAuth2 scope and you will receive an ",(0,i.jsx)(t.code,{children:"id_token"})," in the response. The ",(0,i.jsx)(t.code,{children:"id_token"})," is a JWT that contains the user's information and is signed by the IdP."]}),"\n",(0,i.jsx)(t.h3,{id:"embedded-providers",children:"Embedded providers"}),"\n",(0,i.jsx)(t.p,{children:"Frequent OAuth2 providers are embedded and can be directly used in the typegraph."}),"\n",(0,i.jsx)(t.pre,{children:(0,i.jsx)(t.code,{children:'from typegraph.graph.auth import oauth2\noauth2.github("openid profile email")\n'})}),"\n",(0,i.jsxs)(t.p,{children:["The whole list is available ",(0,i.jsx)(t.a,{href:"https://github.com/metatypedev/metatype/blob/main/typegraph/python/typegraph/graph/auth/oauth2.py",children:"here"}),"."]})]})}function f(e={}){const{wrapper:t}={...(0,o.R)(),...e.components};return t?(0,i.jsx)(t,{...e,children:(0,i.jsx)(g,{...e})}):g(e)}},11640:(e,t,n)=>{"use strict";n.d(t,{A:()=>a});var i=n(76297),o=(n(79474),n(13274));function a(e){let{python:t,typescript:n,...a}=e;const s=[t&&{content:t.content,codeLanguage:"python",codeFileUrl:t.path},n&&{content:n.content,codeLanguage:"typescript",codeFileUrl:n.path}].filter((e=>!!e));return(0,o.jsx)(i.A,{code:0==s.length?void 0:s,...a})}},85903:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"get_context"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"username"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:43}};t.loc.source={body:"query {\n  get_context {\n    username\n  }\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&t.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var i={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),i[e.name.value]=t}})),e.exports=t},15806:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"get_context"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"your_own_content"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:51}};t.loc.source={body:"query {\n  get_context {\n    your_own_content\n  }\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&t.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var i={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),i[e.name.value]=t}})),e.exports=t},73912:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"get_context"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"exp"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:38}};t.loc.source={body:"query {\n  get_context {\n    exp\n  }\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&t.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var i={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),i[e.name.value]=t}})),e.exports=t},98422:e=>{e.exports={content:'@typegraph(\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n)\ndef basic_authentication(g: Graph):\n  deno = DenoRuntime()\n  public = Policy.public()\n\n  ctx = t.struct({"username": t.string().optional()})\n\n  # highlight-next-line\n  g.auth(Auth.basic(["admin"]))\n\n  g.expose(\n    public,\n    get_context=deno.identity(ctx).apply(\n      {\n        "username": g.from_context("username"),\n      }\n    ),\n  )',path:"examples/typegraphs/basic.py"}},63328:e=>{e.exports={content:'await typegraph({\n  name: "basic-authentication",\n}, (g) => {\n  const deno = new DenoRuntime();\n  const pub = Policy.public();\n\n  const ctx = t.struct({\n    "username": t.string().optional(),\n  });\n\n  // highlight-next-line\n  g.auth(Auth.basic(["admin"]));\n\n  g.expose({\n    get_context: deno.identity(ctx).apply({\n      username: g.fromContext("username"),\n    }).withPolicy(pub),\n  });\n});',path:"examples/typegraphs/basic.ts"}},90357:e=>{e.exports={content:'@typegraph(\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n)\ndef jwt_authentication(g: Graph):\n  deno = DenoRuntime()\n  public = Policy.public()\n\n  ctx = t.struct({"your_own_content": t.string().optional()})\n  # highlight-next-line\n  g.auth(Auth.hmac256("custom"))\n\n  g.expose(\n    get_context=deno.identity(ctx).apply(\n      {\n        "your_own_content": g.from_context(\n          "your_own_content"\n        ),\n      }\n    ),\n    default_policy=[public],\n  )',path:"examples/typegraphs/jwt.py"}},2067:e=>{e.exports={content:'typegraph({\n  name: "jwt-authentication",\n}, (g) => {\n  const deno = new DenoRuntime();\n  const pub = Policy.public();\n\n  const ctx = t.struct({\n    "your_own_content": t.string().optional(),\n  });\n  // highlight-next-line\n  g.auth(Auth.hmac256("custom"));\n\n  g.expose({\n    get_context: deno.identity(ctx).apply({\n      your_own_content: g.fromContext("your_own_content"),\n    }),\n  }, pub);\n});',path:"examples/typegraphs/jwt.ts"}},2641:e=>{e.exports={content:'@typegraph(\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n)\ndef oauth2_authentication(g: Graph):\n  deno = DenoRuntime()\n  public = Policy.public()\n\n  ctx = t.struct({"exp": t.integer().optional()})\n\n  # highlight-start\n  g.auth(Auth.oauth2_github("openid profile email"))\n  # highlight-end\n\n  g.expose(\n    public,\n    get_context=deno.identity(ctx).apply(\n      {\n        "exp": g.from_context("exp"),\n      }\n    ),\n  )',path:"examples/typegraphs/oauth2.py"}},21383:e=>{e.exports={content:'typegraph({\n  name: "oauth2-authentication",\n}, (g) => {\n  const deno = new DenoRuntime();\n  const pub = Policy.public();\n\n  const ctx = t.struct({ "exp": t.integer().optional() });\n\n  // highlight-start\n  g.auth(\n    Auth.oauth2Github("openid profile email"),\n  );\n  // highlight-end\n\n  g.expose({\n    get_context: deno.identity(ctx).apply({\n      exp: g.fromContext("exp"),\n    }),\n  }, pub);\n});',path:"examples/typegraphs/oauth2.ts"}}}]);
(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[7401],{29334:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>c,contentTitle:()=>l,default:()=>h,frontMatter:()=>a,metadata:()=>o,toc:()=>d});var s=t(13274),i=t(99128),r=t(65142);const a={},l="S3",o={id:"reference/runtimes/s3/index",title:"S3",description:"S3 runtime",source:"@site/docs/reference/runtimes/s3/index.mdx",sourceDirName:"reference/runtimes/s3",slug:"/reference/runtimes/s3/",permalink:"/docs/reference/runtimes/s3/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/runtimes/s3/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Random",permalink:"/docs/reference/runtimes/random/"},next:{title:"Temporal",permalink:"/docs/reference/runtimes/temporal/"}},c={},d=[{value:"S3 runtime",id:"s3-runtime",level:2}];function p(e){const n={h1:"h1",h2:"h2",...(0,i.R)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(n.h1,{id:"s3",children:"S3"}),"\n",(0,s.jsx)(n.h2,{id:"s3-runtime",children:"S3 runtime"}),"\n",(0,s.jsx)(r.Ay,{})]})}function h(e={}){const{wrapper:n}={...(0,i.R)(),...e.components};return n?(0,s.jsx)(n,{...e,children:(0,s.jsx)(p,{...e})}):p(e)}},65142:(e,n,t)=>{"use strict";t.d(n,{Ay:()=>c});var s=t(13274),i=t(99128),r=t(11640),a=t(86671),l=t(30947);t(80872);function o(e){const n={a:"a",code:"code",p:"p",pre:"pre",...(0,i.R)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.a,{href:"/docs/reference/runtimes/s3",children:"S3Runtime"})," can be used to interact with object storage APIs that are S3 compatible.\nObject storages like S3 are commonly used to cover app needs around large blob data like uploading and serving images.\nMost object storage services provide S3 compatible APIs including the open-source ",(0,s.jsx)(n.a,{href:"https://min.io/",children:"MinIO"})," engine which you can run locally for development."]}),"\n",(0,s.jsx)(n.p,{children:"For the following example, you'll need to setup your S3 compatible store first.\nThe following snippet can get you started using minio on docker compose:"}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-yaml",children:'services:\n  minio:\n    image: bitnami/minio:2022\n    platform: linux/amd64\n    restart: always\n    ports:\n      - "9000:9000"\n      - "9001:9001"\n    environment:\n      MINIO_REGION_NAME: local\n      MINIO_ROOT_USER: minio\n      MINIO_ROOT_PASSWORD: password\n      MINIO_DEFAULT_BUCKETS: "bucket:none"\n'})}),"\n",(0,s.jsxs)(n.p,{children:["We then provide the following secrets to our typegraph through ",(0,s.jsx)(n.code,{children:"metatype.yml"}),"."]}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-yml",children:'typegates:\n  dev:\n    secrets:\n      # ..\n      # replace "files-upload" by the name of your typegraph\n      files-upload:\n        S3_HOST: http://localhost:9000\n        S3_REGION: local\n        S3_ACCESS_KEY: minio\n        S3_SECRET_KEY: password\n        S3_PATH_STYLE: true\n'})}),"\n",(0,s.jsx)(n.p,{children:"Our typegraph will then look something like:"}),"\n",(0,s.jsxs)(a.Ay,{children:[(0,s.jsx)(l.A,{value:"typescript",children:(0,s.jsx)(r.A,{typegraph:"files-upload",typescript:t(89975),query:t(60424)})}),(0,s.jsx)(l.A,{value:"python",children:(0,s.jsx)(r.A,{typegraph:"files-upload",python:t(47937),query:t(60424)})})]}),"\n",(0,s.jsxs)(n.p,{children:["Peruse the ",(0,s.jsx)(n.a,{href:"/docs/reference/runtimes/s3",children:"reference"})," on the ",(0,s.jsx)(n.code,{children:"S3Runtime"})," for more information."]})]})}function c(e={}){const{wrapper:n}={...(0,i.R)(),...e.components};return n?(0,s.jsx)(n,{...e,children:(0,s.jsx)(o,{...e})}):o(e)}},26787:(e,n,t)=>{"use strict";t.d(n,{A:()=>b});var s=t(79474),i=t(80126),r=t(8035),a=t(84221),l=t(80872),o=t(3649),c=t(34077),d=t(13274);const p=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function h(e){const{queryEditor:n,variableEditor:t,headerEditor:i}=(0,c.mi)({nonNull:!0}),[r,a]=(0,s.useState)(e.defaultTab),l=(0,c.xb)({onCopyQuery:e.onCopyQuery}),o=(0,c.Ln)();return(0,s.useEffect)((()=>{t&&p(t)}),[r,t]),(0,s.useEffect)((()=>{i&&p(i)}),[r,i]),(0,s.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("extraKeys",{"Alt-G":()=>{n.replaceSelection("@")}}),n.setOption("gutters",[]),n.on("change",p),p(n))}),[n]),(0,s.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("gutters",[]),t.on("change",p))}),[t]),(0,s.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("gutters",[]),i.on("change",p))}),[i]),(0,d.jsx)(c.m_.Provider,{children:(0,d.jsxs)("div",{className:"graphiql-editors",children:[(0,d.jsx)("section",{className:"graphiql-query-editor ","aria-label":"Query Editor",children:(0,d.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,d.jsx)(c.wY,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,d.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,d.jsx)(c.cl,{}),(0,d.jsx)(c.IB,{onClick:()=>o(),label:"Prettify query (Shift-Ctrl-P)",children:(0,d.jsx)(c.RG,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,d.jsx)(c.IB,{onClick:()=>l(),label:"Copy query (Shift-Ctrl-C)",children:(0,d.jsx)(c.Td,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,d.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,d.jsx)("div",{className:("variables"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{a("variables"===r?"":"variables")},children:"Variables"}),(0,d.jsx)("div",{className:("headers"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{a("headers"===r?"":"headers")},children:"Headers"})]})}),(0,d.jsxs)("section",{className:"graphiql-editor-tool "+(r&&r.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===r?"Variables":"Headers",children:[(0,d.jsx)(c.G0,{editorTheme:e.editorTheme,isHidden:"variables"!==r,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,d.jsx)(c.B4,{editorTheme:e.editorTheme,isHidden:"headers"!==r,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class u{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,n){this.map.has(e)||(this.length+=1),this.map.set(e,n)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=t(2222),g=t(82192),y=t(30947);function f(){return(0,c.Vm)({nonNull:!0}).isFetching?(0,d.jsx)(c.y$,{}):null}const x={typegraph:"Typegraph",playground:"Playground"};function S(e){let{typegraph:n,query:t,code:r,headers:p={},variables:S={},panel:b="",noTool:j=!1,defaultMode:v=null,disablePlayground:k=!1}=e;const{siteConfig:{customFields:{tgUrl:E}}}=(0,a.A)(),N=(0,s.useMemo)((()=>new u),[]),O=(0,s.useMemo)((()=>(0,i.a5)({url:`${E}/${n}`})),[]),[_,T]=(0,s.useState)(v),[w,C]=(0,g.e)();return(0,d.jsxs)("div",{className:"@container miniql mb-4",children:[v?(0,d.jsx)(m.mS,{choices:x,choice:_,onChange:T}):null,(0,d.jsx)(c.ql,{fetcher:O,defaultQuery:t.loc?.source.body.trim(),defaultHeaders:JSON.stringify(p),shouldPersistHeaders:!0,variables:JSON.stringify(S),storage:N,children:(0,d.jsxs)("div",{className:(v?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[v&&"typegraph"!==_?null:(0,d.jsx)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0 relative",children:(0,d.jsx)(m.mS,{choices:{typescript:"Typescript",python:"Python"},choice:w,onChange:C,className:"ml-2",children:r?.map((e=>(0,d.jsxs)(y.A,{value:e.codeLanguage,children:[(0,d.jsxs)(o.A,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,className:"absolute top-0 right-0 m-2 p-1",children:[e?.codeFileUrl?.split("/").pop()," \u2197"]}),(0,d.jsx)(l.A,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content})]},e.codeLanguage)))})}),k||v&&"playground"!==_?null:(0,d.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,d.jsx)("div",{className:"flex-1 graphiql-session",children:(0,d.jsx)(h,{defaultTab:b,noTool:j})}),(0,d.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,d.jsx)(f,{}),(0,d.jsx)(c.ny,{})]})]})]})})]})}function b(e){return(0,d.jsx)(r.A,{fallback:(0,d.jsx)("div",{children:"Loading..."}),children:()=>(0,d.jsx)(S,{...e})})}},86671:(e,n,t)=>{"use strict";t.d(n,{Ay:()=>a,gc:()=>l});t(79474);var s=t(82192),i=t(2222),r=t(13274);function a(e){let{children:n}=e;const[t,a]=(0,s.e)();return(0,r.jsx)(i.mS,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,onChange:a,children:n})}function l(e){let{children:n}=e;const[t]=(0,s.e)();return(0,r.jsx)(i.q9,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,children:n})}},11640:(e,n,t)=>{"use strict";t.d(n,{A:()=>r});var s=t(26787),i=(t(79474),t(13274));function r(e){let{python:n,typescript:t,...r}=e;const a=[n&&{content:n.content,codeLanguage:"python",codeFileUrl:n.path},t&&{content:t.content,codeLanguage:"typescript",codeFileUrl:t.path}].filter((e=>!!e));return(0,i.jsx)(s.A,{code:0==a.length?void 0:a,...r})}},60424:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"listObjects"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"keys"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"key"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"size"},arguments:[],directives:[]}]}}]}}]}}],loc:{start:0,end:60}};n.loc.source={body:"{\n  listObjects{\n    keys{\n      key\n      size\n    }\n  }\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var s=e.type;"NamedType"===s.kind&&n.add(s.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var s={};n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),s[e.name.value]=n}})),e.exports=n},47937:e=>{e.exports={content:'from typegraph import typegraph, Policy, t, Graph\nfrom typegraph.providers.aws import S3Runtime\n\n# skip-next-line\nfrom typegraph.graph.params import Cors\n\n\n@typegraph(\n  name="files-upload",\n  # skip-next-line\n  cors=Cors(\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n)\ndef files_upload(g: Graph):\n  s3 = S3Runtime(\n    # we provide the name of the env vars\n    # the typegate will read from\n    "S3_HOST",\n    "S3_REGION",\n    "S3_ACCESS_KEY",\n    "S3_SECRET_KEY",\n    path_style_secret="S3_PATH_STYLE",\n  )\n\n  g.expose(\n    Policy.public(),\n    # we can then generate helpers for interacting with our runtime\n    listObjects=s3.list("bucket"),\n    getDownloadUrl=s3.presign_get("bucket"),\n    signUploadUrl=s3.presign_put("bucket"),\n    upload=s3.upload(\n      "bucket", t.file(allow=["image/png", "image/jpeg"])\n    ),\n    uploadMany=s3.upload_all("bucket"),\n  )',path:"examples/typegraphs/files-upload.py"}},89975:e=>{e.exports={content:'import { Policy, t, typegraph } from "@typegraph/sdk/index.js";\nimport { S3Runtime } from "@typegraph/sdk/providers/aws.js";\n\nawait typegraph({\n  name: "files-upload",\n}, (g) => {\n  const s3 = new S3Runtime({\n    hostSecret: "S3_HOST",\n    regionSecret: "S3_REGION",\n    accessKeySecret: "S3_ACCESS_KEY",\n    secretKeySecret: "S3_SECRET_KEY",\n    pathStyleSecret: "S3_PATH_STYLE",\n  });\n\n  g.expose({\n    listObjects: s3.list("bucket"),\n    getDownloadUrl: s3.presignGet({ bucket: "bucket" }),\n    signUploadUrl: s3.presignPut({ bucket: "bucket" }),\n    upload: s3.upload("bucket", t.file({ allow: ["image/png", "image/jpeg"] })),\n    uploadMany: s3.uploadAll("bucket"),\n  }, Policy.public());\n});',path:"examples/typegraphs/files-upload.ts"}}}]);
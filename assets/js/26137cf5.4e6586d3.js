(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[6530],{78526:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>d,contentTitle:()=>r,default:()=>u,frontMatter:()=>l,metadata:()=>o,toc:()=>p});var s=t(11527),a=t(63883),i=(t(3643),t(86117));const l={sidebar_position:50},r="Upload files to cloud storage",o={id:"guides/files-upload/index",title:"Upload files to cloud storage",description:"Typegraph",source:"@site/docs/guides/files-upload/index.mdx",sourceDirName:"guides/files-upload",slug:"/guides/files-upload/",permalink:"/docs/guides/files-upload/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/guides/files-upload/index.mdx",tags:[],version:"current",sidebarPosition:50,frontMatter:{sidebar_position:50},sidebar:"docs",previous:{title:"Run serverless functions",permalink:"/docs/guides/external-functions/"},next:{title:"Write REST endpoints",permalink:"/docs/guides/rest/"}},d={},p=[{value:"Typegraph",id:"typegraph",level:2},{value:"Uploading file using presigned url",id:"uploading-file-using-presigned-url",level:2},{value:"Uploading file using GraphQL multipart request",id:"uploading-file-using-graphql-multipart-request",level:2}];function c(e){const n={a:"a",code:"code",h1:"h1",h2:"h2",p:"p",pre:"pre",...(0,a.a)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(n.h1,{id:"upload-files-to-cloud-storage",children:"Upload files to cloud storage"}),"\n",(0,s.jsx)(n.h2,{id:"typegraph",children:"Typegraph"}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ini",children:"TG_RETREND_S3_HOST=http://localhost:9000\nTG_RETREND_S3_REGION=local\nTG_RETREND_S3_ACCESS_KEY=minio\nTG_RETREND_S3_SECRET_KEY=password\nTG_RETREND_S3_PATH_STYLE=true\n"})}),"\n",(0,s.jsx)(i.Z,{language:"python",children:t(25568).content}),"\n",(0,s.jsx)(n.h2,{id:"uploading-file-using-presigned-url",children:"Uploading file using presigned url"}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:'const image = await Deno.readFile("website/static/images/logo.png");\n\n// Get a presigned url\nconst {\n  data: { signUploadUrl: presigned },\n} = await fetch("http://localhost:7891/retrend", {\n  method: "POST",\n  body: JSON.stringify({\n    query: `\n        query SignUploadUrl($length: Int) {\n            signUploadUrl(length: $length, path: "my-super-image.png")\n        }\n    `,\n    variables: {\n      length: image.length,\n    },\n  }),\n}).then((r) => r.json());\n\n// Upload the file\nconst upload = await fetch(presigned, {\n  method: "PUT",\n  body: image,\n  headers: {\n    "content-type": "image/png",\n    "content-length": image.length,\n  },\n});\n\nconsole.log(upload.status);\n'})}),"\n",(0,s.jsx)(n.h2,{id:"uploading-file-using-graphql-multipart-request",children:"Uploading file using GraphQL multipart request"}),"\n",(0,s.jsxs)(n.p,{children:["Metatype supports\n",(0,s.jsx)(n.a,{href:"https://github.com/jaydenseric/graphql-multipart-request-spec",children:"GraphQL multipart request"}),"\nfor uploading files.\nYou may use one of the clients in this\n",(0,s.jsx)(n.a,{href:"https://github.com/jaydenseric/graphql-multipart-request-spec#client",children:"list"}),"\nthat support GraphQL multipart request."]}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:'const image = await Deno.readFile("website/static/images/logo.png");\n\nconst formData = new FormData();\nformData.append(\n  "operations",\n  JSON.stringify({\n    query: `\n        mutation UploadImage($file: Upload!) {\n            upload(file: $file) {\n                id\n                path\n                size\n                contentType\n            }\n        }\n    `,\n    variables: {\n      file: null,\n    },\n  })\n);\nformData.append("map", JSON.stringify({ 0: ["variables.file"] }));\nformData.append("0", image, "logo.png");\n\nconst upload = await fetch("http://localhost:7891/retrend", {\n  method: "POST",\n  body: formData,\n});\nconsole.log(await upload.json());\n'})})]})}function u(e={}){const{wrapper:n}={...(0,a.a)(),...e.components};return n?(0,s.jsx)(n,{...e,children:(0,s.jsx)(c,{...e})}):c(e)}},46153:(e,n,t)=>{"use strict";t.d(n,{r:()=>a});t(50959);var s=t(11527);function a(e){let{name:n,choices:t,choice:a,onChange:i,className:l}=e;return(0,s.jsx)("ul",{className:`pl-0 m-0 list-none w-full ${l??""}`,children:Object.entries(t).map((e=>{let[t,l]=e;return(0,s.jsx)("li",{className:"inline-block rounded-md overflow-clip mr-1",children:(0,s.jsx)("div",{children:(0,s.jsxs)("label",{className:"cursor-pointer",children:[(0,s.jsx)("input",{type:"radio",name:n,value:t,checked:t===a,onChange:()=>i(t),className:"hidden peer"}),(0,s.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:l})]})})},t)}))})}},48893:(e,n,t)=>{"use strict";t.d(n,{Z:()=>x});var s=t(50959),a=t(52691),i=t(45197),l=t(14899),r=t(86117),o=t(33961),d=t(11527);const p=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function c(e){const{queryEditor:n,variableEditor:t,headerEditor:a}=(0,o._i)({nonNull:!0}),[i,l]=(0,s.useState)(e.defaultTab),r=(0,o.Xd)({onCopyQuery:e.onCopyQuery}),c=(0,o.fE)();return(0,s.useEffect)((()=>{t&&p(t)}),[i,t]),(0,s.useEffect)((()=>{a&&p(a)}),[i,a]),(0,s.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("extraKeys",{"Alt-G":()=>{n.replaceSelection("@")}}),n.setOption("gutters",[]),n.on("change",p),p(n))}),[n]),(0,s.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("gutters",[]),t.on("change",p))}),[t]),(0,s.useEffect)((()=>{a&&(a.setOption("lineNumbers",!1),a.setOption("gutters",[]),a.on("change",p))}),[a]),(0,d.jsx)(o.u.Provider,{children:(0,d.jsxs)("div",{className:"graphiql-editors",children:[(0,d.jsx)("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor",children:(0,d.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,d.jsx)(o.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,d.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,d.jsx)(o._8,{}),(0,d.jsx)(o.wC,{onClick:()=>c(),label:"Prettify query (Shift-Ctrl-P)",children:(0,d.jsx)(o.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,d.jsx)(o.wC,{onClick:()=>r(),label:"Copy query (Shift-Ctrl-C)",children:(0,d.jsx)(o.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,d.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,d.jsx)("div",{className:("variables"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{l("variables"===i?"":"variables")},children:"Variables"}),(0,d.jsx)("div",{className:("headers"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{l("headers"===i?"":"headers")},children:"Headers"})]})}),(0,d.jsxs)("section",{className:"graphiql-editor-tool "+(i&&i.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===i?"Variables":"Headers",children:[(0,d.jsx)(o.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==i,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,d.jsx)(o.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==i,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class u{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,n){this.map.has(e)||(this.length+=1),this.map.set(e,n)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var h=t(46153);function g(){return(0,o.JB)({nonNull:!0}).isFetching?(0,d.jsx)(o.$j,{}):null}const m={typegraph:"Typegraph",playground:"Playground"};function f(e){let{typegraph:n,query:t,code:i,codeLanguage:p,codeFileUrl:f,headers:x={},variables:y={},tab:b="",noTool:j=!1,defaultMode:v=null}=e;const{siteConfig:{customFields:{tgUrl:N}}}=(0,l.Z)(),E=(0,s.useMemo)((()=>new u),[]),T=(0,s.useMemo)((()=>(0,a.nq)({url:`${N}/${n}`})),[]),[S,q]=(0,s.useState)(v);return(0,d.jsxs)("div",{className:"@container miniql mb-5",children:[v?(0,d.jsx)(h.r,{name:"mode",choices:m,choice:S,onChange:q,className:"mb-2"}):null,(0,d.jsx)(o.j$,{fetcher:T,defaultQuery:t.loc?.source.body.trim(),defaultHeaders:JSON.stringify(x),shouldPersistHeaders:!0,variables:JSON.stringify(y),storage:E,children:(0,d.jsxs)("div",{className:(v?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[v&&"typegraph"!==S?null:(0,d.jsxs)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0",children:[f?(0,d.jsxs)("div",{className:"p-2 text-xs font-light",children:["See/edit full code on"," ",(0,d.jsx)("a",{href:`https://github.com/metatypedev/metatype/blob/main/${f}`,children:f})]}):null,i?(0,d.jsx)(r.Z,{language:p,wrap:!0,className:"flex-1",children:i}):null]}),v&&"playground"!==S?null:(0,d.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,d.jsx)("div",{className:"flex-1 graphiql-session",children:(0,d.jsx)(c,{defaultTab:b,noTool:j})}),(0,d.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,d.jsx)(g,{}),(0,d.jsx)(o.iB,{})]})]})]})})]})}function x(e){return(0,d.jsx)(i.Z,{fallback:(0,d.jsx)("div",{children:"Loading..."}),children:()=>(0,d.jsx)(f,{...e})})}},3643:(e,n,t)=>{"use strict";t.d(n,{Z:()=>i});var s=t(48893),a=(t(50959),t(11527));function i(e){let{python:n,...t}=e;return(0,a.jsx)(s.Z,{code:n.content,codeLanguage:"python",codeFileUrl:n.path,...t})}},25568:e=>{e.exports={content:'from typegraph import typegraph, Policy, t, Graph\nfrom typegraph.providers.aws import S3Runtime\n\n\n@typegraph()\ndef retrend(g: Graph):\n  public = Policy.public()\n\n  s3 = S3Runtime(\n    "S3_HOST",\n    "S3_REGION",\n    "S3_ACCESS_KEY",\n    "S3_SECRET_KEY",\n    path_style_secret="S3_PATH_STYLE",\n  )\n\n  g.expose(\n    listObjects=s3.list("bucket"),\n    getDownloadUrl=s3.presign_get("bucket"),\n    signUploadUrl=s3.presign_put("bucket"),\n    upload=s3.upload(\n      "bucket", t.file(allow=["image/png", "image/jpeg"])\n    ),\n    uploadMany=s3.upload_all("bucket"),\n    default_policy=[public],\n  )',path:"website/docs/guides/files-upload/t.py"}}}]);
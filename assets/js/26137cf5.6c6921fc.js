(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[6530],{17942:(e,t,n)=>{"use strict";n.d(t,{Zo:()=>c,kt:()=>g});var a=n(50959);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function l(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?l(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):l(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function o(e,t){if(null==e)return{};var n,a,r=function(e,t){if(null==e)return{};var n,a,r={},l=Object.keys(e);for(a=0;a<l.length;a++)n=l[a],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(a=0;a<l.length;a++)n=l[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var s=a.createContext({}),p=function(e){var t=a.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):i(i({},t),e)),n},c=function(e){var t=p(e.components);return a.createElement(s.Provider,{value:t},e.children)},u="mdxType",d={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},m=a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,l=e.originalType,s=e.parentName,c=o(e,["components","mdxType","originalType","parentName"]),u=p(n),m=r,g=u["".concat(s,".").concat(m)]||u[m]||d[m]||l;return n?a.createElement(g,i(i({ref:t},c),{},{components:n})):a.createElement(g,i({ref:t},c))}));function g(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var l=n.length,i=new Array(l);i[0]=m;var o={};for(var s in t)hasOwnProperty.call(t,s)&&(o[s]=t[s]);o.originalType=e,o[u]="string"==typeof e?e:r,i[1]=o;for(var p=2;p<l;p++)i[p]=n[p];return a.createElement.apply(null,i)}return a.createElement.apply(null,n)}m.displayName="MDXCreateElement"},3199:(e,t,n)=>{"use strict";n.d(t,{r:()=>r});var a=n(50959);function r(e){let{name:t,choices:n,choice:r,onChange:l,className:i}=e;return a.createElement("ul",{className:`pl-0 m-0 list-none w-full ${i??""}`},Object.entries(n).map((e=>{let[n,i]=e;return a.createElement("li",{key:n,className:"inline-block rounded-md overflow-clip mr-1"},a.createElement("div",null,a.createElement("label",{className:"cursor-pointer"},a.createElement("input",{type:"radio",name:t,value:n,checked:n===r,onChange:()=>l(n),className:"hidden peer"}),a.createElement("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white"},i))))})))}},53553:(e,t,n)=>{"use strict";n.d(t,{Z:()=>f});var a=n(50959),r=n(67243),l=n(66108),i=n(84318),o=n(23560),s=n(30391);const p=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function c(e){const{queryEditor:t,variableEditor:n,headerEditor:r}=(0,s._i)({nonNull:!0}),[l,i]=(0,a.useState)(e.defaultTab),o=(0,s.Xd)({onCopyQuery:e.onCopyQuery}),c=(0,s.fE)();return(0,a.useEffect)((()=>{n&&p(n)}),[l,n]),(0,a.useEffect)((()=>{r&&p(r)}),[l,r]),(0,a.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("extraKeys",{"Alt-G":()=>{t.replaceSelection("@")}}),t.setOption("gutters",[]),t.on("change",p),p(t))}),[t]),(0,a.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",p))}),[n]),(0,a.useEffect)((()=>{r&&(r.setOption("lineNumbers",!1),r.setOption("gutters",[]),r.on("change",p))}),[r]),a.createElement(s.u.Provider,null,a.createElement("div",{className:"graphiql-editors"},a.createElement("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor"},a.createElement("div",{className:"graphiql-query-editor-wrapper"},a.createElement(s.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),a.createElement("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands"},a.createElement(s._8,null),a.createElement(s.wC,{onClick:()=>c(),label:"Prettify query (Shift-Ctrl-P)"},a.createElement(s.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})),a.createElement(s.wC,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)"},a.createElement(s.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"}))))),e.noTool?null:a.createElement(a.Fragment,null,a.createElement("div",{className:"graphiql-editor-tools p-0 text-sm "},a.createElement("div",{className:"graphiql-editor-tools-tabs"},a.createElement("div",{className:("variables"===l?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{i("variables"===l?"":"variables")}},"Variables"),a.createElement("div",{className:("headers"===l?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{i("headers"===l?"":"headers")}},"Headers"))),a.createElement("section",{className:"graphiql-editor-tool "+(l&&l.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===l?"Variables":"Headers"},a.createElement(s.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==l,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),a.createElement(s.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==l,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})))))}class u{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var d=n(3199);function m(){return(0,s.JB)({nonNull:!0}).isFetching?a.createElement(s.$j,null):null}const g={typegraph:"Typegraph",playground:"Playground"};function h(e){let{typegraph:t,query:n,code:l,codeLanguage:p,codeFileUrl:h,headers:f={},variables:y={},tab:E="",noTool:b=!1,defaultMode:v=null}=e;const{siteConfig:{customFields:{tgUrl:N}}}=(0,i.Z)(),O=(0,a.useMemo)((()=>new u),[]),T=(0,a.useMemo)((()=>(0,r.nq)({url:`${N}/${t}`})),[]),[k,w]=(0,a.useState)(v);return a.createElement("div",{className:"@container miniql mb-5"},v?a.createElement(d.r,{name:"mode",choices:g,choice:k,onChange:w,className:"mb-2"}):null,a.createElement(s.j$,{fetcher:T,defaultQuery:n.loc?.source.body.trim(),defaultHeaders:JSON.stringify(f),shouldPersistHeaders:!0,variables:JSON.stringify(y),storage:O},a.createElement("div",{className:(v?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first"},v&&"typegraph"!==k?null:a.createElement("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0"},h?a.createElement("div",{className:"p-2 text-xs font-light"},"See/edit full code on"," ",a.createElement("a",{href:`https://github.com/metatypedev/metatype/blob/main/${h}`},h)):null,l?a.createElement(o.Z,{language:p,wrap:!0,className:"flex-1"},l):null),v&&"playground"!==k?null:a.createElement("div",{className:"flex flex-col graphiql-container"},a.createElement("div",{className:"flex-1 graphiql-session"},a.createElement(c,{defaultTab:E,noTool:b})),a.createElement("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg"},a.createElement(m,null),a.createElement(s.iB,null))))))}function f(e){return a.createElement(l.Z,{fallback:a.createElement("div",null,"Loading...")},(()=>a.createElement(h,e)))}},6809:(e,t,n)=>{"use strict";n.d(t,{Z:()=>i});var a=n(52319),r=n(53553),l=n(50959);function i(e){let{python:t,...n}=e;return l.createElement(r.Z,(0,a.Z)({code:t.content,codeLanguage:"python",codeFileUrl:t.path},n))}},56914:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>p,contentTitle:()=>o,default:()=>m,frontMatter:()=>i,metadata:()=>s,toc:()=>c});var a=n(52319),r=(n(50959),n(17942)),l=(n(6809),n(23560));const i={},o="Uploading files to S3",s={unversionedId:"guides/files-upload/index",id:"guides/files-upload/index",title:"Uploading files to S3",description:"Typegraph",source:"@site/docs/guides/files-upload/index.mdx",sourceDirName:"guides/files-upload",slug:"/guides/files-upload/",permalink:"/docs/guides/files-upload/",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/guides/files-upload/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Using external functions",permalink:"/docs/guides/external-functions/"},next:{title:"Importing graphql definitions",permalink:"/docs/guides/importing-graphql-definitions/"}},p={},c=[{value:"Typegraph",id:"typegraph",level:2},{value:"Uploading file using presigned url",id:"uploading-file-using-presigned-url",level:2},{value:"Uploading file using GraphQL multipart request",id:"uploading-file-using-graphql-multipart-request",level:2}],u={toc:c},d="wrapper";function m(e){let{components:t,...i}=e;return(0,r.kt)(d,(0,a.Z)({},u,i,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("h1",{id:"uploading-files-to-s3"},"Uploading files to S3"),(0,r.kt)("h2",{id:"typegraph"},"Typegraph"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-ini"},"TG_RETREND_S3_HOST=http://localhost:9000\nTG_RETREND_S3_REGION=local\nTG_RETREND_S3_ACCESS_KEY=minio\nTG_RETREND_S3_SECRET_KEY=password\nTG_RETREND_S3_PATH_STYLE=true\n")),(0,r.kt)(l.Z,{language:"python",mdxType:"CodeBlock"},n(25568).content),(0,r.kt)("h2",{id:"uploading-file-using-presigned-url"},"Uploading file using presigned url"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-ts"},'const image = await Deno.readFile("website/static/images/logo.png");\n\n// Get a presigned url\nconst {\n  data: { signUploadUrl: presigned },\n} = await fetch("http://localhost:7891/retrend", {\n  method: "POST",\n  body: JSON.stringify({\n    query: `\n        query SignUploadUrl($length: Int) {\n            signUploadUrl(length: $length, path: "my-super-image.png")\n        }\n    `,\n    variables: {\n      length: image.length,\n    },\n  }),\n}).then((r) => r.json());\n\n// Upload the file\nconst upload = await fetch(presigned, {\n  method: "PUT",\n  body: image,\n  headers: {\n    "content-type": "image/png",\n    "content-length": image.length,\n  },\n});\n\nconsole.log(upload.status);\n')),(0,r.kt)("h2",{id:"uploading-file-using-graphql-multipart-request"},"Uploading file using GraphQL multipart request"),(0,r.kt)("p",null,"Metatype supports\n",(0,r.kt)("a",{parentName:"p",href:"https://github.com/jaydenseric/graphql-multipart-request-spec"},"GraphQL multipart request"),"\nfor uploading files.\nYou may use one of the clients in this\n",(0,r.kt)("a",{parentName:"p",href:"https://github.com/jaydenseric/graphql-multipart-request-spec#client"},"list"),"\nthat support GraphQL multipart request."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-ts"},'const image = await Deno.readFile("website/static/images/logo.png");\n\nconst formData = new FormData();\nformData.append(\n  "operations",\n  JSON.stringify({\n    query: `\n        mutation UploadImage($file: Upload!) {\n            upload(file: $file) {\n                id\n                path\n                size\n                contentType\n            }\n        }\n    `,\n    variables: {\n      file: null,\n    },\n  })\n);\nformData.append("map", JSON.stringify({ 0: ["variables.file"] }));\nformData.append("0", image, "logo.png");\n\nconst upload = await fetch("http://localhost:7891/retrend", {\n  method: "POST",\n  body: formData,\n});\nconsole.log(await upload.json());\n')))}m.isMDXComponent=!0},25568:e=>{e.exports={content:'from typegraph import TypeGraph, policies, t\nfrom typegraph.providers.aws.runtimes.s3 import S3Runtime\n\nwith TypeGraph(\n  "retrend",\n) as g:\n  public = policies.public()\n\n  s3 = S3Runtime(\n    "S3_HOST",\n    "S3_REGION",\n    "S3_ACCESS_KEY",\n    "S3_SECRET_KEY",\n    path_style_secret="S3_PATH_STYLE",\n  )\n\n  g.expose(\n    listObjects=s3.list("bucket"),\n    getDownloadUrl=s3.presign_get("bucket"),\n    signUploadUrl=s3.presign_put("bucket"),\n    upload=s3.upload(\n      "bucket", t.file().allow(["image/png", "image/jpeg"])\n    ),\n    uploadMany=s3.upload_all("bucket"),\n    default_policy=[public],\n  )',path:"website/docs/guides/files-upload/t.py"}}}]);
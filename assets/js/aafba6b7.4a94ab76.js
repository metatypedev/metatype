"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[9048],{17942:(e,t,r)=>{r.d(t,{Zo:()=>s,kt:()=>d});var n=r(50959);function a(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function i(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function o(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?i(Object(r),!0).forEach((function(t){a(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):i(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function l(e,t){if(null==e)return{};var r,n,a=function(e,t){if(null==e)return{};var r,n,a={},i=Object.keys(e);for(n=0;n<i.length;n++)r=i[n],t.indexOf(r)>=0||(a[r]=e[r]);return a}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(n=0;n<i.length;n++)r=i[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(a[r]=e[r])}return a}var c=n.createContext({}),p=function(e){var t=n.useContext(c),r=t;return e&&(r="function"==typeof e?e(t):o(o({},t),e)),r},s=function(e){var t=p(e.components);return n.createElement(c.Provider,{value:t},e.children)},u="mdxType",f={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},m=n.forwardRef((function(e,t){var r=e.components,a=e.mdxType,i=e.originalType,c=e.parentName,s=l(e,["components","mdxType","originalType","parentName"]),u=p(r),m=a,d=u["".concat(c,".").concat(m)]||u[m]||f[m]||i;return r?n.createElement(d,o(o({ref:t},s),{},{components:r})):n.createElement(d,o({ref:t},s))}));function d(e,t){var r=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var i=r.length,o=new Array(i);o[0]=m;var l={};for(var c in t)hasOwnProperty.call(t,c)&&(l[c]=t[c]);l.originalType=e,l[u]="string"==typeof e?e:a,o[1]=l;for(var p=2;p<i;p++)o[p]=r[p];return n.createElement.apply(null,o)}return n.createElement.apply(null,r)}m.displayName="MDXCreateElement"},55542:(e,t,r)=>{r.r(t),r.d(t,{assets:()=>c,contentTitle:()=>o,default:()=>f,frontMatter:()=>i,metadata:()=>l,toc:()=>p});var n=r(60795),a=(r(50959),r(17942));const i={},o="Configuration file",l={unversionedId:"reference/meta-cli/configuration-file",id:"reference/meta-cli/configuration-file",title:"Configuration file",description:"metatype.yml Example file",source:"@site/docs/reference/meta-cli/configuration-file.mdx",sourceDirName:"reference/meta-cli",slug:"/reference/meta-cli/configuration-file",permalink:"/docs/reference/meta-cli/configuration-file",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/meta-cli/configuration-file.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Meta CLI",permalink:"/docs/reference/meta-cli"},next:{title:"Typegraph",permalink:"/docs/reference/typegraph/python"}},c={},p=[{value:"<code>metatype.yml</code> Example file",id:"metatypeyml-example-file",level:2},{value:"Automatic secret loading support",id:"automatic-secret-loading-support",level:2}],s={toc:p},u="wrapper";function f(e){let{components:t,...r}=e;return(0,a.kt)(u,(0,n.Z)({},s,r,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("h1",{id:"configuration-file"},"Configuration file"),(0,a.kt)("h2",{id:"metatypeyml-example-file"},(0,a.kt)("inlineCode",{parentName:"h2"},"metatype.yml")," Example file"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-yaml"},'typegates:\n  dev:\n    url: http://localhost:7890\n    username: admin\n    password: password\n\ntypegraphs:\n  python:\n    include: "**/*.py"\n  materializers:\n    prisma:\n      migrations_path: "migrations"\n')),(0,a.kt)("h2",{id:"automatic-secret-loading-support"},"Automatic secret loading support"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"https://github.com/zifeo/lade"},"Lade")," is a secret loading tool that transparently inject environment variables from a variety of sources. It works with Fish, Bash or Zsh and currently supports Doppler, Infisical and 1Password as vault source."),(0,a.kt)("p",null,"To use Lade with Metatype, you can use the ",(0,a.kt)("inlineCode",{parentName:"p"},"op://"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"infisical://")," or ",(0,a.kt)("inlineCode",{parentName:"p"},"doppler://")," prefixes in your configuration file. It will then use the CLI of the vault to securely load the required secrets. For example:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre"},"typegates:\n  dev:\n    url: http://localhost:7890\n    username: op://VAULT_NAME/SECRET_NAME/FIELD_NAME\n    password: infisical://app.infisical.com/PROJECT_NAME/ENV_NAME/SECRET_NAME\n")))}f.isMDXComponent=!0}}]);
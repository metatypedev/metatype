"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[3330],{17942:(e,t,r)=>{r.d(t,{Zo:()=>m,kt:()=>d});var n=r(50959);function a(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function p(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function i(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?p(Object(r),!0).forEach((function(t){a(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):p(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function o(e,t){if(null==e)return{};var r,n,a=function(e,t){if(null==e)return{};var r,n,a={},p=Object.keys(e);for(n=0;n<p.length;n++)r=p[n],t.indexOf(r)>=0||(a[r]=e[r]);return a}(e,t);if(Object.getOwnPropertySymbols){var p=Object.getOwnPropertySymbols(e);for(n=0;n<p.length;n++)r=p[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(a[r]=e[r])}return a}var s=n.createContext({}),l=function(e){var t=n.useContext(s),r=t;return e&&(r="function"==typeof e?e(t):i(i({},t),e)),r},m=function(e){var t=l(e.components);return n.createElement(s.Provider,{value:t},e.children)},c="mdxType",u={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},y=n.forwardRef((function(e,t){var r=e.components,a=e.mdxType,p=e.originalType,s=e.parentName,m=o(e,["components","mdxType","originalType","parentName"]),c=l(r),y=a,d=c["".concat(s,".").concat(y)]||c[y]||u[y]||p;return r?n.createElement(d,i(i({ref:t},m),{},{components:r})):n.createElement(d,i({ref:t},m))}));function d(e,t){var r=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var p=r.length,i=new Array(p);i[0]=y;var o={};for(var s in t)hasOwnProperty.call(t,s)&&(o[s]=t[s]);o.originalType=e,o[c]="string"==typeof e?e:a,i[1]=o;for(var l=2;l<p;l++)i[l]=r[l];return n.createElement.apply(null,i)}return n.createElement.apply(null,r)}y.displayName="MDXCreateElement"},7227:(e,t,r)=>{r.r(t),r.d(t,{assets:()=>s,contentTitle:()=>i,default:()=>u,frontMatter:()=>p,metadata:()=>o,toc:()=>l});var n=r(87366),a=(r(50959),r(17942));const p={sidebar_label:"prisma",title:"typegraph.providers.prisma.runtimes.prisma"},i=void 0,o={unversionedId:"reference/typegraph/python/typegraph/providers/prisma/runtimes/prisma",id:"reference/typegraph/python/typegraph/providers/prisma/runtimes/prisma",title:"typegraph.providers.prisma.runtimes.prisma",description:"PrismaRuntime Objects",source:"@site/docs/reference/typegraph/python/typegraph/providers/prisma/runtimes/prisma.md",sourceDirName:"reference/typegraph/python/typegraph/providers/prisma/runtimes",slug:"/reference/typegraph/python/typegraph/providers/prisma/runtimes/prisma",permalink:"/docs/reference/typegraph/python/typegraph/providers/prisma/runtimes/prisma",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/typegraph/python/typegraph/providers/prisma/runtimes/prisma.md",tags:[],version:"current",frontMatter:{sidebar_label:"prisma",title:"typegraph.providers.prisma.runtimes.prisma"},sidebar:"docs",previous:{title:"relations",permalink:"/docs/reference/typegraph/python/typegraph/providers/prisma/relations"},next:{title:"schema",permalink:"/docs/reference/typegraph/python/typegraph/providers/prisma/schema"}},s={},l=[{value:"PrismaRuntime Objects",id:"prismaruntime-objects",level:2},{value:"link",id:"link",level:4}],m={toc:l},c="wrapper";function u(e){let{components:t,...r}=e;return(0,a.kt)(c,(0,n.Z)({},m,r,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("h2",{id:"prismaruntime-objects"},"PrismaRuntime Objects"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-python"},"@frozen\nclass PrismaRuntime(Runtime)\n")),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"https://metatype.dev/docs/reference/runtimes/prisma"},"Documentation")),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},"Attributes"),":"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"name")," - Name of prisma runtime"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"connection_string_secret")," - Name of the secret that contains the connection string\nthat will be used to connect to the database")),(0,a.kt)("h4",{id:"link"},"link"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-python"},"def link(typ: Union[t.TypeNode, str],\n         name: Optional[str] = None,\n         *,\n         field: Optional[str] = None,\n         fkey: Optional[bool] = None) -> t.TypeNode\n")),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},"Arguments"),":"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"name")," - name of the relationship"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"field")," - name of the target field on the target model")))}u.isMDXComponent=!0}}]);
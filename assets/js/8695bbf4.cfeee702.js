"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[2095],{17942:(e,r,t)=>{t.d(r,{Zo:()=>l,kt:()=>f});var n=t(50959);function p(e,r,t){return r in e?Object.defineProperty(e,r,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[r]=t,e}function a(e,r){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);r&&(n=n.filter((function(r){return Object.getOwnPropertyDescriptor(e,r).enumerable}))),t.push.apply(t,n)}return t}function o(e){for(var r=1;r<arguments.length;r++){var t=null!=arguments[r]?arguments[r]:{};r%2?a(Object(t),!0).forEach((function(r){p(e,r,t[r])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):a(Object(t)).forEach((function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r))}))}return e}function i(e,r){if(null==e)return{};var t,n,p=function(e,r){if(null==e)return{};var t,n,p={},a=Object.keys(e);for(n=0;n<a.length;n++)t=a[n],r.indexOf(t)>=0||(p[t]=e[t]);return p}(e,r);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(n=0;n<a.length;n++)t=a[n],r.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(p[t]=e[t])}return p}var c=n.createContext({}),s=function(e){var r=n.useContext(c),t=r;return e&&(t="function"==typeof e?e(r):o(o({},r),e)),t},l=function(e){var r=s(e.components);return n.createElement(c.Provider,{value:r},e.children)},m="mdxType",y={inlineCode:"code",wrapper:function(e){var r=e.children;return n.createElement(n.Fragment,{},r)}},h=n.forwardRef((function(e,r){var t=e.components,p=e.mdxType,a=e.originalType,c=e.parentName,l=i(e,["components","mdxType","originalType","parentName"]),m=s(t),h=p,f=m["".concat(c,".").concat(h)]||m[h]||y[h]||a;return t?n.createElement(f,o(o({ref:r},l),{},{components:t})):n.createElement(f,o({ref:r},l))}));function f(e,r){var t=arguments,p=r&&r.mdxType;if("string"==typeof e||p){var a=t.length,o=new Array(a);o[0]=h;var i={};for(var c in r)hasOwnProperty.call(r,c)&&(i[c]=r[c]);i.originalType=e,i[m]="string"==typeof e?e:p,o[1]=i;for(var s=2;s<a;s++)o[s]=t[s];return n.createElement.apply(null,o)}return n.createElement.apply(null,t)}h.displayName="MDXCreateElement"},52065:(e,r,t)=>{t.r(r),t.d(r,{assets:()=>c,contentTitle:()=>o,default:()=>y,frontMatter:()=>a,metadata:()=>i,toc:()=>s});var n=t(60795),p=(t(50959),t(17942));const a={sidebar_label:"schema",title:"typegraph.providers.prisma.schema"},o=void 0,i={unversionedId:"reference/typegraph/python/typegraph/providers/prisma/schema",id:"reference/typegraph/python/typegraph/providers/prisma/schema",title:"typegraph.providers.prisma.schema",description:"SchemaField Objects",source:"@site/docs/reference/typegraph/python/typegraph/providers/prisma/schema.md",sourceDirName:"reference/typegraph/python/typegraph/providers/prisma",slug:"/reference/typegraph/python/typegraph/providers/prisma/schema",permalink:"/docs/reference/typegraph/python/typegraph/providers/prisma/schema",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/typegraph/python/typegraph/providers/prisma/schema.md",tags:[],version:"current",frontMatter:{sidebar_label:"schema",title:"typegraph.providers.prisma.schema"},sidebar:"docs",previous:{title:"prisma",permalink:"/docs/reference/typegraph/python/typegraph/providers/prisma/runtimes/prisma"},next:{title:"temporal",permalink:"/docs/reference/typegraph/python/typegraph/providers/temporal/runtimes/temporal"}},c={},s=[{value:"SchemaField Objects",id:"schemafield-objects",level:2},{value:"fkeys",id:"fkeys",level:4}],l={toc:s},m="wrapper";function y(e){let{components:r,...t}=e;return(0,p.kt)(m,(0,n.Z)({},l,t,{components:r,mdxType:"MDXLayout"}),(0,p.kt)("h2",{id:"schemafield-objects"},"SchemaField Objects"),(0,p.kt)("pre",null,(0,p.kt)("code",{parentName:"pre",className:"language-python"},"@frozen\nclass SchemaField()\n")),(0,p.kt)("h4",{id:"fkeys"},"fkeys"),(0,p.kt)("p",null,"foreign keys"))}y.isMDXComponent=!0}}]);
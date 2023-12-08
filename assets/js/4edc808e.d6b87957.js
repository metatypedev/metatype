"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[4173],{17700:(e,t,n)=>{n.d(t,{ZP:()=>a});var r=n(11527),i=n(63883);function s(e){const t={a:"a",li:"li",p:"p",strong:"strong",ul:"ul",...(0,i.a)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsxs)(t.p,{children:["Metatype is an open platform for developers to ",(0,r.jsx)(t.strong,{children:"declaratively build APIs"}),". It offers a new approach to creating backends, where the developers focus on data modelling and delegate the implementation to the platform."]}),"\n",(0,r.jsx)(t.p,{children:"The intent is to address the following challenges:"}),"\n",(0,r.jsxs)(t.ul,{children:["\n",(0,r.jsx)(t.li,{children:"developers are often a bottleneck, and may spend less than 50% of their time on tasks that matter"}),"\n",(0,r.jsx)(t.li,{children:"most of the developments needs are similar, yet most of the systems are not interoperable"}),"\n",(0,r.jsx)(t.li,{children:"infrastructure management takes time and slows down the deployment velocity"}),"\n"]}),"\n",(0,r.jsx)(t.p,{children:"The platform is composed of the following components:"}),"\n",(0,r.jsxs)(t.ul,{children:["\n",(0,r.jsxs)(t.li,{children:[(0,r.jsx)(t.a,{href:"/docs/reference/typegraph",children:(0,r.jsx)(t.strong,{children:"Typegraph"})}),": a multi-language SDK to manage typegraphs - virtual graphs of types - and compose them"]}),"\n",(0,r.jsxs)(t.li,{children:[(0,r.jsx)(t.a,{href:"/docs/reference/typegate",children:(0,r.jsx)(t.strong,{children:"Typegate"})}),": a serverless REST/GraphQL gateway to execute queries over typegraphs"]}),"\n",(0,r.jsxs)(t.li,{children:[(0,r.jsx)(t.a,{href:"/docs/reference/meta-cli",children:(0,r.jsx)(t.strong,{children:"Meta CLI"})}),": a command-line tool to offer a great developer experience and fast deployment"]}),"\n"]})]})}function a(e={}){const{wrapper:t}={...(0,i.a)(),...e.components};return t?(0,r.jsx)(t,{...e,children:(0,r.jsx)(s,{...e})}):s(e)}},48637:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>v,contentTitle:()=>w,default:()=>N,frontMatter:()=>b,metadata:()=>k,toc:()=>M});var r=n(11527),i=n(63883),s=(n(50959),n(45924)),a=n(69290),o=n(7587),l=n(52907),c=n(61189),d=n(98279);const p={cardContainer:"cardContainer_v682",cardTitle:"cardTitle_tfQi",cardDescription:"cardDescription_WBw8"};function h(e){let{href:t,children:n}=e;return(0,r.jsx)(o.Z,{href:t,className:(0,s.Z)("card padding--lg",p.cardContainer),children:n})}function u(e){let{href:t,icon:n,title:i,description:a}=e;return(0,r.jsxs)(h,{href:t,children:[(0,r.jsxs)(d.Z,{as:"h2",className:(0,s.Z)("text--truncate",p.cardTitle),title:i,children:[n," ",i]}),a&&(0,r.jsx)("p",{className:(0,s.Z)("text--truncate",p.cardDescription),title:a,children:a})]})}function m(e){let{item:t}=e;const n=(0,a.LM)(t);return n?(0,r.jsx)(u,{href:n,icon:"\ud83d\uddc3\ufe0f",title:t.label,description:t.description??(0,c.I)({message:"{count} items",id:"theme.docs.DocCard.categoryDescription",description:"The default description for a category card in the generated index about how many items this category includes"},{count:t.items.length})}):null}function f(e){let{item:t}=e;const n=(0,l.Z)(t.href)?"\ud83d\udcc4\ufe0f":"\ud83d\udd17",i=(0,a.xz)(t.docId??void 0);return(0,r.jsx)(u,{href:t.href,icon:n,title:t.label,description:t.description??i?.description})}function x(e){let{item:t}=e;switch(t.type){case"link":return(0,r.jsx)(f,{item:t});case"category":return(0,r.jsx)(m,{item:t});default:throw new Error(`unknown item type ${JSON.stringify(t)}`)}}function y(e){let{className:t}=e;const n=(0,a.jA)();return(0,r.jsx)(g,{items:n.items,className:t})}function g(e){const{items:t,className:n}=e;if(!t)return(0,r.jsx)(y,{...e});const i=(0,a.MN)(t);return(0,r.jsx)("section",{className:(0,s.Z)("row",n),children:i.map(((e,t)=>(0,r.jsx)("article",{className:"col col--6 margin-bottom--lg",children:(0,r.jsx)(x,{item:e})},t)))})}var j=n(17700);const b={sidebar_position:1,title:"Getting started"},w="Welcome to the Metatype documentation!",k={id:"index",title:"Getting started",description:"Get to know Metatype",source:"@site/docs/index.mdx",sourceDirName:".",slug:"/",permalink:"/docs/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/index.mdx",tags:[],version:"current",sidebarPosition:1,frontMatter:{sidebar_position:1,title:"Getting started"},sidebar:"docs",next:{title:"Quick start",permalink:"/docs/tutorials/quick-start/"}},v={},M=[{value:"Get to know Metatype",id:"get-to-know-metatype",level:2},{value:"Explore and learn more functionalities",id:"explore-and-learn-more-functionalities",level:2},{value:"Understand Metatype in depth",id:"understand-metatype-in-depth",level:2}];function T(e){const t={a:"a",h1:"h1",h2:"h2",li:"li",p:"p",ul:"ul",...(0,i.a)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(t.h1,{id:"welcome-to-the-metatype-documentation",children:"Welcome to the Metatype documentation!"}),"\n",(0,r.jsx)(j.ZP,{}),"\n",(0,r.jsx)(t.h2,{id:"get-to-know-metatype",children:"Get to know Metatype"}),"\n",(0,r.jsxs)(t.p,{children:["Follow the ",(0,r.jsx)(t.a,{href:"/docs/tutorials/quick-start",children:"quick-start"})," to install the components and get a taste of Metatype. Or, jump right into practice with a tutorial below."]}),"\n",(0,r.jsx)(g,{items:[{type:"link",label:"Metatype basics",description:"Learn 80% of the concept you will need daily.",href:"/docs/tutorials/metatype-basics"},{type:"link",label:"Build a feature roadmap API",description:"Learn how to build a real world API and explore more advanced features.",href:"/docs/tutorials/building-feature-roadmap-api"}]}),"\n",(0,r.jsx)(t.h2,{id:"explore-and-learn-more-functionalities",children:"Explore and learn more functionalities"}),"\n",(0,r.jsx)(t.p,{children:"The platform provides out of the box support for many use cases:"}),"\n",(0,r.jsxs)(t.ul,{children:["\n",(0,r.jsx)(t.li,{children:"create/read/update/delete data in your database"}),"\n",(0,r.jsx)(t.li,{children:"storing files in your cloud storage"}),"\n",(0,r.jsx)(t.li,{children:"authenticate users with different providers or using JWTs"}),"\n",(0,r.jsx)(t.li,{children:"connecting to third-party/internal APIs"}),"\n",(0,r.jsx)(t.li,{children:"running custom business logic in your preferred language"}),"\n",(0,r.jsx)(t.li,{children:"providing fine-grained access control to your data"}),"\n",(0,r.jsx)(t.li,{children:"and more..."}),"\n"]}),"\n",(0,r.jsx)(g,{items:[{type:"link",label:"All about types",href:"/docs/reference/types"},{type:"link",label:"List of support runtimes",href:"/docs/reference/runtimes"},{type:"link",label:"Deploy on different environments",href:"/docs/reference/meta-cli"},{type:"link",label:"Security mechanisms",href:"/docs/reference/typegate"}]}),"\n",(0,r.jsx)(t.h2,{id:"understand-metatype-in-depth",children:"Understand Metatype in depth"}),"\n",(0,r.jsx)(t.p,{children:"Once you are familiar with the basics, you can learn more about the motivation behind Metatype and the underlying implementation."}),"\n",(0,r.jsx)(g,{items:[{type:"link",label:"Mental model",href:"/docs/concepts/mental-model"},{type:"link",label:"Comparing Metatype",href:"/docs/concepts/comparisons"},{type:"link",label:"Query engine",href:"/docs/concepts/query-engine"},{type:"link",label:"Access control",href:"/docs/concepts/access-control"}]})]})}function N(e={}){const{wrapper:t}={...(0,i.a)(),...e.components};return t?(0,r.jsx)(t,{...e,children:(0,r.jsx)(T,{...e})}):T(e)}}}]);
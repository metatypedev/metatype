"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[4661],{17942:(e,t,a)=>{a.d(t,{Zo:()=>c,kt:()=>h});var n=a(50959);function r(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function o(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,n)}return a}function i(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?o(Object(a),!0).forEach((function(t){r(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):o(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function s(e,t){if(null==e)return{};var a,n,r=function(e,t){if(null==e)return{};var a,n,r={},o=Object.keys(e);for(n=0;n<o.length;n++)a=o[n],t.indexOf(a)>=0||(r[a]=e[a]);return r}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(n=0;n<o.length;n++)a=o[n],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(r[a]=e[a])}return r}var l=n.createContext({}),p=function(e){var t=n.useContext(l),a=t;return e&&(a="function"==typeof e?e(t):i(i({},t),e)),a},c=function(e){var t=p(e.components);return n.createElement(l.Provider,{value:t},e.children)},d="mdxType",u={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},m=n.forwardRef((function(e,t){var a=e.components,r=e.mdxType,o=e.originalType,l=e.parentName,c=s(e,["components","mdxType","originalType","parentName"]),d=p(a),m=r,h=d["".concat(l,".").concat(m)]||d[m]||u[m]||o;return a?n.createElement(h,i(i({ref:t},c),{},{components:a})):n.createElement(h,i({ref:t},c))}));function h(e,t){var a=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var o=a.length,i=new Array(o);i[0]=m;var s={};for(var l in t)hasOwnProperty.call(t,l)&&(s[l]=t[l]);s.originalType=e,s[d]="string"==typeof e?e:r,i[1]=s;for(var p=2;p<o;p++)i[p]=a[p];return n.createElement.apply(null,i)}return n.createElement.apply(null,a)}m.displayName="MDXCreateElement"},3282:(e,t,a)=>{a.d(t,{ZP:()=>s});var n=a(52319),r=(a(50959),a(17942));const o={toc:[]},i="wrapper";function s(e){let{components:t,...a}=e;return(0,r.kt)(i,(0,n.Z)({},o,a,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("p",null,"Metatype is an open source platform for developers to ",(0,r.kt)("strong",{parentName:"p"},"declaratively build APIs"),". It offers a unique approach to building backends, where the focus is all on data modelling and the platform takes care of the rest."),(0,r.kt)("p",null,"The intent is to find a convenient computing model that tackles the following challenges:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"most developers still spend too much time on tasks with low-value (crud, data validation, compliance, etc.)"),(0,r.kt)("li",{parentName:"ul"},"when growing a product, it is hard to keep up with business needs and remain innovative with technology"),(0,r.kt)("li",{parentName:"ul"},"managing server and infrastructure shall never be a concern for developers nor slow them down")),(0,r.kt)("p",null,"In that respect, Metatype can be seen as an alternative to Hasura, Strapi, Firebase, or even web frameworks like Django or NestJS. You can see how Metatype differs reading the ",(0,r.kt)("a",{parentName:"p",href:"/docs/concepts/overview"},"conceptual overview")," or the ",(0,r.kt)("a",{parentName:"p",href:"/docs/concepts/comparisons"},"comparison summary"),"."),(0,r.kt)("p",null,"The platform consists of the following components:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"/docs/concepts/typegraph"},(0,r.kt)("strong",{parentName:"a"},"Typegraph")),": a package to describe typegraphs - virtual graphs of types - and compose them"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"/docs/concepts/typegate"},(0,r.kt)("strong",{parentName:"a"},"Typegate")),": a distributed REST/GraphQL query engine to execute queries over typegraphs"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"/docs/concepts/meta-cli"},(0,r.kt)("strong",{parentName:"a"},"Meta CLI")),": a command-line tool to provide great developer experience and serverless deployment")),(0,r.kt)("p",null,"A vast range of ",(0,r.kt)("a",{parentName:"p",href:"/docs/reference/runtimes"},"runtimes")," is implemented by the platform and provides out of the box support for storing data in databases/S3, connecting to third-party/internal APIs and running business logic in Deno/Python/WebAssembly."))}s.isMDXComponent=!0},5967:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>p,contentTitle:()=>s,default:()=>m,frontMatter:()=>i,metadata:()=>l,toc:()=>c});var n=a(52319),r=(a(50959),a(17942)),o=a(3282);const i={sidebar_position:1},s="Overview",l={unversionedId:"concepts/overview/index",id:"concepts/overview/index",title:"Overview",description:"This page gives a high-level view of Metatype's foundations.",source:"@site/docs/concepts/overview/index.mdx",sourceDirName:"concepts/overview",slug:"/concepts/overview/",permalink:"/docs/concepts/overview/",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/concepts/overview/index.mdx",tags:[],version:"current",sidebarPosition:1,frontMatter:{sidebar_position:1},sidebar:"docs",previous:{title:"Changelog",permalink:"/docs/reference/changelog"},next:{title:"Comparing Metatype",permalink:"/docs/concepts/comparisons/"}},p={},c=[{value:"Why does Metatype exist?",id:"why-does-metatype-exist",level:2},{value:"How does Metatype work?",id:"how-does-metatype-work",level:2},{value:"What&#39;s exactly Metatype?",id:"whats-exactly-metatype",level:2},{value:"Architectural overview",id:"architectural-overview",level:3}],d={toc:c},u="wrapper";function m(e){let{components:t,...i}=e;return(0,r.kt)(u,(0,n.Z)({},d,i,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("h1",{id:"overview"},"Overview"),(0,r.kt)("p",null,"This page gives a high-level view of Metatype's foundations."),(0,r.kt)("admonition",{title:"Looking to build?",type:"tip"},(0,r.kt)("p",{parentName:"admonition"},"For a hands-on introduction, head over to the ",(0,r.kt)("a",{parentName:"p",href:"/docs/tutorials/getting-started"},"getting started page")," and start build your first typegraph.")),(0,r.kt)("h2",{id:"why-does-metatype-exist"},"Why does Metatype exist?"),(0,r.kt)("p",null,"As products evolve, building APIs becomes a challenging hot spot where initiatives collides and efficiency becomes a struggle. While deploying new features, all developers spend a non-negligible amount of time on low-value added tasks (CRUD generation, data validation, authorization, etc.) and deploying their solutions. This leaves little time under business constraints to design great interfaces and experiment with the best technical solution, eventually increasing the time to delivery and weakening the innovation capabilities."),(0,r.kt)("p",null,"Metatype's vision is to enable everyone to build modular API with as little effort as possible. By helping developers to re-use existing systems and APIs, it enables teams to focus on what matters: their expert knowledge in business logic, modelling and technologies. Metatype manage the complex layers for them, making them productive and innovation-friendly for the next iterations."),(0,r.kt)("p",null,"Drawing inspiration from modern frontend development practices, Metatype adopts the pattern of composing components together to solve backend development challenges. In that respect, Metatype is a key element in the composable enterprise trend by:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"making system interfaces accessible and easy to understand for everyone (discoverability)"),(0,r.kt)("li",{parentName:"ul"},"embracing iterative approaches and cut time to deployment in half (autonomy)"),(0,r.kt)("li",{parentName:"ul"},"building strong foundations for APIs with type safety and bounded context (modularity)"),(0,r.kt)("li",{parentName:"ul"},"empowering teams to innovate with new technologies and interoperability (orchestration)")),(0,r.kt)("h2",{id:"how-does-metatype-work"},"How does Metatype work?"),(0,r.kt)("p",null,"When developing a feature, the classical approach is to define what data will be at play, how to transform them, where the execution shall take place and who should be authorized. Instead, Metatype define an abstraction for each of those steps and put the emphasis on composing pre-defined APIs or defining re-usable ones when there is no existing solution."),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null}),(0,r.kt)("th",{parentName:"tr",align:null},"Classical approach"),(0,r.kt)("th",{parentName:"tr",align:null},"Metatype's computing model"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"What (data)"),(0,r.kt)("td",{parentName:"tr",align:null},"fixed response defined by the logic"),(0,r.kt)("td",{parentName:"tr",align:null},"API clients selects what they need from ",(0,r.kt)("a",{parentName:"td",href:"/docs/concepts/typegraph#types"},"types"))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"How (transformations)"),(0,r.kt)("td",{parentName:"tr",align:null},"ad-hoc code logic"),(0,r.kt)("td",{parentName:"tr",align:null},"composed data with interchangeable ",(0,r.kt)("a",{parentName:"td",href:"/docs/concepts/typegraph#materializers"},"materializers"))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"Where (execution)"),(0,r.kt)("td",{parentName:"tr",align:null},"1 code base + 1 database"),(0,r.kt)("td",{parentName:"tr",align:null},"orchestrate the request across multiple ",(0,r.kt)("a",{parentName:"td",href:"/docs/concepts/typegraph#runtimes"},"runtimes"))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"Who (authentication)"),(0,r.kt)("td",{parentName:"tr",align:null},"hard-coded rules or system"),(0,r.kt)("td",{parentName:"tr",align:null},"request context based and controlled by ",(0,r.kt)("a",{parentName:"td",href:"/docs/concepts/typegraph#policies"},"policies"))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"When (event)"),(0,r.kt)("td",{parentName:"tr",align:null},"request arrival"),(0,r.kt)("td",{parentName:"tr",align:null},"based on ",(0,r.kt)("a",{parentName:"td",href:"/docs/concepts/typegraph#triggers"},"triggers"))))),(0,r.kt)("p",null,"This computing model brings numerous advantages:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"it offers ",(0,r.kt)("a",{parentName:"li",href:"/docs/reference/runtimes"},"multiple runtimes")," with pre-defined operations and can replace the needs for an ad-hoc backend"),(0,r.kt)("li",{parentName:"ul"},"when the project grows, you easily introduce new APIs or break existing ones in smaller parts"),(0,r.kt)("li",{parentName:"ul"},"you write complex business logic directly in Typescript, Python or WebAssembly and run them on-demand"),(0,r.kt)("li",{parentName:"ul"},"third-parties APIs can be easily integrated, providing you visibility and control over them"),(0,r.kt)("li",{parentName:"ul"},"it is interoperable with existing (legacy) systems, and can be introduced step by step"),(0,r.kt)("li",{parentName:"ul"},"it can be easily self-hosted in your own infrastructure or customized according to your needs")),(0,r.kt)("h2",{id:"whats-exactly-metatype"},"What's exactly Metatype?"),(0,r.kt)(o.ZP,{mdxType:"Metatype"}),(0,r.kt)("h3",{id:"architectural-overview"},"Architectural overview"),(0,r.kt)("p",null,"Metatype is designed for cloud environments and comes with minimal components. The only requirement to scale horizontally is to share some memory between replicas via Redis. You can use Metatype ",(0,r.kt)("a",{parentName:"p",href:"https://github.com/metatypedev/charts"},"helm chart")," to directly deploy typegates on your Kubernetes cluster."),(0,r.kt)("div",{className:"text-center"},(0,r.kt)("p",null,(0,r.kt)("img",{alt:"Metatype&#39;s architecture",src:a(40624).Z,width:"461",height:"341"}))))}m.isMDXComponent=!0},40624:(e,t,a)=>{a.d(t,{Z:()=>n});const n=a.p+"assets/images/image.drawio-564f2cdd1b75f6132ff8fdfaad29a92c.svg"}}]);
"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[8977],{61588:(e,n,s)=>{s.r(n),s.d(n,{assets:()=>l,contentTitle:()=>o,default:()=>h,frontMatter:()=>r,metadata:()=>d,toc:()=>a});var t=s(13274),i=s(99128);const r={sidebar_position:7,title:"Comparing Metatype"},o="Comparing Metatype",d={id:"concepts/comparisons/index",title:"Comparing Metatype",description:"Metatype foundations takes inspiration from many innovative tools that arose in the last years. We took the best of each of them and combined them into a single engine backed by a convenient computing model.",source:"@site/docs/concepts/comparisons/index.mdx",sourceDirName:"concepts/comparisons",slug:"/concepts/comparisons/",permalink:"/docs/concepts/comparisons/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/concepts/comparisons/index.mdx",tags:[],version:"current",sidebarPosition:7,frontMatter:{sidebar_position:7,title:"Comparing Metatype"},sidebar:"docs",previous:{title:"Metatype explained to X",permalink:"/docs/concepts/explanations/"}},l={},a=[{value:"Development platforms",id:"development-platforms",level:2},{value:"Headless CMS",id:"headless-cms",level:2},{value:"Low Code Platforms",id:"low-code-platforms",level:2},{value:"Table Parameters Legend",id:"table-parameters-legend",level:3},{value:"Solution&#39;s Meta",id:"solutions-meta",level:4},{value:"Network comms",id:"network-comms",level:4},{value:"Ecosystem",id:"ecosystem",level:4},{value:"Security",id:"security",level:4},{value:"Database Interaction",id:"database-interaction",level:4},{value:"System Flexibility",id:"system-flexibility",level:4},{value:"Versioning and CI/CD",id:"versioning-and-cicd",level:4},{value:"Scalability",id:"scalability",level:4},{value:"Deployment",id:"deployment",level:4},{value:"Monitoring, Logging and maintenance",id:"monitoring-logging-and-maintenance",level:4}];function c(e){const n={a:"a",h1:"h1",h2:"h2",h3:"h3",h4:"h4",li:"li",ol:"ol",p:"p",strong:"strong",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",ul:"ul",...(0,i.R)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n.h1,{id:"comparing-metatype",children:"Comparing Metatype"}),"\n",(0,t.jsxs)(n.p,{children:["Metatype foundations takes inspiration from many innovative tools that arose in the last years. We took the best of each of them and combined them into a single engine backed by a convenient ",(0,t.jsx)(n.a,{href:"/docs/reference/typegraph",children:"computing model"}),"."]}),"\n",(0,t.jsx)(n.p,{children:"While this provides a unique and powerful platform, it can be difficult to understand how exactly Metatype compares to other tools. This page provides a high-level overview of these differences."}),"\n",(0,t.jsx)(n.h2,{id:"development-platforms",children:"Development platforms"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Firebase"}),"\n",(0,t.jsx)(n.li,{children:"Supabase"}),"\n",(0,t.jsx)(n.li,{children:"Hasura"}),"\n",(0,t.jsx)(n.li,{children:"PostGraphile"}),"\n"]}),"\n",(0,t.jsx)(n.p,{children:"These are great platforms to quickly start a new project. However, they hardly scale in terms of architecture evolution, technology freedom, number of developers on the project, and you will eventually have to move out due to increasing costs or iterations slowness."}),"\n",(0,t.jsx)(n.p,{children:(0,t.jsx)(n.strong,{children:"When to choose Metatype"})}),"\n",(0,t.jsxs)(n.ol,{children:["\n",(0,t.jsx)(n.li,{children:"You want to build modular APIs by composing pre-defined blocks and import the ones you need from existing systems."}),"\n",(0,t.jsx)(n.li,{children:"You want to take advantage of developers tooling you are familiar with, like version controls or multiple environments."}),"\n",(0,t.jsx)(n.li,{children:"You favor interoperability and extensibility over vendor lock-in, and follow your future needs with ease."}),"\n",(0,t.jsx)(n.li,{children:"You want to decouple your database from your API and change where the data is stored as the project evolves."}),"\n"]}),"\n",(0,t.jsx)(n.h2,{id:"headless-cms",children:"Headless CMS"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Strapi"}),"\n",(0,t.jsx)(n.li,{children:"Directus"}),"\n"]}),"\n",(0,t.jsx)(n.p,{children:"Headless Content Management Systems (CMS) are great tools to manage content and providing great editing experience. However, they are not designed to build complex APIs like a cart checkout or integrate with other systems."}),"\n",(0,t.jsx)(n.p,{children:(0,t.jsx)(n.strong,{children:"When to choose Metatype"})}),"\n",(0,t.jsxs)(n.ol,{children:["\n",(0,t.jsx)(n.li,{children:"You want an all-in-one APIs development platforms and offer the same editing experience through a user-friendly interface"}),"\n",(0,t.jsx)(n.li,{children:"You care about end-user performance and want to use the best underlying technology for each use cases"}),"\n",(0,t.jsx)(n.li,{children:"You are more than one on the project and want to manage your data models using preferred programming language"}),"\n"]}),"\n",(0,t.jsx)(n.h2,{id:"low-code-platforms",children:"Low Code Platforms"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Retool"}),"\n",(0,t.jsx)(n.li,{children:"Airtable"}),"\n",(0,t.jsx)(n.li,{children:"Windmill"}),"\n"]}),"\n",(0,t.jsx)(n.p,{children:"Low Code platforms are a game changer when it comes to faster development cycle, great collaboration options and the gentle learning curve. However, this comes at the cost of losing degree of flexibility and cusomizability. They are also hard to apply different scalability and come with limited performance optimization."}),"\n",(0,t.jsx)(n.p,{children:(0,t.jsx)(n.strong,{children:"When to choose Metatype"})}),"\n",(0,t.jsxs)(n.ol,{children:["\n",(0,t.jsx)(n.li,{children:"When you want more control over your application instances running on the cloud."}),"\n",(0,t.jsx)(n.li,{children:"When you want to build more complex APIs."}),"\n",(0,t.jsx)(n.li,{children:"When you want to have the freedom to make detailed changes to your application to gain that extra peformance."}),"\n"]}),"\n",(0,t.jsx)("br",{}),"\n",(0,t.jsx)(n.p,{children:"Feature/Capability Key:"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:["\u2705"," 1st class, with no extra dependencies."]}),"\n",(0,t.jsxs)(n.li,{children:["\u26aa"," supported, but with extra 3rd party dependencies"]}),"\n",(0,t.jsxs)(n.li,{children:["\ud83d\udd36"," supported, but with extra 3rd party dependencies and user code."]}),"\n",(0,t.jsxs)(n.li,{children:["\ud83d\udd34"," not officially supported or documented."]}),"\n"]}),"\n",(0,t.jsxs)(n.table,{children:[(0,t.jsx)(n.thead,{children:(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.th,{}),(0,t.jsx)(n.th,{children:"Metatype"}),(0,t.jsx)(n.th,{children:"Development Platforms"}),(0,t.jsx)(n.th,{children:"Headless CMS"}),(0,t.jsx)(n.th,{children:"Low code platform"})]})}),(0,t.jsxs)(n.tbody,{children:[(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"Licensing"}),(0,t.jsx)(n.td,{children:(0,t.jsx)(n.a,{href:"https://github.com/metatypedev/metatype/blob/main/dev/LICENSE-MPL-2.0.md",children:"Open Source"})}),(0,t.jsxs)(n.td,{children:["Open Source ",(0,t.jsx)("br",{})," Proprietary"]}),(0,t.jsx)(n.td,{children:"Open Source"}),(0,t.jsx)(n.td,{children:"Proprietary"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"Platform's Requirements"}),(0,t.jsxs)(n.td,{children:["- Cloud-based: None ",(0,t.jsx)("br",{})," - Locally: Deno/Node.js/Python Runtime, Redis, Docker"]}),(0,t.jsxs)(n.td,{children:["- Cloud-based: None ",(0,t.jsx)("br",{})," - Running Locally: Docker, DBMS"]}),(0,t.jsxs)(n.td,{children:["- NodeJS runtime ",(0,t.jsx)("br",{})," - DBMS"]}),(0,t.jsx)(n.td,{children:"Cloud-based: None"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"Architecture Model"}),(0,t.jsxs)(n.td,{children:["- Declarative ",(0,t.jsx)("br",{})," - Less Code ",(0,t.jsx)("br",{})," - Serverless"]}),(0,t.jsxs)(n.td,{children:["- API over Database ",(0,t.jsx)("br",{})," - Serverless"]}),(0,t.jsxs)(n.td,{children:["- Headless Architecture ",(0,t.jsx)("br",{})," - Serverless"]}),(0,t.jsxs)(n.td,{children:["- Visual drag and drop ",(0,t.jsx)("br",{})," - Serverless"]})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"REST/HTTP"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"GraphQL"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u26aa"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\ud83d\udd36"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"gRPC"}),(0,t.jsxs)(n.td,{children:["\ud83d\udd36","*"]}),(0,t.jsx)(n.td,{children:"\ud83d\udd36"}),(0,t.jsx)(n.td,{children:"\ud83d\udd36"}),(0,t.jsx)(n.td,{children:"\ud83d\udd36"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"GUI for non programmers"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"Development SDKs"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\ud83d\udd34"}),(0,t.jsxs)(n.td,{children:["\ud83d\udd34"," (Most) ",(0,t.jsx)("br",{})," ","\u2705"," (few)"]})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"CLI"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsxs)(n.td,{children:["\u2705"," (some) ",(0,t.jsx)("br",{})," ","\ud83d\udd34"," (some)"]}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\ud83d\udd34"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"Dev Tools"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\ud83d\udd34"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"LSP and Extensions"}),(0,t.jsxs)(n.td,{children:["\u2705","*"]}),(0,t.jsx)(n.td,{children:"\u26aa"}),(0,t.jsx)(n.td,{children:"\u26aa"}),(0,t.jsx)(n.td,{children:"\ud83d\udd34"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"Authentication"}),(0,t.jsxs)(n.td,{children:["- Basic Auth ",(0,t.jsx)("br",{})," - JWT ",(0,t.jsx)("br",{})," - OAuth"]}),(0,t.jsxs)(n.td,{children:["- Basic Auth ",(0,t.jsx)("br",{})," - JWT ",(0,t.jsx)("br",{})," - OAuth ",(0,t.jsx)("br",{})," - JWT"]}),(0,t.jsxs)(n.td,{children:["- email/phone/password ",(0,t.jsx)("br",{})," - JWT  - OAuth"]}),(0,t.jsxs)(n.td,{children:["- email/phone/password ",(0,t.jsx)("br",{})," - JWT ",(0,t.jsx)("br",{})," - OAuth ",(0,t.jsx)("br",{})," - JWT"]})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"Authorization"}),(0,t.jsx)(n.td,{children:"- policy-based access control (PBAC)"}),(0,t.jsxs)(n.td,{children:["- policy-based access control (PBAC) ",(0,t.jsx)("br",{})," - role-based access control (RBAC)"]}),(0,t.jsx)(n.td,{children:"- role-based access control (RBAC)"}),(0,t.jsx)(n.td,{children:"- Custom Authorization logic from the User"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"Type System"}),(0,t.jsx)(n.td,{children:(0,t.jsx)(n.a,{href:"/docs/reference/types",children:"Custom Types"})}),(0,t.jsxs)(n.td,{children:["- JS objects ",(0,t.jsx)("br",{})," - GraphQL Schemas ",(0,t.jsx)("br",{})," - Database Types"]}),(0,t.jsx)(n.td,{children:"JS objects"}),(0,t.jsx)(n.td,{children:"Custom Types"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"Custom Code Support"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"Version Control Friendly"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"GitOPs Friendly"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u26aa"}),(0,t.jsx)(n.td,{children:"\u26aa"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"Vertical Scalability"}),(0,t.jsx)(n.td,{children:"Flexibile"}),(0,t.jsx)(n.td,{children:"Limited"}),(0,t.jsx)(n.td,{children:"Flexibile"}),(0,t.jsx)(n.td,{children:"Limited"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"Service Decomposition"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\ud83d\udd34"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"Deployment Options"}),(0,t.jsxs)(n.td,{children:["- On premise ",(0,t.jsx)("br",{})," - Cloud-based platforms"]}),(0,t.jsxs)(n.td,{children:["- On premise ",(0,t.jsx)("br",{})," - Cloud-based platforms"]}),(0,t.jsxs)(n.td,{children:["- On premise ",(0,t.jsx)("br",{})," - Cloud-based platforms"]}),(0,t.jsxs)(n.td,{children:["- On premise ",(0,t.jsx)("br",{})," - Cloud-based platforms"]})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"Monitoring and Tracking"}),(0,t.jsxs)(n.td,{children:["\u2705","*"]}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\ud83d\udd36"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"Logging"}),(0,t.jsxs)(n.td,{children:["\u2705","*"]}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\u2705"}),(0,t.jsx)(n.td,{children:"\ud83d\udd36"})]})]})]}),"\n","\n",(0,t.jsx)(n.h3,{id:"table-parameters-legend",children:"Table Parameters Legend"}),"\n",(0,t.jsx)(n.h4,{id:"solutions-meta",children:"Solution's Meta"}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"Licensing"}),": The type of licensing model the software solution adopts, such as open-source, proprietary, freemium, etc."]}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"Platform's Requirements"}),": The prerequisites and dependencies required for the software to run efficiently, including hardware, operating system, runtime environment, etc."]}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"Architecture Model"}),": The underlying design principles and patterns governing the behavior/structure of the software solution."]}),"\n",(0,t.jsx)(n.h4,{id:"network-comms",children:"Network comms"}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"REST/HTTP"}),": Support for Representational State Transfer (REST) or Hypertext Transfer Protocol (HTTP) communication protocol used for network communication."]}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"GraphQL"}),": Support for GraphQL."]}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"gRPC"}),": Support for gRPC."]}),"\n",(0,t.jsx)(n.h4,{id:"ecosystem",children:"Ecosystem"}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"GUI for non programmers"}),": Graphical User Interface (GUI) tools designed to facilitate interaction with the software by individuals with limited programming knowledge or expertise.  "]}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"Development SDKs"}),": Software Development Kits (SDKs) provided by the solution to aid developers in building applications using the platform."]}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"CLI"}),": Command-Line Interface tools provided for developers or administrators to interact with the software from the terminal or command prompt."]}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"Dev Tools"}),": Tools and utilities provided to aid developers in coding, debugging, testing, and profiling applications."]}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"LSP and Extensions"}),": Language Server Protocol (LSP) and Extensions support for enhanced development experience, including features like syntax highlighting, auto-completion, and error checking."]}),"\n",(0,t.jsx)(n.h4,{id:"security",children:"Security"}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"Authentication"}),": Mechanisms for verifying the identity of users or entities accessing the software solution."]}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"Authorization"}),": The process of determining whether an authenticated user or system entity is allowed to perform a specific action or access a particular resource."]}),"\n",(0,t.jsx)(n.h4,{id:"database-interaction",children:"Database Interaction"}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"Type System"}),": The system governing the data types and structures used by which the application entities and models are constructed."]}),"\n","\n","\n",(0,t.jsx)(n.h4,{id:"system-flexibility",children:"System Flexibility"}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"Custom Code support"}),": The ability of the software solution to accommodate custom code or extensions developed by users or third-party developers."]}),"\n","\n",(0,t.jsx)(n.h4,{id:"versioning-and-cicd",children:"Versioning and CI/CD"}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"Version Control"}),": The support for versioning and revision control of software artifacts, typically using systems like Git, SVN, etc."]}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"GitOPs Friendly"}),": Compatibility or support for the GitOps methodology, where infrastructure and application deployments are managed through Git workflows."]}),"\n",(0,t.jsx)(n.h4,{id:"scalability",children:"Scalability"}),"\n","\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"Vertical Scalability"}),": The ability of the software solution to handle increased workload or demand by adding more resources to a single node or instance."]}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"Service Decomposition"}),": The architectural principle of breaking down the software into smaller, independent services (microservices) to improve scalability, maintainability, and flexibility."]}),"\n",(0,t.jsx)(n.h4,{id:"deployment",children:"Deployment"}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"Deployment Options"}),": The available methods and strategies for deploying the software solution, including on-premises, cloud-based, containerized, etc."]}),"\n",(0,t.jsx)(n.h4,{id:"monitoring-logging-and-maintenance",children:"Monitoring, Logging and maintenance"}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"Monitoring and Tracking"}),": Tools and mechanisms provided for monitoring the health, performance, and usage of the software solution, as well as tracking user activities and behaviors."]}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"Logging"}),": Facilities for recording and storing system events, errors, and other relevant information for troubleshooting, analysis, and auditing purposes."]}),"\n","\n"]})}function h(e={}){const{wrapper:n}={...(0,i.R)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(c,{...e})}):c(e)}}}]);
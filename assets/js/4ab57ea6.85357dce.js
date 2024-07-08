"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[96],{14344:(e,t,n)=>{n.d(t,{Ay:()=>l,RM:()=>s});var r=n(86070),i=n(25710);const s=[];function a(e){const t={a:"a",admonition:"admonition",code:"code",li:"li",p:"p",pre:"pre",ul:"ul",...(0,i.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(t.admonition,{type:"info",children:(0,r.jsxs)(t.p,{children:["Metatype is only supported on macOS and Linux. Windows users should use ",(0,r.jsx)(t.a,{href:"https://learn.microsoft.com/windows/wsl/install",children:"Linux on Windows with WSL"}),"."]})}),"\n",(0,r.jsxs)(t.p,{children:["You can download the binary from the\n",(0,r.jsx)(t.a,{href:"https://github.com/metatypedev/metatype/releases/",children:"releases page"}),", make it\nexecutable and add it to your ",(0,r.jsx)(t.code,{children:"PATH"})," or use the automated method below."]}),"\n",(0,r.jsxs)(t.ul,{children:["\n",(0,r.jsxs)(t.li,{children:["\n",(0,r.jsx)(t.p,{children:"An installer script is also provided for the CLI in our repository. Curl and install in it with the following one-liner. The installer may ask for your password."}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-bash",children:"curl -fsSL https://raw.githubusercontent.com/metatypedev/metatype/main/installer.sh | bash\n"})}),"\n"]}),"\n",(0,r.jsxs)(t.li,{children:["\n",(0,r.jsxs)(t.p,{children:["For later use, you can run the following command to upgrade ",(0,r.jsx)(t.code,{children:"Meta CLI"})," to a newer version. If your Meta CLI is up to date, you will get an ",(0,r.jsx)(t.code,{children:"Already up to date!"})," response."]}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-bash",children:"meta upgrade\n"})}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(t.p,{children:["That's it! You are done installing ",(0,r.jsx)(t.code,{children:"Meta CLI"}),"."]})]})}function l(e={}){const{wrapper:t}={...(0,i.R)(),...e.components};return t?(0,r.jsx)(t,{...e,children:(0,r.jsx)(a,{...e})}):a(e)}},88570:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>d,contentTitle:()=>o,default:()=>h,frontMatter:()=>l,metadata:()=>c,toc:()=>u});var r=n(86070),i=n(25710),s=n(14344),a=n(41657);const l={sidebar_position:7},o="Meta CLI",c={id:"reference/meta-cli/index",title:"Meta CLI",description:"Meta-cli version",source:"@site/docs/reference/meta-cli/index.mdx",sourceDirName:"reference/meta-cli",slug:"/reference/meta-cli/",permalink:"/docs/reference/meta-cli/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/meta-cli/index.mdx",tags:[],version:"current",sidebarPosition:7,frontMatter:{sidebar_position:7},sidebar:"docs",previous:{title:"Synchronization",permalink:"/docs/reference/typegate/synchronization/"},next:{title:"Available commands",permalink:"/docs/reference/meta-cli/available-commands"}},d={},u=[{value:"Installation",id:"installation",level:2},...s.RM];function m(e){const t={a:"a",code:"code",h1:"h1",h2:"h2",img:"img",p:"p",...(0,i.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(t.h1,{id:"meta-cli",children:"Meta CLI"}),"\n",(0,r.jsx)(t.p,{children:(0,r.jsx)(t.a,{href:"https://github.com/metatypedev/metatype/releases",children:(0,r.jsx)(t.img,{src:"https://img.shields.io/github/v/release/metatypedev/metatype?include_prereleases&label=meta-cli",alt:"Meta-cli version"})})}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.code,{children:"meta"})," is a command line interface for interacting with the typegate and provide a simple, yet complete, developer experience. The ",(0,r.jsx)(t.code,{children:"metatype.yml"})," file allows you to configure your environment and CLI settings, see ",(0,r.jsx)(t.a,{href:"../reference/meta-cli/configuration-file",children:"configuration file"}),"."]}),"\n",(0,r.jsx)(t.h2,{id:"installation",children:"Installation"}),"\n",(0,r.jsx)(s.Ay,{}),"\n",(0,r.jsxs)(t.p,{children:["For development purposes, the cli bundles the typegate itself and this can be accessed through the ",(0,r.jsx)(t.code,{children:"meta typegate"})," subcommand."]}),"\n",(0,r.jsx)("br",{}),"\n",(0,r.jsx)(a.A,{items:[{type:"link",label:"Available commands",href:"/docs/reference/meta-cli/available-commands"},{type:"link",label:"Configuration file",href:"/docs/reference/meta-cli/configuration-file"}]})]})}function h(e={}){const{wrapper:t}={...(0,i.R)(),...e.components};return t?(0,r.jsx)(t,{...e,children:(0,r.jsx)(m,{...e})}):m(e)}},41657:(e,t,n)=>{n.d(t,{A:()=>j});n(30758);var r=n(13526),i=n(52295),s=n(92076),a=n(11812),l=n(51716),o=n(88237),c=n(55230);const d={cardContainer:"cardContainer_SeFz",cardTitle:"cardTitle_j0Zt",cardDescription:"cardDescription_DFiu"};var u=n(86070);function m(e){let{href:t,children:n}=e;return(0,u.jsx)(s.A,{href:t,className:(0,r.A)("card padding--lg",d.cardContainer),children:n})}function h(e){let{href:t,icon:n,title:i,description:s}=e;return(0,u.jsxs)(m,{href:t,children:[(0,u.jsxs)(c.A,{as:"h2",className:(0,r.A)("text--truncate",d.cardTitle),title:i,children:[n," ",i]}),s&&(0,u.jsx)("p",{className:(0,r.A)("text--truncate",d.cardDescription),title:s,children:s})]})}function p(e){let{item:t}=e;const n=(0,i.Nr)(t),r=function(){const{selectMessage:e}=(0,a.W)();return t=>e(t,(0,o.T)({message:"1 item|{count} items",id:"theme.docs.DocCard.categoryDescription.plurals",description:"The default description for a category card in the generated index about how many items this category includes"},{count:t}))}();return n?(0,u.jsx)(h,{href:n,icon:"\ud83d\uddc3\ufe0f",title:t.label,description:t.description??r(t.items.length)}):null}function f(e){let{item:t}=e;const n=(0,l.A)(t.href)?"\ud83d\udcc4\ufe0f":"\ud83d\udd17",r=(0,i.cC)(t.docId??void 0);return(0,u.jsx)(h,{href:t.href,icon:n,title:t.label,description:t.description??r?.description})}function x(e){let{item:t}=e;switch(t.type){case"link":return(0,u.jsx)(f,{item:t});case"category":return(0,u.jsx)(p,{item:t});default:throw new Error(`unknown item type ${JSON.stringify(t)}`)}}function g(e){let{className:t}=e;const n=(0,i.$S)();return(0,u.jsx)(j,{items:n.items,className:t})}function j(e){const{items:t,className:n}=e;if(!t)return(0,u.jsx)(g,{...e});const s=(0,i.d1)(t);return(0,u.jsx)("section",{className:(0,r.A)("row",n),children:s.map(((e,t)=>(0,u.jsx)("article",{className:"col col--6 margin-bottom--lg",children:(0,u.jsx)(x,{item:e})},t)))})}},11812:(e,t,n)=>{n.d(t,{W:()=>c});var r=n(30758),i=n(30340);const s=["zero","one","two","few","many","other"];function a(e){return s.filter((t=>e.includes(t)))}const l={locale:"en",pluralForms:a(["one","other"]),select:e=>1===e?"one":"other"};function o(){const{i18n:{currentLocale:e}}=(0,i.A)();return(0,r.useMemo)((()=>{try{return function(e){const t=new Intl.PluralRules(e);return{locale:e,pluralForms:a(t.resolvedOptions().pluralCategories),select:e=>t.select(e)}}(e)}catch(t){return console.error(`Failed to use Intl.PluralRules for locale "${e}".\nDocusaurus will fallback to the default (English) implementation.\nError: ${t.message}\n`),l}}),[e])}function c(){const e=o();return{selectMessage:(t,n)=>function(e,t,n){const r=e.split("|");if(1===r.length)return r[0];r.length>n.pluralForms.length&&console.error(`For locale=${n.locale}, a maximum of ${n.pluralForms.length} plural forms are expected (${n.pluralForms.join(",")}), but the message contains ${r.length}: ${e}`);const i=n.select(t),s=n.pluralForms.indexOf(i);return r[Math.min(s,r.length-1)]}(n,t,e)}}}}]);
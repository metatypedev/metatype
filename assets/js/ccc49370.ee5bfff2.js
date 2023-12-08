"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[6103],{25671:(e,t,n)=>{n.d(t,{Z:()=>c});n(50959);var a=n(45924),i=n(3457);const o={tableOfContents:"tableOfContents_MR10",docItemContainer:"docItemContainer_lXwI"};var s=n(11527);const r="table-of-contents__link toc-highlight",l="table-of-contents__link--active";function c(e){let{className:t,...n}=e;return(0,s.jsx)("div",{className:(0,a.Z)(o.tableOfContents,"thin-scrollbar",t),children:(0,s.jsx)(i.Z,{...n,linkClassName:r,linkActiveClassName:l})})}},3457:(e,t,n)=>{n.d(t,{Z:()=>h});var a=n(50959),i=n(18828);function o(e){const t=e.map((e=>({...e,parentIndex:-1,children:[]}))),n=Array(7).fill(-1);t.forEach(((e,t)=>{const a=n.slice(2,e.level);e.parentIndex=Math.max(...a),n[e.level]=t}));const a=[];return t.forEach((e=>{const{parentIndex:n,...i}=e;n>=0?t[n].children.push(i):a.push(i)})),a}function s(e){let{toc:t,minHeadingLevel:n,maxHeadingLevel:a}=e;return t.flatMap((e=>{const t=s({toc:e.children,minHeadingLevel:n,maxHeadingLevel:a});return function(e){return e.level>=n&&e.level<=a}(e)?[{...e,children:t}]:t}))}function r(e){const t=e.getBoundingClientRect();return t.top===t.bottom?r(e.parentNode):t}function l(e,t){let{anchorTopOffset:n}=t;const a=e.find((e=>r(e).top>=n));if(a){return function(e){return e.top>0&&e.bottom<window.innerHeight/2}(r(a))?a:e[e.indexOf(a)-1]??null}return e[e.length-1]??null}function c(){const e=(0,a.useRef)(0),{navbar:{hideOnScroll:t}}=(0,i.L)();return(0,a.useEffect)((()=>{e.current=t?0:document.querySelector(".navbar").clientHeight}),[t]),e}function d(e){const t=(0,a.useRef)(void 0),n=c();(0,a.useEffect)((()=>{if(!e)return()=>{};const{linkClassName:a,linkActiveClassName:i,minHeadingLevel:o,maxHeadingLevel:s}=e;function r(){const e=function(e){return Array.from(document.getElementsByClassName(e))}(a),r=function(e){let{minHeadingLevel:t,maxHeadingLevel:n}=e;const a=[];for(let i=t;i<=n;i+=1)a.push(`h${i}.anchor`);return Array.from(document.querySelectorAll(a.join()))}({minHeadingLevel:o,maxHeadingLevel:s}),c=l(r,{anchorTopOffset:n.current}),d=e.find((e=>c&&c.id===function(e){return decodeURIComponent(e.href.substring(e.href.indexOf("#")+1))}(e)));e.forEach((e=>{!function(e,n){n?(t.current&&t.current!==e&&t.current.classList.remove(i),e.classList.add(i),t.current=e):e.classList.remove(i)}(e,e===d)}))}return document.addEventListener("scroll",r),document.addEventListener("resize",r),r(),()=>{document.removeEventListener("scroll",r),document.removeEventListener("resize",r)}}),[e,n])}var u=n(7587),m=n(11527);function f(e){let{toc:t,className:n,linkClassName:a,isChild:i}=e;return t.length?(0,m.jsx)("ul",{className:i?void 0:n,children:t.map((e=>(0,m.jsxs)("li",{children:[(0,m.jsx)(u.Z,{to:`#${e.id}`,className:a??void 0,dangerouslySetInnerHTML:{__html:e.value}}),(0,m.jsx)(f,{isChild:!0,toc:e.children,className:n,linkClassName:a})]},e.id)))}):null}const g=a.memo(f);function h(e){let{toc:t,className:n="table-of-contents table-of-contents__left-border",linkClassName:r="table-of-contents__link",linkActiveClassName:l,minHeadingLevel:c,maxHeadingLevel:u,...f}=e;const h=(0,i.L)(),v=c??h.tableOfContents.minHeadingLevel,x=u??h.tableOfContents.maxHeadingLevel,p=function(e){let{toc:t,minHeadingLevel:n,maxHeadingLevel:i}=e;return(0,a.useMemo)((()=>s({toc:o(t),minHeadingLevel:n,maxHeadingLevel:i})),[t,n,i])}({toc:t,minHeadingLevel:v,maxHeadingLevel:x});return d((0,a.useMemo)((()=>{if(r&&l)return{linkClassName:r,linkActiveClassName:l,minHeadingLevel:v,maxHeadingLevel:x}}),[r,l,v,x])),(0,m.jsx)(g,{toc:p,className:n,linkClassName:r,...f})}},92434:(e,t,n)=>{n.d(t,{Z:()=>f});n(50959);var a=n(45924),i=n(61189),o=n(4626),s=n(11527);function r(){return(0,s.jsx)(i.Z,{id:"theme.unlistedContent.title",description:"The unlisted content banner title",children:"Unlisted page"})}function l(){return(0,s.jsx)(i.Z,{id:"theme.unlistedContent.message",description:"The unlisted content banner message",children:"This page is unlisted. Search engines will not index it, and only users having a direct link can access it."})}function c(){return(0,s.jsx)(o.Z,{children:(0,s.jsx)("meta",{name:"robots",content:"noindex, nofollow"})})}var d=n(93214),u=n(2102);function m(e){let{className:t}=e;return(0,s.jsx)(u.Z,{type:"caution",title:(0,s.jsx)(r,{}),className:(0,a.Z)(t,d.k.common.unlistedBanner),children:(0,s.jsx)(l,{})})}function f(e){return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(c,{}),(0,s.jsx)(m,{...e})]})}},83407:(e,t,n)=>{n.r(t),n.d(t,{default:()=>j});var a=n(50959),i=n(45924),o=n(20693),s=n(93214),r=n(38330),l=n(17096),c=n(93373),d=n(61189),u=n(78786),m=n(11527);function f(e){const{nextItem:t,prevItem:n}=e;return(0,m.jsxs)("nav",{className:"pagination-nav docusaurus-mt-lg","aria-label":(0,d.I)({id:"theme.blog.post.paginator.navAriaLabel",message:"Blog post page navigation",description:"The ARIA label for the blog posts pagination"}),children:[n&&(0,m.jsx)(u.Z,{...n,subLabel:(0,m.jsx)(d.Z,{id:"theme.blog.post.paginator.newerPost",description:"The blog post button label to navigate to the newer/previous post",children:"Newer Post"})}),t&&(0,m.jsx)(u.Z,{...t,subLabel:(0,m.jsx)(d.Z,{id:"theme.blog.post.paginator.olderPost",description:"The blog post button label to navigate to the older/next post",children:"Older Post"}),isNext:!0})]})}function g(){const{assets:e,metadata:t}=(0,r.C)(),{title:n,description:a,date:i,tags:s,authors:l,frontMatter:c}=t,{keywords:d}=c,u=e.image??c.image;return(0,m.jsxs)(o.d,{title:n,description:a,keywords:d,image:u,children:[(0,m.jsx)("meta",{property:"og:type",content:"article"}),(0,m.jsx)("meta",{property:"article:published_time",content:i}),l.some((e=>e.url))&&(0,m.jsx)("meta",{property:"article:author",content:l.map((e=>e.url)).filter(Boolean).join(",")}),s.length>0&&(0,m.jsx)("meta",{property:"article:tag",content:s.map((e=>e.label)).join(",")})]})}var h=n(25671),v=n(92434);function x(e){let{sidebar:t,children:n}=e;const{metadata:a,toc:i}=(0,r.C)(),{nextItem:o,prevItem:s,frontMatter:d,unlisted:u}=a,{hide_table_of_contents:g,toc_min_heading_level:x,toc_max_heading_level:p}=d;return(0,m.jsxs)(l.Z,{sidebar:t,toc:!g&&i.length>0?(0,m.jsx)(h.Z,{toc:i,minHeadingLevel:x,maxHeadingLevel:p}):void 0,children:[u&&(0,m.jsx)(v.Z,{}),(0,m.jsx)(c.Z,{children:n}),(o||s)&&(0,m.jsx)(f,{nextItem:o,prevItem:s})]})}function p(e){const t=e.content;return(0,m.jsx)(r.n,{content:e.content,isBlogPostPage:!0,children:(0,m.jsxs)(o.FG,{className:(0,i.Z)(s.k.wrapper.blogPages,s.k.page.blogPostPage),children:[(0,m.jsx)(g,{}),(0,m.jsx)(x,{sidebar:e.sidebar,children:(0,m.jsx)(t,{})})]})})}var b=n(80586);function j(e){return a.createElement(b._.Provider,{value:e.content.frontMatter},a.createElement(p,{...e}))}},80586:(e,t,n)=>{n.d(t,{Z:()=>o,_:()=>i});var a=n(50959);const i=(0,a.createContext)(null);function o(){const e=(0,a.useContext)(i);if(null===e)throw new TypeError("No front matter context is available for `useFrontMatter()`.");return e}i.displayName="FrontMatterContext"}}]);
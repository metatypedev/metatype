"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[6061],{58318:(e,n,t)=>{t.d(n,{A:()=>c});t(30758);var a=t(13526),i=t(85113);const s={tableOfContents:"tableOfContents_tFzd",docItemContainer:"docItemContainer_iYSV"};var l=t(86070);const r="table-of-contents__link toc-highlight",o="table-of-contents__link--active";function c(e){let{className:n,...t}=e;return(0,l.jsx)("div",{className:(0,a.A)(s.tableOfContents,"thin-scrollbar",n),children:(0,l.jsx)(i.A,{...t,linkClassName:r,linkActiveClassName:o})})}},85113:(e,n,t)=>{t.d(n,{A:()=>h});var a=t(30758),i=t(13929);function s(e){const n=e.map((e=>({...e,parentIndex:-1,children:[]}))),t=Array(7).fill(-1);n.forEach(((e,n)=>{const a=t.slice(2,e.level);e.parentIndex=Math.max(...a),t[e.level]=n}));const a=[];return n.forEach((e=>{const{parentIndex:t,...i}=e;t>=0?n[t].children.push(i):a.push(i)})),a}function l(e){let{toc:n,minHeadingLevel:t,maxHeadingLevel:a}=e;return n.flatMap((e=>{const n=l({toc:e.children,minHeadingLevel:t,maxHeadingLevel:a});return function(e){return e.level>=t&&e.level<=a}(e)?[{...e,children:n}]:n}))}function r(e){const n=e.getBoundingClientRect();return n.top===n.bottom?r(e.parentNode):n}function o(e,n){let{anchorTopOffset:t}=n;const a=e.find((e=>r(e).top>=t));if(a){return function(e){return e.top>0&&e.bottom<window.innerHeight/2}(r(a))?a:e[e.indexOf(a)-1]??null}return e[e.length-1]??null}function c(){const e=(0,a.useRef)(0),{navbar:{hideOnScroll:n}}=(0,i.p)();return(0,a.useEffect)((()=>{e.current=n?0:document.querySelector(".navbar").clientHeight}),[n]),e}function d(e){const n=(0,a.useRef)(void 0),t=c();(0,a.useEffect)((()=>{if(!e)return()=>{};const{linkClassName:a,linkActiveClassName:i,minHeadingLevel:s,maxHeadingLevel:l}=e;function r(){const e=function(e){return Array.from(document.getElementsByClassName(e))}(a),r=function(e){let{minHeadingLevel:n,maxHeadingLevel:t}=e;const a=[];for(let i=n;i<=t;i+=1)a.push(`h${i}.anchor`);return Array.from(document.querySelectorAll(a.join()))}({minHeadingLevel:s,maxHeadingLevel:l}),c=o(r,{anchorTopOffset:t.current}),d=e.find((e=>c&&c.id===function(e){return decodeURIComponent(e.href.substring(e.href.indexOf("#")+1))}(e)));e.forEach((e=>{!function(e,t){t?(n.current&&n.current!==e&&n.current.classList.remove(i),e.classList.add(i),n.current=e):e.classList.remove(i)}(e,e===d)}))}return document.addEventListener("scroll",r),document.addEventListener("resize",r),r(),()=>{document.removeEventListener("scroll",r),document.removeEventListener("resize",r)}}),[e,t])}var m=t(92076),u=t(86070);function f(e){let{toc:n,className:t,linkClassName:a,isChild:i}=e;return n.length?(0,u.jsx)("ul",{className:i?void 0:t,children:n.map((e=>(0,u.jsxs)("li",{children:[(0,u.jsx)(m.A,{to:`#${e.id}`,className:a??void 0,dangerouslySetInnerHTML:{__html:e.value}}),(0,u.jsx)(f,{isChild:!0,toc:e.children,className:t,linkClassName:a})]},e.id)))}):null}const v=a.memo(f);function h(e){let{toc:n,className:t="table-of-contents table-of-contents__left-border",linkClassName:r="table-of-contents__link",linkActiveClassName:o,minHeadingLevel:c,maxHeadingLevel:m,...f}=e;const h=(0,i.p)(),g=c??h.tableOfContents.minHeadingLevel,x=m??h.tableOfContents.maxHeadingLevel,p=function(e){let{toc:n,minHeadingLevel:t,maxHeadingLevel:i}=e;return(0,a.useMemo)((()=>l({toc:s(n),minHeadingLevel:t,maxHeadingLevel:i})),[n,t,i])}({toc:n,minHeadingLevel:g,maxHeadingLevel:x});return d((0,a.useMemo)((()=>{if(r&&o)return{linkClassName:r,linkActiveClassName:o,minHeadingLevel:g,maxHeadingLevel:x}}),[r,o,g,x])),(0,u.jsx)(v,{toc:p,className:t,linkClassName:r,...f})}},99267:(e,n,t)=>{t.d(n,{A:()=>f});t(30758);var a=t(13526),i=t(88237),s=t(74650),l=t(86070);function r(){return(0,l.jsx)(i.A,{id:"theme.unlistedContent.title",description:"The unlisted content banner title",children:"Unlisted page"})}function o(){return(0,l.jsx)(i.A,{id:"theme.unlistedContent.message",description:"The unlisted content banner message",children:"This page is unlisted. Search engines will not index it, and only users having a direct link can access it."})}function c(){return(0,l.jsx)(s.A,{children:(0,l.jsx)("meta",{name:"robots",content:"noindex, nofollow"})})}var d=t(81274),m=t(39143);function u(e){let{className:n}=e;return(0,l.jsx)(m.A,{type:"caution",title:(0,l.jsx)(r,{}),className:(0,a.A)(n,d.G.common.unlistedBanner),children:(0,l.jsx)(o,{})})}function f(e){return(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(c,{}),(0,l.jsx)(u,{...e})]})}},43685:(e,n,t)=>{t.r(n),t.d(n,{default:()=>g});var a=t(53666),i=t(30758),s=t(13526),l=t(64204),r=t(81274),o=t(22653),c=t(81388),d=t(58318),m=t(99267),u=t(17482);const f={mdxPageWrapper:"mdxPageWrapper_VhVg"};var v=t(86070);function h(e){const{content:n}=e,{metadata:{title:t,editUrl:a,description:i,frontMatter:h,unlisted:g,lastUpdatedBy:x,lastUpdatedAt:p},assets:L}=n,{keywords:N,wrapperClassName:j,hide_table_of_contents:A}=h,C=L.image??h.image,b=!!(a||p||x);return(0,v.jsx)(l.e3,{className:(0,s.A)(j??r.G.wrapper.mdxPages,r.G.page.mdxPage),children:(0,v.jsxs)(o.A,{children:[(0,v.jsx)(l.be,{title:t,description:i,keywords:N,image:C}),(0,v.jsx)("main",{className:"container container--fluid margin-vert--lg",children:(0,v.jsxs)("div",{className:(0,s.A)("row",f.mdxPageWrapper),children:[(0,v.jsxs)("div",{className:(0,s.A)("col",!A&&"col--8"),children:[g&&(0,v.jsx)(m.A,{}),(0,v.jsx)("article",{children:(0,v.jsx)(c.A,{children:(0,v.jsx)(n,{})})}),b&&(0,v.jsx)(u.A,{className:(0,s.A)("margin-top--sm",r.G.pages.pageFooterEditMetaRow),editUrl:a,lastUpdatedAt:p,lastUpdatedBy:x})]}),!A&&n.toc.length>0&&(0,v.jsx)("div",{className:"col col--2",children:(0,v.jsx)(d.A,{toc:n.toc,minHeadingLevel:h.toc_min_heading_level,maxHeadingLevel:h.toc_max_heading_level})})]})})]})})}function g(e){return i.createElement(a.o.Provider,{value:e.content.frontMatter},i.createElement(h,{...e}))}},53666:(e,n,t)=>{t.d(n,{A:()=>s,o:()=>i});var a=t(30758);const i=(0,a.createContext)(null);function s(){const e=(0,a.useContext)(i);if(null===e)throw new TypeError("No front matter context is available for `useFrontMatter()`.");return e}i.displayName="FrontMatterContext"}}]);
"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[8401],{90399:(e,t,n)=>{n.d(t,{A:()=>o});n(30758);var s=n(13526),a=n(92076),i=n(86070);function o(e){const{permalink:t,title:n,subLabel:o,isNext:l}=e;return(0,i.jsxs)(a.A,{className:(0,s.A)("pagination-nav__link",l?"pagination-nav__link--next":"pagination-nav__link--prev"),to:t,children:[o&&(0,i.jsx)("div",{className:"pagination-nav__sublabel",children:o}),(0,i.jsx)("div",{className:"pagination-nav__label",children:n})]})}},58318:(e,t,n)=>{n.d(t,{A:()=>c});n(30758);var s=n(13526),a=n(85113);const i={tableOfContents:"tableOfContents_tFzd",docItemContainer:"docItemContainer_iYSV"};var o=n(86070);const l="table-of-contents__link toc-highlight",r="table-of-contents__link--active";function c(e){let{className:t,...n}=e;return(0,o.jsx)("div",{className:(0,s.A)(i.tableOfContents,"thin-scrollbar",t),children:(0,o.jsx)(a.A,{...n,linkClassName:l,linkActiveClassName:r})})}},85113:(e,t,n)=>{n.d(t,{A:()=>g});var s=n(30758),a=n(13929);function i(e){const t=e.map((e=>({...e,parentIndex:-1,children:[]}))),n=Array(7).fill(-1);t.forEach(((e,t)=>{const s=n.slice(2,e.level);e.parentIndex=Math.max(...s),n[e.level]=t}));const s=[];return t.forEach((e=>{const{parentIndex:n,...a}=e;n>=0?t[n].children.push(a):s.push(a)})),s}function o(e){let{toc:t,minHeadingLevel:n,maxHeadingLevel:s}=e;return t.flatMap((e=>{const t=o({toc:e.children,minHeadingLevel:n,maxHeadingLevel:s});return function(e){return e.level>=n&&e.level<=s}(e)?[{...e,children:t}]:t}))}function l(e){const t=e.getBoundingClientRect();return t.top===t.bottom?l(e.parentNode):t}function r(e,t){let{anchorTopOffset:n}=t;const s=e.find((e=>l(e).top>=n));if(s){return function(e){return e.top>0&&e.bottom<window.innerHeight/2}(l(s))?s:e[e.indexOf(s)-1]??null}return e[e.length-1]??null}function c(){const e=(0,s.useRef)(0),{navbar:{hideOnScroll:t}}=(0,a.p)();return(0,s.useEffect)((()=>{e.current=t?0:document.querySelector(".navbar").clientHeight}),[t]),e}function d(e){const t=(0,s.useRef)(void 0),n=c();(0,s.useEffect)((()=>{if(!e)return()=>{};const{linkClassName:s,linkActiveClassName:a,minHeadingLevel:i,maxHeadingLevel:o}=e;function l(){const e=function(e){return Array.from(document.getElementsByClassName(e))}(s),l=function(e){let{minHeadingLevel:t,maxHeadingLevel:n}=e;const s=[];for(let a=t;a<=n;a+=1)s.push(`h${a}.anchor`);return Array.from(document.querySelectorAll(s.join()))}({minHeadingLevel:i,maxHeadingLevel:o}),c=r(l,{anchorTopOffset:n.current}),d=e.find((e=>c&&c.id===function(e){return decodeURIComponent(e.href.substring(e.href.indexOf("#")+1))}(e)));e.forEach((e=>{!function(e,n){n?(t.current&&t.current!==e&&t.current.classList.remove(a),e.classList.add(a),t.current=e):e.classList.remove(a)}(e,e===d)}))}return document.addEventListener("scroll",l),document.addEventListener("resize",l),l(),()=>{document.removeEventListener("scroll",l),document.removeEventListener("resize",l)}}),[e,n])}var u=n(92076),m=n(86070);function h(e){let{toc:t,className:n,linkClassName:s,isChild:a}=e;return t.length?(0,m.jsx)("ul",{className:a?void 0:n,children:t.map((e=>(0,m.jsxs)("li",{children:[(0,m.jsx)(u.A,{to:`#${e.id}`,className:s??void 0,dangerouslySetInnerHTML:{__html:e.value}}),(0,m.jsx)(h,{isChild:!0,toc:e.children,className:n,linkClassName:s})]},e.id)))}):null}const v=s.memo(h);function g(e){let{toc:t,className:n="table-of-contents table-of-contents__left-border",linkClassName:l="table-of-contents__link",linkActiveClassName:r,minHeadingLevel:c,maxHeadingLevel:u,...h}=e;const g=(0,a.p)(),x=c??g.tableOfContents.minHeadingLevel,b=u??g.tableOfContents.maxHeadingLevel,p=function(e){let{toc:t,minHeadingLevel:n,maxHeadingLevel:a}=e;return(0,s.useMemo)((()=>o({toc:i(t),minHeadingLevel:n,maxHeadingLevel:a})),[t,n,a])}({toc:t,minHeadingLevel:x,maxHeadingLevel:b});return d((0,s.useMemo)((()=>{if(l&&r)return{linkClassName:l,linkActiveClassName:r,minHeadingLevel:x,maxHeadingLevel:b}}),[l,r,x,b])),(0,m.jsx)(v,{toc:p,className:n,linkClassName:l,...h})}},57879:(e,t,n)=>{n.d(t,{A:()=>d});n(30758);var s=n(13526),a=n(88237),i=n(92076);const o={tag:"tag_Dhwh",tagRegular:"tagRegular_MRHg",tagWithCount:"tagWithCount_ooQB"};var l=n(86070);function r(e){let{permalink:t,label:n,count:a,description:r}=e;return(0,l.jsxs)(i.A,{href:t,title:r,className:(0,s.A)(o.tag,a?o.tagWithCount:o.tagRegular),children:[n,a&&(0,l.jsx)("span",{children:a})]})}const c={tags:"tags_uNEg",tag:"tag_mIWc"};function d(e){let{tags:t}=e;return(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)("b",{children:(0,l.jsx)(a.A,{id:"theme.tags.tagsListLabel",description:"The label alongside a tag list",children:"Tags:"})}),(0,l.jsx)("ul",{className:(0,s.A)(c.tags,"padding--none","margin-left--sm"),children:t.map((e=>(0,l.jsx)("li",{className:c.tag,children:(0,l.jsx)(r,{...e})},e.permalink)))})]})}},99267:(e,t,n)=>{n.d(t,{A:()=>h});n(30758);var s=n(13526),a=n(88237),i=n(74650),o=n(86070);function l(){return(0,o.jsx)(a.A,{id:"theme.unlistedContent.title",description:"The unlisted content banner title",children:"Unlisted page"})}function r(){return(0,o.jsx)(a.A,{id:"theme.unlistedContent.message",description:"The unlisted content banner message",children:"This page is unlisted. Search engines will not index it, and only users having a direct link can access it."})}function c(){return(0,o.jsx)(i.A,{children:(0,o.jsx)("meta",{name:"robots",content:"noindex, nofollow"})})}var d=n(81274),u=n(39143);function m(e){let{className:t}=e;return(0,o.jsx)(u.A,{type:"caution",title:(0,o.jsx)(l,{}),className:(0,s.A)(t,d.G.common.unlistedBanner),children:(0,o.jsx)(r,{})})}function h(e){return(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(c,{}),(0,o.jsx)(m,{...e})]})}},75936:(e,t,n)=>{n.r(t),n.d(t,{default:()=>ue});var s=n(53666),a=n(30758),i=n(64204),o=n(94259),l=n(86070);const r=a.createContext(null);function c(e){let{children:t,content:n}=e;const s=function(e){return(0,a.useMemo)((()=>({metadata:e.metadata,frontMatter:e.frontMatter,assets:e.assets,contentTitle:e.contentTitle,toc:e.toc})),[e])}(n);return(0,l.jsx)(r.Provider,{value:s,children:t})}function d(){const e=(0,a.useContext)(r);if(null===e)throw new o.dV("DocProvider");return e}function u(){const{metadata:e,frontMatter:t,assets:n}=d();return(0,l.jsx)(i.be,{title:e.title,description:e.description,keywords:t.keywords,image:n.image??t.image})}var m=n(13526),h=n(20772),v=n(88237),g=n(90399);function x(e){const{previous:t,next:n}=e;return(0,l.jsxs)("nav",{className:"pagination-nav docusaurus-mt-lg","aria-label":(0,v.T)({id:"theme.docs.paginator.navAriaLabel",message:"Docs pages",description:"The ARIA label for the docs pagination"}),children:[t&&(0,l.jsx)(g.A,{...t,subLabel:(0,l.jsx)(v.A,{id:"theme.docs.paginator.previous",description:"The label used to navigate to the previous doc",children:"Previous"})}),n&&(0,l.jsx)(g.A,{...n,subLabel:(0,l.jsx)(v.A,{id:"theme.docs.paginator.next",description:"The label used to navigate to the next doc",children:"Next"}),isNext:!0})]})}function b(){const{metadata:e}=d();return(0,l.jsx)(x,{previous:e.previous,next:e.next})}function p({id:e,host:t,repo:s,repoId:i,category:o,categoryId:r,mapping:c,term:d,strict:u,reactionsEnabled:m,emitMetadata:h,inputPosition:v,theme:g,lang:x,loading:b}){const[p,f]=(0,a.useState)(!1);return(0,a.useEffect)((()=>{p||(n.e(4827).then(n.bind(n,94827)),f(!0))}),[]),p?(0,l.jsx)("giscus-widget",{id:e,host:t,repo:s,repoid:i,category:o,categoryid:r,mapping:c,term:d,strict:u,reactionsenabled:m,emitmetadata:h,inputposition:v,theme:g,lang:x,loading:b}):null}var f=n(64322);function j(){const{colorMode:e}=(0,f.G)();return(0,l.jsx)(p,{repo:"metatypedev/metatype",repoId:"R_kgDOHczuCQ",category:"Comments",categoryId:"DIC_kwDOHczuCc4CSyX-",mapping:"pathname",strict:"0",reactionsEnabled:"1",emitMetadata:"0",inputPosition:"top",theme:e,lang:"en",loading:"lazy"})}const C={giscus:"giscus_TRcM"};function N(e){const t=(0,s.A)();return(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(b,{...e}),!1===t.comments?null:(0,l.jsx)("div",{className:C.giscus,children:(0,l.jsx)(j,{})})]})}var A=n(30340),L=n(92076),_=n(62939),k=n(81274),T=n(23432),H=n(19463);const M={unreleased:function(e){let{siteTitle:t,versionMetadata:n}=e;return(0,l.jsx)(v.A,{id:"theme.docs.versions.unreleasedVersionLabel",description:"The label used to tell the user that he's browsing an unreleased doc version",values:{siteTitle:t,versionLabel:(0,l.jsx)("b",{children:n.label})},children:"This is unreleased documentation for {siteTitle} {versionLabel} version."})},unmaintained:function(e){let{siteTitle:t,versionMetadata:n}=e;return(0,l.jsx)(v.A,{id:"theme.docs.versions.unmaintainedVersionLabel",description:"The label used to tell the user that he's browsing an unmaintained doc version",values:{siteTitle:t,versionLabel:(0,l.jsx)("b",{children:n.label})},children:"This is documentation for {siteTitle} {versionLabel}, which is no longer actively maintained."})}};function y(e){const t=M[e.versionMetadata.banner];return(0,l.jsx)(t,{...e})}function w(e){let{versionLabel:t,to:n,onClick:s}=e;return(0,l.jsx)(v.A,{id:"theme.docs.versions.latestVersionSuggestionLabel",description:"The label used to tell the user to check the latest version",values:{versionLabel:t,latestVersionLink:(0,l.jsx)("b",{children:(0,l.jsx)(L.A,{to:n,onClick:s,children:(0,l.jsx)(v.A,{id:"theme.docs.versions.latestVersionLinkLabel",description:"The label used for the latest version suggestion link label",children:"latest version"})})})},children:"For up-to-date documentation, see the {latestVersionLink} ({versionLabel})."})}function I(e){let{className:t,versionMetadata:n}=e;const{siteConfig:{title:s}}=(0,A.A)(),{pluginId:a}=(0,_.vT)({failfast:!0}),{savePreferredVersionName:i}=(0,T.g1)(a),{latestDocSuggestion:o,latestVersionSuggestion:r}=(0,_.HW)(a),c=o??(d=r).docs.find((e=>e.id===d.mainDocId));var d;return(0,l.jsxs)("div",{className:(0,m.A)(t,k.G.docs.docVersionBanner,"alert alert--warning margin-bottom--md"),role:"alert",children:[(0,l.jsx)("div",{children:(0,l.jsx)(y,{siteTitle:s,versionMetadata:n})}),(0,l.jsx)("div",{className:"margin-top--md",children:(0,l.jsx)(w,{versionLabel:r.label,to:c.path,onClick:()=>i(r.name)})})]})}function E(e){let{className:t}=e;const n=(0,H.r)();return n.banner?(0,l.jsx)(I,{className:t,versionMetadata:n}):null}function B(e){let{className:t}=e;const n=(0,H.r)();return n.badge?(0,l.jsx)("span",{className:(0,m.A)(t,k.G.docs.docVersionBadge,"badge badge--secondary"),children:(0,l.jsx)(v.A,{id:"theme.docs.versionBadge.label",values:{versionLabel:n.label},children:"Version: {versionLabel}"})}):null}var O=n(57879),S=n(17482);function R(){const{metadata:e}=d(),{editUrl:t,lastUpdatedAt:n,lastUpdatedBy:s,tags:a}=e,i=a.length>0,o=!!(t||n||s);return i||o?(0,l.jsxs)("footer",{className:(0,m.A)(k.G.docs.docFooter,"docusaurus-mt-lg"),children:[i&&(0,l.jsx)("div",{className:(0,m.A)("row margin-top--sm",k.G.docs.docFooterTagsRow),children:(0,l.jsx)("div",{className:"col",children:(0,l.jsx)(O.A,{tags:a})})}),o&&(0,l.jsx)(S.A,{className:(0,m.A)("margin-top--sm",k.G.docs.docFooterEditMetaRow),editUrl:t,lastUpdatedAt:n,lastUpdatedBy:s})]}):null}var F=n(53609),V=n(85113);const P={tocCollapsibleButton:"tocCollapsibleButton_akNF",tocCollapsibleButtonExpanded:"tocCollapsibleButtonExpanded_EytF"};function D(e){let{collapsed:t,...n}=e;return(0,l.jsx)("button",{type:"button",...n,className:(0,m.A)("clean-btn",P.tocCollapsibleButton,!t&&P.tocCollapsibleButtonExpanded,n.className),children:(0,l.jsx)(v.A,{id:"theme.TOCCollapsible.toggleButtonLabel",description:"The label used by the button on the collapsible TOC component",children:"On this page"})})}const G={tocCollapsible:"tocCollapsible_MFDN",tocCollapsibleContent:"tocCollapsibleContent_dgvO",tocCollapsibleExpanded:"tocCollapsibleExpanded_fsq8"};function z(e){let{toc:t,className:n,minHeadingLevel:s,maxHeadingLevel:a}=e;const{collapsed:i,toggleCollapsed:o}=(0,F.u)({initialState:!0});return(0,l.jsxs)("div",{className:(0,m.A)(G.tocCollapsible,!i&&G.tocCollapsibleExpanded,n),children:[(0,l.jsx)(D,{collapsed:i,onClick:o}),(0,l.jsx)(F.N,{lazy:!0,className:G.tocCollapsibleContent,collapsed:i,children:(0,l.jsx)(V.A,{toc:t,minHeadingLevel:s,maxHeadingLevel:a})})]})}const U={tocMobile:"tocMobile_qhp8"};function W(){const{toc:e,frontMatter:t}=d();return(0,l.jsx)(z,{toc:e,minHeadingLevel:t.toc_min_heading_level,maxHeadingLevel:t.toc_max_heading_level,className:(0,m.A)(k.G.docs.docTocMobile,U.tocMobile)})}var q=n(58318);function $(){const{toc:e,frontMatter:t}=d();return(0,l.jsx)(q.A,{toc:e,minHeadingLevel:t.toc_min_heading_level,maxHeadingLevel:t.toc_max_heading_level,className:k.G.docs.docTocDesktop})}var Q=n(55230),Y=n(81388);function Z(e){let{children:t}=e;const n=function(){const{metadata:e,frontMatter:t,contentTitle:n}=d();return t.hide_title||void 0!==n?null:e.title}();return(0,l.jsxs)("div",{className:(0,m.A)(k.G.docs.docMarkdown,"markdown"),children:[n&&(0,l.jsx)("header",{children:(0,l.jsx)(Q.A,{as:"h1",children:n})}),(0,l.jsx)(Y.A,{children:t})]})}var J=n(52295),X=n(74768),K=n(94887);function ee(e){return(0,l.jsx)("svg",{viewBox:"0 0 24 24",...e,children:(0,l.jsx)("path",{d:"M10 19v-5h4v5c0 .55.45 1 1 1h3c.55 0 1-.45 1-1v-7h1.7c.46 0 .68-.57.33-.87L12.67 3.6c-.38-.34-.96-.34-1.34 0l-8.36 7.53c-.34.3-.13.87.33.87H5v7c0 .55.45 1 1 1h3c.55 0 1-.45 1-1z",fill:"currentColor"})})}const te={breadcrumbHomeIcon:"breadcrumbHomeIcon_NcpS"};function ne(){const e=(0,K.Ay)("/");return(0,l.jsx)("li",{className:"breadcrumbs__item",children:(0,l.jsx)(L.A,{"aria-label":(0,v.T)({id:"theme.docs.breadcrumbs.home",message:"Home page",description:"The ARIA label for the home page in the breadcrumbs"}),className:"breadcrumbs__link",href:e,children:(0,l.jsx)(ee,{className:te.breadcrumbHomeIcon})})})}const se={breadcrumbsContainer:"breadcrumbsContainer_VZmz"};function ae(e){let{children:t,href:n,isLast:s}=e;const a="breadcrumbs__link";return s?(0,l.jsx)("span",{className:a,itemProp:"name",children:t}):n?(0,l.jsx)(L.A,{className:a,href:n,itemProp:"item",children:(0,l.jsx)("span",{itemProp:"name",children:t})}):(0,l.jsx)("span",{className:a,children:t})}function ie(e){let{children:t,active:n,index:s,addMicrodata:a}=e;return(0,l.jsxs)("li",{...a&&{itemScope:!0,itemProp:"itemListElement",itemType:"https://schema.org/ListItem"},className:(0,m.A)("breadcrumbs__item",{"breadcrumbs__item--active":n}),children:[t,(0,l.jsx)("meta",{itemProp:"position",content:String(s+1)})]})}function oe(){const e=(0,J.OF)(),t=(0,X.Dt)();return e?(0,l.jsx)("nav",{className:(0,m.A)(k.G.docs.docBreadcrumbs,se.breadcrumbsContainer),"aria-label":(0,v.T)({id:"theme.docs.breadcrumbs.navAriaLabel",message:"Breadcrumbs",description:"The ARIA label for the breadcrumbs"}),children:(0,l.jsxs)("ul",{className:"breadcrumbs",itemScope:!0,itemType:"https://schema.org/BreadcrumbList",children:[t&&(0,l.jsx)(ne,{}),e.map(((t,n)=>{const s=n===e.length-1,a="category"===t.type&&t.linkUnlisted?void 0:t.href;return(0,l.jsx)(ie,{active:s,index:n,addMicrodata:!!a,children:(0,l.jsx)(ae,{href:a,isLast:s,children:t.label})},n)}))]})}):null}var le=n(99267);const re={docItemContainer:"docItemContainer_WZhY",docItemCol:"docItemCol_hJf7"};function ce(e){let{children:t}=e;const n=function(){const{frontMatter:e,toc:t}=d(),n=(0,h.l)(),s=e.hide_table_of_contents,a=!s&&t.length>0;return{hidden:s,mobile:a?(0,l.jsx)(W,{}):void 0,desktop:!a||"desktop"!==n&&"ssr"!==n?void 0:(0,l.jsx)($,{})}}(),{metadata:{unlisted:s}}=d();return(0,l.jsxs)("div",{className:"row",children:[(0,l.jsxs)("div",{className:(0,m.A)("col",!n.hidden&&re.docItemCol),children:[s&&(0,l.jsx)(le.A,{}),(0,l.jsx)(E,{}),(0,l.jsxs)("div",{className:re.docItemContainer,children:[(0,l.jsxs)("article",{children:[(0,l.jsx)(oe,{}),(0,l.jsx)(B,{}),n.mobile,(0,l.jsx)(Z,{children:t}),(0,l.jsx)(R,{})]}),(0,l.jsx)(N,{})]})]}),n.desktop&&(0,l.jsx)("div",{className:"col col--3",children:n.desktop})]})}function de(e){const t=`docs-doc-id-${e.content.metadata.id}`,n=e.content;return(0,l.jsx)(c,{content:e.content,children:(0,l.jsxs)(i.e3,{className:t,children:[(0,l.jsx)(u,{}),(0,l.jsx)(ce,{children:(0,l.jsx)(n,{})})]})})}function ue(e){return a.createElement(s.o.Provider,{value:e.content.frontMatter},a.createElement(de,{...e}))}},53666:(e,t,n)=>{n.d(t,{A:()=>i,o:()=>a});var s=n(30758);const a=(0,s.createContext)(null);function i(){const e=(0,s.useContext)(a);if(null===e)throw new TypeError("No front matter context is available for `useFrontMatter()`.");return e}a.displayName="FrontMatterContext"}}]);
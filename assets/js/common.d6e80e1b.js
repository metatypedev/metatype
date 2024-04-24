(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[2076],{80872:(e,t,n)=>{"use strict";n.d(t,{A:()=>$});var o=n(79474),s=n(69648),r=n(13526),c=n(35283),a=n(9100);function l(){const{prism:e}=(0,a.p)(),{colorMode:t}=(0,c.G)(),n=e.theme,o=e.darkTheme||n;return"dark"===t?o:n}var i=n(69021),u=n(34809),d=n.n(u);const f=/title=(?<quote>["'])(?<title>.*?)\1/,m=/\{(?<range>[\d,-]+)\}/,h={js:{start:"\\/\\/",end:""},jsBlock:{start:"\\/\\*",end:"\\*\\/"},jsx:{start:"\\{\\s*\\/\\*",end:"\\*\\/\\s*\\}"},bash:{start:"#",end:""},html:{start:"\x3c!--",end:"--\x3e"}},p={...h,lua:{start:"--",end:""},wasm:{start:"\\;\\;",end:""},tex:{start:"%",end:""},vb:{start:"['\u2018\u2019]",end:""},vbnet:{start:"(?:_\\s*)?['\u2018\u2019]",end:""},rem:{start:"[Rr][Ee][Mm]\\b",end:""},f90:{start:"!",end:""},ml:{start:"\\(\\*",end:"\\*\\)"},cobol:{start:"\\*>",end:""}},b=Object.keys(h);function g(e,t){const n=e.map((e=>{const{start:n,end:o}=p[e];return`(?:${n}\\s*(${t.flatMap((e=>[e.line,e.block?.start,e.block?.end].filter(Boolean))).join("|")})\\s*${o})`})).join("|");return new RegExp(`^\\s*(?:${n})\\s*$`)}function v(e,t){let n=e.replace(/\n$/,"");const{language:o,magicComments:s,metastring:r}=t;if(r&&m.test(r)){const e=r.match(m).groups.range;if(0===s.length)throw new Error(`A highlight range has been given in code block's metastring (\`\`\` ${r}), but no magic comment config is available. Docusaurus applies the first magic comment entry's className for metastring ranges.`);const t=s[0].className,o=d()(e).filter((e=>e>0)).map((e=>[e-1,[t]]));return{lineClassNames:Object.fromEntries(o),code:n}}if(void 0===o)return{lineClassNames:{},code:n};const c=function(e,t){switch(e){case"js":case"javascript":case"ts":case"typescript":return g(["js","jsBlock"],t);case"jsx":case"tsx":return g(["js","jsBlock","jsx"],t);case"html":return g(["js","jsBlock","html"],t);case"python":case"py":case"bash":return g(["bash"],t);case"markdown":case"md":return g(["html","jsx","bash"],t);case"tex":case"latex":case"matlab":return g(["tex"],t);case"lua":case"haskell":case"sql":return g(["lua"],t);case"wasm":return g(["wasm"],t);case"vb":case"vba":case"visual-basic":return g(["vb","rem"],t);case"vbnet":return g(["vbnet","rem"],t);case"batch":return g(["rem"],t);case"basic":return g(["rem","f90"],t);case"fsharp":return g(["js","ml"],t);case"ocaml":case"sml":return g(["ml"],t);case"fortran":return g(["f90"],t);case"cobol":return g(["cobol"],t);default:return g(b,t)}}(o,s),a=n.split("\n"),l=Object.fromEntries(s.map((e=>[e.className,{start:0,range:""}]))),i=Object.fromEntries(s.filter((e=>e.line)).map((e=>{let{className:t,line:n}=e;return[n,t]}))),u=Object.fromEntries(s.filter((e=>e.block)).map((e=>{let{className:t,block:n}=e;return[n.start,t]}))),f=Object.fromEntries(s.filter((e=>e.block)).map((e=>{let{className:t,block:n}=e;return[n.end,t]})));for(let d=0;d<a.length;){const e=a[d].match(c);if(!e){d+=1;continue}const t=e.slice(1).find((e=>void 0!==e));i[t]?l[i[t]].range+=`${d},`:u[t]?l[u[t]].start=d:f[t]&&(l[f[t]].range+=`${l[f[t]].start}-${d-1},`),a.splice(d,1)}n=a.join("\n");const h={};return Object.entries(l).forEach((e=>{let[t,{range:n}]=e;d()(n).forEach((e=>{h[e]??=[],h[e].push(t)}))})),{lineClassNames:h,code:n}}const w={codeBlockContainer:"codeBlockContainer_OCTz"};var y=n(13274);function k(e){let{as:t,...n}=e;const o=function(e){const t={color:"--prism-color",backgroundColor:"--prism-background-color"},n={};return Object.entries(e.plain).forEach((e=>{let[o,s]=e;const r=t[o];r&&"string"==typeof s&&(n[r]=s)})),n}(l());return(0,y.jsx)(t,{...n,style:o,className:(0,r.A)(n.className,w.codeBlockContainer,i.G.common.codeBlock)})}const j={codeBlockContent:"codeBlockContent_ewgz",codeBlockTitle:"codeBlockTitle_ZuDn",codeBlock:"codeBlock_kDgt",codeBlockStandalone:"codeBlockStandalone_M9Bp",codeBlockLines:"codeBlockLines_xeK5",codeBlockLinesWithNumbering:"codeBlockLinesWithNumbering_oYW5",buttonGroup:"buttonGroup_e16Q"};function x(e){let{children:t,className:n}=e;return(0,y.jsx)(k,{as:"pre",tabIndex:0,className:(0,r.A)(j.codeBlockStandalone,"thin-scrollbar",n),children:(0,y.jsx)("code",{className:j.codeBlockLines,children:t})})}var E=n(1830);const B={attributes:!0,characterData:!0,childList:!0,subtree:!0};function N(e,t){const[n,s]=(0,o.useState)(),r=(0,o.useCallback)((()=>{s(e.current?.closest("[role=tabpanel][hidden]"))}),[e,s]);(0,o.useEffect)((()=>{r()}),[r]),function(e,t,n){void 0===n&&(n=B);const s=(0,E._q)(t),r=(0,E.Be)(n);(0,o.useEffect)((()=>{const t=new MutationObserver(s);return e&&t.observe(e,r),()=>t.disconnect()}),[e,s,r])}(n,(e=>{e.forEach((e=>{"attributes"===e.type&&"hidden"===e.attributeName&&(t(),r())}))}),{attributes:!0,characterData:!1,childList:!1,subtree:!1})}var C=n(90369);const S={codeLine:"codeLine_tUvg",codeLineNumber:"codeLineNumber_HMrt",codeLineContent:"codeLineContent_QPmU"};function _(e){let{line:t,classNames:n,showLineNumbers:o,getLineProps:s,getTokenProps:c}=e;1===t.length&&"\n"===t[0].content&&(t[0].content="");const a=s({line:t,className:(0,r.A)(n,o&&S.codeLine)}),l=t.map(((e,t)=>(0,y.jsx)("span",{...c({token:e,key:t})},t)));return(0,y.jsxs)("span",{...a,children:[o?(0,y.jsxs)(y.Fragment,{children:[(0,y.jsx)("span",{className:S.codeLineNumber}),(0,y.jsx)("span",{className:S.codeLineContent,children:l})]}):l,(0,y.jsx)("br",{})]})}var L=n(26567);function A(e){return(0,y.jsx)("svg",{viewBox:"0 0 24 24",...e,children:(0,y.jsx)("path",{fill:"currentColor",d:"M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"})})}function I(e){return(0,y.jsx)("svg",{viewBox:"0 0 24 24",...e,children:(0,y.jsx)("path",{fill:"currentColor",d:"M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"})})}const T={copyButtonCopied:"copyButtonCopied_bPYc",copyButtonIcons:"copyButtonIcons_k6C0",copyButtonIcon:"copyButtonIcon_WKB_",copyButtonSuccessIcon:"copyButtonSuccessIcon_N0JY"};function O(e){let{code:t,className:n}=e;const[s,c]=(0,o.useState)(!1),a=(0,o.useRef)(void 0),l=(0,o.useCallback)((()=>{!function(e,t){let{target:n=document.body}=void 0===t?{}:t;if("string"!=typeof e)throw new TypeError(`Expected parameter \`text\` to be a \`string\`, got \`${typeof e}\`.`);const o=document.createElement("textarea"),s=document.activeElement;o.value=e,o.setAttribute("readonly",""),o.style.contain="strict",o.style.position="absolute",o.style.left="-9999px",o.style.fontSize="12pt";const r=document.getSelection(),c=r.rangeCount>0&&r.getRangeAt(0);n.append(o),o.select(),o.selectionStart=0,o.selectionEnd=e.length;let a=!1;try{a=document.execCommand("copy")}catch{}o.remove(),c&&(r.removeAllRanges(),r.addRange(c)),s&&s.focus()}(t),c(!0),a.current=window.setTimeout((()=>{c(!1)}),1e3)}),[t]);return(0,o.useEffect)((()=>()=>window.clearTimeout(a.current)),[]),(0,y.jsx)("button",{type:"button","aria-label":s?(0,L.T)({id:"theme.CodeBlock.copied",message:"Copied",description:"The copied button label on code blocks"}):(0,L.T)({id:"theme.CodeBlock.copyButtonAriaLabel",message:"Copy code to clipboard",description:"The ARIA label for copy code blocks button"}),title:(0,L.T)({id:"theme.CodeBlock.copy",message:"Copy",description:"The copy button label on code blocks"}),className:(0,r.A)("clean-btn",n,T.copyButton,s&&T.copyButtonCopied),onClick:l,children:(0,y.jsxs)("span",{className:T.copyButtonIcons,"aria-hidden":"true",children:[(0,y.jsx)(A,{className:T.copyButtonIcon}),(0,y.jsx)(I,{className:T.copyButtonSuccessIcon})]})})}function P(e){return(0,y.jsx)("svg",{viewBox:"0 0 24 24",...e,children:(0,y.jsx)("path",{fill:"currentColor",d:"M4 19h6v-2H4v2zM20 5H4v2h16V5zm-3 6H4v2h13.25c1.1 0 2 .9 2 2s-.9 2-2 2H15v-2l-3 3l3 3v-2h2c2.21 0 4-1.79 4-4s-1.79-4-4-4z"})})}const M={wordWrapButtonIcon:"wordWrapButtonIcon_UUHx",wordWrapButtonEnabled:"wordWrapButtonEnabled_eCp2"};function R(e){let{className:t,onClick:n,isEnabled:o}=e;const s=(0,L.T)({id:"theme.CodeBlock.wordWrapToggle",message:"Toggle word wrap",description:"The title attribute for toggle word wrapping button of code block lines"});return(0,y.jsx)("button",{type:"button",onClick:n,className:(0,r.A)("clean-btn",t,o&&M.wordWrapButtonEnabled),"aria-label":s,title:s,children:(0,y.jsx)(P,{className:M.wordWrapButtonIcon,"aria-hidden":"true"})})}function W(e){let{children:t,className:n="",metastring:s,title:c,showLineNumbers:i,language:u}=e;const{prism:{defaultLanguage:d,magicComments:m}}=(0,a.p)(),h=function(e){return e?.toLowerCase()}(u??function(e){const t=e.split(" ").find((e=>e.startsWith("language-")));return t?.replace(/language-/,"")}(n)??d),p=l(),b=function(){const[e,t]=(0,o.useState)(!1),[n,s]=(0,o.useState)(!1),r=(0,o.useRef)(null),c=(0,o.useCallback)((()=>{const n=r.current.querySelector("code");e?n.removeAttribute("style"):(n.style.whiteSpace="pre-wrap",n.style.overflowWrap="anywhere"),t((e=>!e))}),[r,e]),a=(0,o.useCallback)((()=>{const{scrollWidth:e,clientWidth:t}=r.current,n=e>t||r.current.querySelector("code").hasAttribute("style");s(n)}),[r]);return N(r,a),(0,o.useEffect)((()=>{a()}),[e,a]),(0,o.useEffect)((()=>(window.addEventListener("resize",a,{passive:!0}),()=>{window.removeEventListener("resize",a)})),[a]),{codeBlockRef:r,isEnabled:e,isCodeScrollable:n,toggle:c}}(),g=function(e){return e?.match(f)?.groups.title??""}(s)||c,{lineClassNames:w,code:x}=v(t,{metastring:s,language:h,magicComments:m}),E=i??function(e){return Boolean(e?.includes("showLineNumbers"))}(s);return(0,y.jsxs)(k,{as:"div",className:(0,r.A)(n,h&&!n.includes(`language-${h}`)&&`language-${h}`),children:[g&&(0,y.jsx)("div",{className:j.codeBlockTitle,children:g}),(0,y.jsxs)("div",{className:j.codeBlockContent,children:[(0,y.jsx)(C.f4,{theme:p,code:x,language:h??"text",children:e=>{let{className:t,style:n,tokens:o,getLineProps:s,getTokenProps:c}=e;return(0,y.jsx)("pre",{tabIndex:0,ref:b.codeBlockRef,className:(0,r.A)(t,j.codeBlock,"thin-scrollbar"),style:n,children:(0,y.jsx)("code",{className:(0,r.A)(j.codeBlockLines,E&&j.codeBlockLinesWithNumbering),children:o.map(((e,t)=>(0,y.jsx)(_,{line:e,getLineProps:s,getTokenProps:c,classNames:w[t],showLineNumbers:E},t)))})})}}),(0,y.jsxs)("div",{className:j.buttonGroup,children:[(b.isEnabled||b.isCodeScrollable)&&(0,y.jsx)(R,{className:j.codeButton,onClick:()=>b.toggle(),isEnabled:b.isEnabled}),(0,y.jsx)(O,{className:j.codeButton,code:x})]})]})]})}function $(e){let{children:t,...n}=e;const r=(0,s.A)(),c=function(e){return o.Children.toArray(e).some((e=>(0,o.isValidElement)(e)))?e:Array.isArray(e)?e.join(""):e}(t),a="string"==typeof c?W:x;return(0,y.jsx)(a,{...n,children:c},String(r))}},30947:(e,t,n)=>{"use strict";n.d(t,{A:()=>c});n(79474);var o=n(13526);const s={tabItem:"tabItem_zLp8"};var r=n(13274);function c(e){let{children:t,hidden:n,className:c}=e;return(0,r.jsx)("div",{role:"tabpanel",className:(0,o.A)(s.tabItem,c),hidden:n,children:t})}},2222:(e,t,n)=>{"use strict";n.d(t,{m:()=>r});var o=n(79474),s=n(13274);function r(e){let{choices:t,choice:n,onChange:r,className:c,children:a}=e;const l=o.Children.toArray(a).map((e=>{if(!o.isValidElement(e)||!t[e.props?.value])throw new Error("ChoicePicker only accepts children with a value prop");return e})).find((e=>e.props?.value===n));return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)("ul",{className:`pl-0 m-0 list-none text-sm ${c??""}`,children:Object.entries(t).map((e=>{let[t,o]=e;return(0,s.jsx)("li",{className:"inline-block rounded-md overflow-clip my-2 mr-2",children:(0,s.jsx)("div",{children:(0,s.jsxs)("label",{className:"cursor-pointer",children:[(0,s.jsx)("input",{type:"radio",value:t,checked:t===n,onChange:()=>r(t),className:"hidden peer"}),(0,s.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:o})]})})},t)}))}),l]})}},82192:(e,t,n)=>{"use strict";n.d(t,{e:()=>H});let o=0;function s(e,t){const n="atom"+ ++o,s={toString:()=>n};return"function"==typeof e?s.read=e:(s.init=e,s.read=r,s.write=c),t&&(s.write=t),s}function r(e){return e(this)}function c(e,t,n){return t(this,"function"==typeof n?n(e(this)):n)}const a=(e,t)=>e.unstable_is?e.unstable_is(t):t===e,l=e=>"init"in e,i=e=>!!e.write,u=new WeakMap,d=(e,t)=>{const n=u.get(e);n&&(u.delete(e),n(t))},f=(e,t)=>{e.status="fulfilled",e.value=t},m=(e,t)=>{e.status="rejected",e.reason=t},h=(e,t)=>!!e&&"v"in e&&"v"in t&&Object.is(e.v,t.v),p=(e,t)=>!!e&&"e"in e&&"e"in t&&Object.is(e.e,t.e),b=e=>!!e&&"v"in e&&e.v instanceof Promise,g=e=>{if("e"in e)throw e.e;return e.v},v=()=>{const e=new WeakMap,t=new WeakMap,n=[],o=new WeakMap;let s,r;s=new Set,r=new Set;const c=t=>e.get(t),v=(e,t)=>{t.d.forEach(((t,s)=>{var r;if(!o.has(s)){const e=c(s);null==(r=n[n.length-1])||r.add(s),o.set(s,[e,new Set]),e&&v(s,e)}o.get(s)[1].add(e)}))},w=(t,s)=>{var r;Object.freeze(s);const a=c(t);if(e.set(t,s),o.has(t)||(null==(r=n[n.length-1])||r.add(t),o.set(t,[a,new Set]),v(t,s)),b(a)){const e="v"in s?s.v instanceof Promise?s.v:Promise.resolve(s.v):Promise.reject(s.e);a.v!==e&&d(a.v,e)}},y=(e,t,n,o)=>{const s=new Map(o?t.d:null);let r=!1;n.forEach(((n,o)=>{!n&&a(e,o)&&(n=t),n?(s.set(o,n),t.d.get(o)!==n&&(r=!0)):console.warn("[Bug] atom state not found")})),(r||t.d.size!==s.size)&&(t.d=s)},k=(e,t,n,o)=>{const s=c(e),r={d:(null==s?void 0:s.d)||new Map,v:t};if(n&&y(e,r,n,o),h(s,r)&&s.d===r.d)return s;if(b(s)&&b(r)&&((e,t)=>"v"in e&&"v"in t&&e.v.orig&&e.v.orig===t.v.orig)(s,r)){if(s.d===r.d)return s;r.v=s.v}return w(e,r),r},j=(e,n,o,s)=>{if("function"==typeof(null==(r=n)?void 0:r.then)){let r;const a=()=>{const n=c(e);if(!b(n)||n.v!==l)return;const s=k(e,l,o);t.has(e)&&n.d!==s.d&&L(e,s,n.d)},l=new Promise(((e,t)=>{let o=!1;n.then((t=>{o||(o=!0,f(l,t),e(t),a())}),(e=>{o||(o=!0,m(l,e),t(e),a())})),r=t=>{o||(o=!0,t.then((e=>f(l,e)),(e=>m(l,e))),e(t))}}));return l.orig=n,l.status="pending",((e,t)=>{u.set(e,t),e.catch((()=>{})).finally((()=>u.delete(e)))})(l,(e=>{e&&r(e),null==s||s()})),k(e,l,o,!0)}var r;return k(e,n,o)},x=(e,n)=>{const o=c(e);if(!n&&o){if(t.has(e))return o;if(Array.from(o.d).every((([t,n])=>{if(t===e)return!0;const o=x(t);return o===n||h(o,n)})))return o}const s=new Map;let r=!0;const u=t=>{if(a(e,t)){const e=c(t);if(e)return s.set(t,e),g(e);if(l(t))return s.set(t,void 0),t.init;throw new Error("no atom init")}const n=x(t);return s.set(t,n),g(n)};let d,f;const m={get signal(){return d||(d=new AbortController),d.signal},get setSelf(){return i(e)||console.warn("setSelf function cannot be used with read-only atom"),!f&&i(e)&&(f=(...t)=>{if(r&&console.warn("setSelf function cannot be called in sync"),!r)return C(e,...t)}),f}};try{const t=e.read(u,m);return j(e,t,s,(()=>null==d?void 0:d.abort()))}catch(b){return((e,t,n)=>{const o=c(e),s={d:(null==o?void 0:o.d)||new Map,e:t};return n&&y(e,s,n),p(o,s)&&o.d===s.d?o:(w(e,s),s)})(e,b,s)}finally{r=!1}},E=e=>g(x(e)),B=e=>{const n=new Array,s=new Set,r=e=>{if(!s.has(e)){s.add(e);for(const n of(e=>{var n,s;const r=new Set(null==(n=t.get(e))?void 0:n.t);return null==(s=o.get(e))||s[1].forEach((e=>{r.add(e)})),r})(e))e!==n&&r(n);n.push(e)}};r(e);const a=new Set([e]);for(let t=n.length-1;t>=0;--t){const e=n[t],o=c(e);if(!o)continue;let s=!1;for(const t of o.d.keys())if(t!==e&&a.has(t)){s=!0;break}if(s){const t=x(e,!0);h(o,t)||a.add(e)}}},N=(e,...t)=>{const o=e.write((e=>g(x(e))),((t,...o)=>{const r=n.length>0;let i;if(r||n.push(new Set([t])),a(e,t)){if(!l(t))throw new Error("atom not writable");const e=c(t),n=j(t,o[0]);h(e,n)||B(t)}else i=N(t,...o);if(!r){const e=A(n.pop());s.forEach((t=>t({type:"async-write",flushed:e})))}return i}),...t);return o},C=(e,...t)=>{n.push(new Set([e]));const o=N(e,...t),r=A(n.pop());return s.forEach((e=>e({type:"write",flushed:r}))),o},S=(e,n,o)=>{var s;const a=t.get(e);if(a)return n&&a.t.add(n),a;const l=o||[];null==(s=c(e))||s.d.forEach(((t,n)=>{n!==e&&S(n,e,l)})),x(e);const u={t:new Set(n&&[n]),l:new Set};if(t.set(e,u),r.add(e),i(e)&&e.onMount){const{onMount:t}=e;l.push((()=>{const n=t(((...t)=>C(e,...t)));n&&(u.u=n)}))}return o||l.forEach((e=>e())),u},_=(e,n)=>{if(!((e,t)=>!t.l.size&&(!t.t.size||1===t.t.size&&t.t.has(e)))(e,n))return;const o=n.u;o&&o(),t.delete(e),r.delete(e);const s=c(e);s?(b(s)&&d(s.v),s.d.forEach(((n,o)=>{if(o!==e){const n=t.get(o);n&&(n.t.delete(e),_(o,n))}}))):console.warn("[Bug] could not find atom state to unmount",e)},L=(e,n,o)=>{const s=new Set(n.d.keys()),r=new Set;null==o||o.forEach(((n,o)=>{if(s.has(o))return void s.delete(o);r.add(o);const c=t.get(o);c&&c.t.delete(e)})),s.forEach((t=>{S(t,e)})),r.forEach((e=>{const n=t.get(e);n&&_(e,n)}))},A=e=>{let n;n=new Set;const s=[],r=e=>{var t;if(!o.has(e))return;const[n,a]=o.get(e);o.delete(e),s.push([e,n]),a.forEach(r),null==(t=c(e))||t.d.forEach(((e,t)=>r(t)))};return e.forEach(r),s.forEach((([e,o])=>{const s=c(e);if(s){if(s!==o){const r=t.get(e);r&&s.d!==(null==o?void 0:o.d)&&L(e,s,null==o?void 0:o.d),r&&(b(o)||!h(o,s)&&!p(o,s))&&(r.l.forEach((e=>e())),n.add(e))}}else console.warn("[Bug] no atom state to flush")})),n},I=(e,t)=>{const n=S(e),o=A([e]),r=n.l;return r.add(t),s.forEach((e=>e({type:"sub",flushed:o}))),()=>{r.delete(t),_(e,n),s.forEach((e=>e({type:"unsub"})))}};return{get:E,set:C,sub:I,dev_subscribe_store:e=>(s.add(e),()=>{s.delete(e)}),dev_get_mounted_atoms:()=>r.values(),dev_get_atom_state:t=>e.get(t),dev_get_mounted:e=>t.get(e),dev_restore_atoms:e=>{n.push(new Set);for(const[n,o]of e)l(n)&&(j(n,o),B(n));const t=A(n.pop());s.forEach((e=>e({type:"restore",flushed:t})))}}};let w;Symbol("CONTINUE_PROMISE");const y=()=>(w||(w=v(),globalThis.__JOTAI_DEFAULT_STORE__||(globalThis.__JOTAI_DEFAULT_STORE__=w),globalThis.__JOTAI_DEFAULT_STORE__!==w&&console.warn("Detected multiple Jotai instances. It may cause unexpected behavior with the default store. https://github.com/pmndrs/jotai/discussions/2044")),w);var k=n(79474);const j=(0,k.createContext)(void 0),x=e=>{const t=(0,k.useContext)(j);return(null==e?void 0:e.store)||t||y()},E=e=>"function"==typeof(null==e?void 0:e.then),B=k.use||(e=>{if("pending"===e.status)throw e;if("fulfilled"===e.status)return e.value;throw"rejected"===e.status?e.reason:(e.status="pending",e.then((t=>{e.status="fulfilled",e.value=t}),(t=>{e.status="rejected",e.reason=t})),e)});function N(e,t){const n=x(t),[[o,s,r],c]=(0,k.useReducer)((t=>{const o=n.get(e);return Object.is(t[0],o)&&t[1]===n&&t[2]===e?t:[o,n,e]}),void 0,(()=>[n.get(e),n,e]));let a=o;s===n&&r===e||(c(),a=n.get(e));const l=null==t?void 0:t.delay;return(0,k.useEffect)((()=>{const t=n.sub(e,(()=>{"number"!=typeof l?c():setTimeout(c,l)}));return c(),t}),[n,e,l]),(0,k.useDebugValue)(a),E(a)?B(a):a}function C(e,t){const n=x(t);return(0,k.useCallback)(((...t)=>{if(!("write"in e))throw new Error("not writable atom");return n.set(e,...t)}),[n,e])}function S(e,t){return[N(e,t),C(e,t)]}const _=Symbol("RESET");const L=e=>"function"==typeof(null==e?void 0:e.then);function A(e=(()=>{try{return window.localStorage}catch(e){return void("undefined"!=typeof window&&console.warn(e))}}),t){let n,o;const s={getItem:(s,r)=>{var c,a;const l=e=>{if(n!==(e=e||"")){try{o=JSON.parse(e,null==t?void 0:t.reviver)}catch(s){return r}n=e}return o},i=null!=(a=null==(c=e())?void 0:c.getItem(s))?a:null;return L(i)?i.then(l):l(i)},setItem:(n,o)=>{var s;return null==(s=e())?void 0:s.setItem(n,JSON.stringify(o,null==t?void 0:t.replacer))},removeItem:t=>{var n;return null==(n=e())?void 0:n.removeItem(t)}};return"undefined"!=typeof window&&"function"==typeof window.addEventListener&&window.Storage&&(s.subscribe=(t,n,o)=>{if(!(e()instanceof window.Storage))return()=>{};const s=s=>{if(s.storageArea===e()&&s.key===t){let e;try{e=JSON.parse(s.newValue||"")}catch(r){e=o}n(e)}};return window.addEventListener("storage",s),()=>{window.removeEventListener("storage",s)}}),s}const I=A();function T(){return T=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(e[o]=n[o])}return e},T.apply(this,arguments)}const O=()=>"undefined"!=typeof window&&window.location?{pathname:window.location.pathname,searchParams:new URLSearchParams(window.location.search)}:{},P=(e,t)=>{const n=new URL(window.location.href);e.pathname&&(n.pathname=e.pathname),e.searchParams&&(n.search=e.searchParams.toString()),null!=t&&t.replace?window.history.replaceState(null,"",n):window.history.pushState(null,"",n)},M=e=>(window.addEventListener("popstate",e),()=>window.removeEventListener("popstate",e));const R="sdk",W=function(e){var t;const n=(null==e?void 0:e.getLocation)||O,o=(null==e?void 0:e.applyLocation)||P,r=(null==e?void 0:e.subscribe)||M,c=s(null!=(t=null==e?void 0:e.preloaded)?t:n());return c.onMount=e=>{const t=()=>e(n()),o=r(t);return t(),o},s((e=>e(c)),((t,n,s,r={})=>{n(c,s),o(t(c),T({},e,r))}))}(),$=s((e=>e(W).searchParams?.get(R)),((e,t,n)=>{const o=e(W).searchParams??new URLSearchParams;o.set(R,n),t(W,(e=>({...e,searchParams:o})))})),z=function(e,t,n=I,o){const r=s((null==o?void 0:o.getOnInit)?n.getItem(e,t):t);return r.debugPrivate=!0,r.onMount=o=>{let s;return o(n.getItem(e,t)),n.subscribe&&(s=n.subscribe(e,o,t)),s},s((e=>e(r)),((o,s,c)=>{const a="function"==typeof c?c(o(r)):c;return a===_?(s(r,t),n.removeItem(e)):a instanceof Promise?a.then((t=>(s(r,t),n.setItem(e,t)))):(s(r,a),n.setItem(e,a))}))}(R,"typescript",A((()=>sessionStorage)));function H(){const[e,t]=S($),[n,o]=S(z);(0,k.useEffect)((()=>{e&&e!==n&&o(e)}),[e,o]);const s=(0,k.useCallback)((e=>{t(e),o(e)}),[t,o]);return[e??n,s]}},34809:(e,t)=>{function n(e){let t,n=[];for(let o of e.split(",").map((e=>e.trim())))if(/^-?\d+$/.test(o))n.push(parseInt(o,10));else if(t=o.match(/^(-?\d+)(-|\.\.\.?|\u2025|\u2026|\u22EF)(-?\d+)$/)){let[e,o,s,r]=t;if(o&&r){o=parseInt(o),r=parseInt(r);const e=o<r?1:-1;"-"!==s&&".."!==s&&"\u2025"!==s||(r+=e);for(let t=o;t!==r;t+=e)n.push(t)}}return n}t.default=n,e.exports=n},99128:(e,t,n)=>{"use strict";n.d(t,{R:()=>c,x:()=>a});var o=n(79474);const s={},r=o.createContext(s);function c(e){const t=o.useContext(r);return o.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function a(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(s):e.components||s:c(e.components),o.createElement(r.Provider,{value:t},e.children)}}}]);
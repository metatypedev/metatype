"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[2076],{56978:(e,t,n)=>{n.d(t,{A:()=>a});n(79474);var o=n(28923);const r={tabItem:"tabItem_gHWM"};var s=n(13274);function a(e){let{children:t,hidden:n,className:a}=e;return(0,s.jsx)("div",{role:"tabpanel",className:(0,o.A)(r.tabItem,a),hidden:n,children:t})}},50910:(e,t,n)=>{n.d(t,{m:()=>s});var o=n(79474),r=n(13274);function s(e){let{choices:t,choice:n,onChange:s,className:a,children:i}=e;const c=o.Children.toArray(i).map((e=>{if(!o.isValidElement(e)||!t[e.props?.value])throw new Error("ChoicePicker only accepts children with a value prop");return e})).find((e=>e.props?.value===n));return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)("ul",{className:`pl-0 m-0 list-none text-sm ${a??""}`,children:Object.entries(t).map((e=>{let[t,o]=e;return(0,r.jsx)("li",{className:"inline-block rounded-md overflow-clip my-2 mr-2",children:(0,r.jsx)("div",{children:(0,r.jsxs)("label",{className:"cursor-pointer",children:[(0,r.jsx)("input",{type:"radio",value:t,checked:t===n,onChange:()=>s(t),className:"hidden peer"}),(0,r.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:o})]})})},t)}))}),c]})}},88244:(e,t,n)=>{n.d(t,{e:()=>W});let o=0;function r(e,t){const n="atom"+ ++o,r={toString:()=>n};return"function"==typeof e?r.read=e:(r.init=e,r.read=s,r.write=a),t&&(r.write=t),r}function s(e){return e(this)}function a(e,t,n){return t(this,"function"==typeof n?n(e(this)):n)}const i=(e,t)=>e.unstable_is?e.unstable_is(t):t===e,c=e=>"init"in e,l=e=>!!e.write,u=new WeakMap,d=(e,t)=>{const n=u.get(e);n&&(u.delete(e),n(t))},f=(e,t)=>{e.status="fulfilled",e.value=t},h=(e,t)=>{e.status="rejected",e.reason=t},v=(e,t)=>!!e&&"v"in e&&"v"in t&&Object.is(e.v,t.v),w=(e,t)=>!!e&&"e"in e&&"e"in t&&Object.is(e.e,t.e),p=e=>!!e&&"v"in e&&e.v instanceof Promise,m=e=>{if("e"in e)throw e.e;return e.v},g=()=>{const e=new WeakMap,t=new WeakMap,n=[],o=new WeakMap;let r,s;r=new Set,s=new Set;const a=t=>e.get(t),g=(e,t)=>{t.d.forEach(((t,r)=>{var s;if(!o.has(r)){const e=a(r);null==(s=n[n.length-1])||s.add(r),o.set(r,[e,new Set]),e&&g(r,e)}o.get(r)[1].add(e)}))},b=(t,r)=>{var s;Object.freeze(r);const i=a(t);if(e.set(t,r),o.has(t)||(null==(s=n[n.length-1])||s.add(t),o.set(t,[i,new Set]),g(t,r)),p(i)){const e="v"in r?r.v instanceof Promise?r.v:Promise.resolve(r.v):Promise.reject(r.e);i.v!==e&&d(i.v,e)}},y=(e,t,n,o)=>{const r=new Map(o?t.d:null);let s=!1;n.forEach(((n,o)=>{!n&&i(e,o)&&(n=t),n?(r.set(o,n),t.d.get(o)!==n&&(s=!0)):console.warn("[Bug] atom state not found")})),(s||t.d.size!==r.size)&&(t.d=r)},E=(e,t,n,o)=>{const r=a(e),s={d:(null==r?void 0:r.d)||new Map,v:t};if(n&&y(e,s,n,o),v(r,s)&&r.d===s.d)return r;if(p(r)&&p(s)&&((e,t)=>"v"in e&&"v"in t&&e.v.orig&&e.v.orig===t.v.orig)(r,s)){if(r.d===s.d)return r;s.v=r.v}return b(e,s),s},S=(e,n,o,r)=>{if("function"==typeof(null==(s=n)?void 0:s.then)){let s;const i=()=>{const n=a(e);if(!p(n)||n.v!==c)return;const r=E(e,c,o);t.has(e)&&n.d!==r.d&&C(e,r,n.d)},c=new Promise(((e,t)=>{let o=!1;n.then((t=>{o||(o=!0,f(c,t),e(t),i())}),(e=>{o||(o=!0,h(c,e),t(e),i())})),s=t=>{o||(o=!0,t.then((e=>f(c,e)),(e=>h(c,e))),e(t))}}));return c.orig=n,c.status="pending",((e,t)=>{u.set(e,t),e.catch((()=>{})).finally((()=>u.delete(e)))})(c,(e=>{e&&s(e),null==r||r()})),E(e,c,o,!0)}var s;return E(e,n,o)},_=(e,n)=>{const o=a(e);if(!n&&o){if(t.has(e))return o;if(Array.from(o.d).every((([t,n])=>{if(t===e)return!0;const o=_(t);return o===n||v(o,n)})))return o}const r=new Map;let s=!0;const u=t=>{if(i(e,t)){const e=a(t);if(e)return r.set(t,e),m(e);if(c(t))return r.set(t,void 0),t.init;throw new Error("no atom init")}const n=_(t);return r.set(t,n),m(n)};let d,f;const h={get signal(){return d||(d=new AbortController),d.signal},get setSelf(){return l(e)||console.warn("setSelf function cannot be used with read-only atom"),!f&&l(e)&&(f=(...t)=>{if(s&&console.warn("setSelf function cannot be called in sync"),!s)return k(e,...t)}),f}};try{const t=e.read(u,h);return S(e,t,r,(()=>null==d?void 0:d.abort()))}catch(p){return((e,t,n)=>{const o=a(e),r={d:(null==o?void 0:o.d)||new Map,e:t};return n&&y(e,r,n),w(o,r)&&o.d===r.d?o:(b(e,r),r)})(e,p,r)}finally{s=!1}},j=e=>m(_(e)),I=e=>{const n=new Array,r=new Set,s=e=>{if(!r.has(e)){r.add(e);for(const n of(e=>{var n,r;const s=new Set(null==(n=t.get(e))?void 0:n.t);return null==(r=o.get(e))||r[1].forEach((e=>{s.add(e)})),s})(e))e!==n&&s(n);n.push(e)}};s(e);const i=new Set([e]);for(let t=n.length-1;t>=0;--t){const e=n[t],o=a(e);if(!o)continue;let r=!1;for(const t of o.d.keys())if(t!==e&&i.has(t)){r=!0;break}if(r){const t=_(e,!0);v(o,t)||i.add(e)}}},O=(e,...t)=>{const o=e.write((e=>m(_(e))),((t,...o)=>{const s=n.length>0;let l;if(s||n.push(new Set([t])),i(e,t)){if(!c(t))throw new Error("atom not writable");const e=a(t),n=S(t,o[0]);v(e,n)||I(t)}else l=O(t,...o);if(!s){const e=M(n.pop());r.forEach((t=>t({type:"async-write",flushed:e})))}return l}),...t);return o},k=(e,...t)=>{n.push(new Set([e]));const o=O(e,...t),s=M(n.pop());return r.forEach((e=>e({type:"write",flushed:s}))),o},P=(e,n,o)=>{var r;const i=t.get(e);if(i)return n&&i.t.add(n),i;const c=o||[];null==(r=a(e))||r.d.forEach(((t,n)=>{n!==e&&P(n,e,c)})),_(e);const u={t:new Set(n&&[n]),l:new Set};if(t.set(e,u),s.add(e),l(e)&&e.onMount){const{onMount:t}=e;c.push((()=>{const n=t(((...t)=>k(e,...t)));n&&(u.u=n)}))}return o||c.forEach((e=>e())),u},x=(e,n)=>{if(!((e,t)=>!t.l.size&&(!t.t.size||1===t.t.size&&t.t.has(e)))(e,n))return;const o=n.u;o&&o(),t.delete(e),s.delete(e);const r=a(e);r?(p(r)&&d(r.v),r.d.forEach(((n,o)=>{if(o!==e){const n=t.get(o);n&&(n.t.delete(e),x(o,n))}}))):console.warn("[Bug] could not find atom state to unmount",e)},C=(e,n,o)=>{const r=new Set(n.d.keys()),s=new Set;null==o||o.forEach(((n,o)=>{if(r.has(o))return void r.delete(o);s.add(o);const a=t.get(o);a&&a.t.delete(e)})),r.forEach((t=>{P(t,e)})),s.forEach((e=>{const n=t.get(e);n&&x(e,n)}))},M=e=>{let n;n=new Set;const r=[],s=e=>{var t;if(!o.has(e))return;const[n,i]=o.get(e);o.delete(e),r.push([e,n]),i.forEach(s),null==(t=a(e))||t.d.forEach(((e,t)=>s(t)))};return e.forEach(s),r.forEach((([e,o])=>{const r=a(e);if(r){if(r!==o){const s=t.get(e);s&&r.d!==(null==o?void 0:o.d)&&C(e,r,null==o?void 0:o.d),s&&(p(o)||!v(o,r)&&!w(o,r))&&(s.l.forEach((e=>e())),n.add(e))}}else console.warn("[Bug] no atom state to flush")})),n},T=(e,t)=>{const n=P(e),o=M([e]),s=n.l;return s.add(t),r.forEach((e=>e({type:"sub",flushed:o}))),()=>{s.delete(t),x(e,n),r.forEach((e=>e({type:"unsub"})))}};return{get:j,set:k,sub:T,dev_subscribe_store:e=>(r.add(e),()=>{r.delete(e)}),dev_get_mounted_atoms:()=>s.values(),dev_get_atom_state:t=>e.get(t),dev_get_mounted:e=>t.get(e),dev_restore_atoms:e=>{n.push(new Set);for(const[n,o]of e)c(n)&&(S(n,o),I(n));const t=M(n.pop());r.forEach((e=>e({type:"restore",flushed:t})))}}};let b;Symbol("CONTINUE_PROMISE");const y=()=>(b||(b=g(),globalThis.__JOTAI_DEFAULT_STORE__||(globalThis.__JOTAI_DEFAULT_STORE__=b),globalThis.__JOTAI_DEFAULT_STORE__!==b&&console.warn("Detected multiple Jotai instances. It may cause unexpected behavior with the default store. https://github.com/pmndrs/jotai/discussions/2044")),b);var E=n(79474);const S=(0,E.createContext)(void 0),_=e=>{const t=(0,E.useContext)(S);return(null==e?void 0:e.store)||t||y()},j=e=>"function"==typeof(null==e?void 0:e.then),I=E.use||(e=>{if("pending"===e.status)throw e;if("fulfilled"===e.status)return e.value;throw"rejected"===e.status?e.reason:(e.status="pending",e.then((t=>{e.status="fulfilled",e.value=t}),(t=>{e.status="rejected",e.reason=t})),e)});function O(e,t){const n=_(t),[[o,r,s],a]=(0,E.useReducer)((t=>{const o=n.get(e);return Object.is(t[0],o)&&t[1]===n&&t[2]===e?t:[o,n,e]}),void 0,(()=>[n.get(e),n,e]));let i=o;r===n&&s===e||(a(),i=n.get(e));const c=null==t?void 0:t.delay;return(0,E.useEffect)((()=>{const t=n.sub(e,(()=>{"number"!=typeof c?a():setTimeout(a,c)}));return a(),t}),[n,e,c]),(0,E.useDebugValue)(i),j(i)?I(i):i}function k(e,t){const n=_(t);return(0,E.useCallback)(((...t)=>{if(!("write"in e))throw new Error("not writable atom");return n.set(e,...t)}),[n,e])}function P(e,t){return[O(e,t),k(e,t)]}const x=Symbol("RESET");const C=e=>"function"==typeof(null==e?void 0:e.then);function M(e=(()=>{try{return window.localStorage}catch(e){return void("undefined"!=typeof window&&console.warn(e))}}),t){let n,o;const r={getItem:(r,s)=>{var a,i;const c=e=>{if(n!==(e=e||"")){try{o=JSON.parse(e,null==t?void 0:t.reviver)}catch(r){return s}n=e}return o},l=null!=(i=null==(a=e())?void 0:a.getItem(r))?i:null;return C(l)?l.then(c):c(l)},setItem:(n,o)=>{var r;return null==(r=e())?void 0:r.setItem(n,JSON.stringify(o,null==t?void 0:t.replacer))},removeItem:t=>{var n;return null==(n=e())?void 0:n.removeItem(t)}};return"undefined"!=typeof window&&"function"==typeof window.addEventListener&&window.Storage&&(r.subscribe=(t,n,o)=>{if(!(e()instanceof window.Storage))return()=>{};const r=r=>{if(r.storageArea===e()&&r.key===t){let e;try{e=JSON.parse(r.newValue||"")}catch(s){e=o}n(e)}};return window.addEventListener("storage",r),()=>{window.removeEventListener("storage",r)}}),r}const T=M();function A(){return A=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(e[o]=n[o])}return e},A.apply(this,arguments)}const L=()=>"undefined"!=typeof window&&window.location?{pathname:window.location.pathname,searchParams:new URLSearchParams(window.location.search)}:{},N=(e,t)=>{const n=new URL(window.location.href);e.pathname&&(n.pathname=e.pathname),e.searchParams&&(n.search=e.searchParams.toString()),null!=t&&t.replace?window.history.replaceState(null,"",n):window.history.pushState(null,"",n)},R=e=>(window.addEventListener("popstate",e),()=>window.removeEventListener("popstate",e));const J="sdk",U=function(e){var t;const n=(null==e?void 0:e.getLocation)||L,o=(null==e?void 0:e.applyLocation)||N,s=(null==e?void 0:e.subscribe)||R,a=r(null!=(t=null==e?void 0:e.preloaded)?t:n());return a.onMount=e=>{const t=()=>e(n()),o=s(t);return t(),o},r((e=>e(a)),((t,n,r,s={})=>{n(a,r),o(t(a),A({},e,s))}))}(),z=r((e=>e(U).searchParams?.get(J)),((e,t,n)=>{const o=e(U).searchParams??new URLSearchParams;o.set(J,n),t(U,(e=>({...e,searchParams:o})))})),D=function(e,t,n=T,o){const s=r((null==o?void 0:o.getOnInit)?n.getItem(e,t):t);return s.debugPrivate=!0,s.onMount=o=>{let r;return o(n.getItem(e,t)),n.subscribe&&(r=n.subscribe(e,o,t)),r},r((e=>e(s)),((o,r,a)=>{const i="function"==typeof a?a(o(s)):a;return i===x?(r(s,t),n.removeItem(e)):i instanceof Promise?i.then((t=>(r(s,t),n.setItem(e,t)))):(r(s,i),n.setItem(e,i))}))}(J,"typescript",M((()=>sessionStorage)));function W(){const[e,t]=P(z),[n,o]=P(D);(0,E.useEffect)((()=>{e&&e!==n&&o(e)}),[e,o]);const r=(0,E.useCallback)((e=>{t(e),o(e)}),[t,o]);return[e??n,r]}},99128:(e,t,n)=>{n.d(t,{R:()=>a,x:()=>i});var o=n(79474);const r={},s=o.createContext(r);function a(e){const t=o.useContext(s);return o.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function i(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(r):e.components||r:a(e.components),o.createElement(s.Provider,{value:t},e.children)}}}]);
"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[467,6324],{46324:(e,t,n)=>{n.r(t),n.d(t,{C:()=>a,c:()=>l});var r=n(55508);function i(e,t){for(var n=0;n<t.length;n++){const r=t[n];if("string"!=typeof r&&!Array.isArray(r))for(const t in r)if("default"!==t&&!(t in e)){const n=Object.getOwnPropertyDescriptor(r,t);n&&Object.defineProperty(e,t,n.get?n:{enumerable:!0,get:()=>r[t]})}}return Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}(0,Object.defineProperty)(i,"name",{value:"_mergeNamespaces",configurable:!0});var o=(0,r.r)();const a=(0,r.g)(o),l=i({__proto__:null,default:a},[o])},17728:(e,t,n)=>{n.d(t,{i:()=>r});function r(e,t){var n,r;const{levels:i,indentLevel:o}=e;return((i&&0!==i.length?i.at(-1)-(null!==(n=this.electricInput)&&void 0!==n&&n.test(t)?1:0):o)||0)*((null===(r=this.config)||void 0===r?void 0:r.indentUnit)||0)}(0,Object.defineProperty)(r,"name",{value:"indent",configurable:!0})},90467:(e,t,n)=>{n.r(t);var r=n(46324),i=n(46025),o=n(17728),a=(n(55508),Object.defineProperty);const l=((e,t)=>a(e,"name",{value:t,configurable:!0}))((e=>{const t=(0,i.r5)({eatWhitespace:e=>e.eatWhile(i.pi),lexRules:i.Rq,parseRules:i.vM,editorConfig:{tabSize:e.tabSize}});return{config:e,startState:t.startState,token:t.token,indent:o.i,electricInput:/^\s*[})\]]/,fold:"brace",lineComment:"#",closeBrackets:{pairs:'()[]{}""',explode:"()[]{}"}}}),"graphqlModeFactory");r.C.defineMode("graphql",l)}}]);
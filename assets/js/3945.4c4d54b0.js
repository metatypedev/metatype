"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[3945,172],{30172:(e,t,r)=>{r.r(t),r.d(t,{C:()=>l,c:()=>i});var n=r(24421);function u(e,t){for(var r=0;r<t.length;r++){const n=t[r];if("string"!=typeof n&&!Array.isArray(n))for(const t in n)if("default"!==t&&!(t in e)){const r=Object.getOwnPropertyDescriptor(n,t);r&&Object.defineProperty(e,t,r.get?r:{enumerable:!0,get:()=>n[t]})}}return Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}(0,Object.defineProperty)(u,"name",{value:"_mergeNamespaces",configurable:!0});var a=(0,n.r)();const l=(0,n.g)(a),i=u({__proto__:null,default:l},[a])},5826:(e,t,r)=>{r.d(t,{i:()=>n});function n(e,t){var r,n;const{levels:u,indentLevel:a}=e;return((u&&0!==u.length?u.at(-1)-(null!==(r=this.electricInput)&&void 0!==r&&r.test(t)?1:0):a)||0)*((null===(n=this.config)||void 0===n?void 0:n.indentUnit)||0)}(0,Object.defineProperty)(n,"name",{value:"indent",configurable:!0})},33945:(e,t,r)=>{r.r(t);var n=r(30172),u=r(53208),a=r(5826);r(24421);n.C.defineMode("graphql-results",(e=>{const t=(0,u.Xs)({eatWhitespace:e=>e.eatSpace(),lexRules:l,parseRules:i,editorConfig:{tabSize:e.tabSize}});return{config:e,startState:t.startState,token:t.token,indent:a.i,electricInput:/^\s*[}\]]/,fold:"brace",closeBrackets:{pairs:'[]{}""',explode:"[]{}"}}}));const l={Punctuation:/^\[|]|\{|\}|:|,/,Number:/^-?(?:0|(?:[1-9][0-9]*))(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?/,String:/^"(?:[^"\\]|\\(?:"|\/|\\|b|f|n|r|t|u[0-9a-fA-F]{4}))*"?/,Keyword:/^true|false|null/},i={Document:[(0,u.p)("{"),(0,u.pb)("Entry",(0,u.p)(",")),(0,u.p)("}")],Entry:[(0,u.t)("String","def"),(0,u.p)(":"),"Value"],Value(e){switch(e.kind){case"Number":return"NumberValue";case"String":return"StringValue";case"Punctuation":switch(e.value){case"[":return"ListValue";case"{":return"ObjectValue"}return null;case"Keyword":switch(e.value){case"true":case"false":return"BooleanValue";case"null":return"NullValue"}return null}},NumberValue:[(0,u.t)("Number","number")],StringValue:[(0,u.t)("String","string")],BooleanValue:[(0,u.t)("Keyword","builtin")],NullValue:[(0,u.t)("Keyword","keyword")],ListValue:[(0,u.p)("["),(0,u.pb)("Value",(0,u.p)(",")),(0,u.p)("]")],ObjectValue:[(0,u.p)("{"),(0,u.pb)("ObjectField",(0,u.p)(",")),(0,u.p)("}")],ObjectField:[(0,u.t)("String","property"),(0,u.p)(":"),"Value"]}}}]);
"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[781,3171,124],{43777:(e,t,n)=>{n.d(t,{a:()=>p,b:()=>s,c:()=>f,d:()=>m,e:()=>v,g:()=>u});var o=n(20475),i=n(60037),r=n(26088),a=Object.defineProperty,c=(e,t)=>a(e,"name",{value:t,configurable:!0});function u(e,t){const n={schema:e,type:null,parentType:null,inputType:null,directiveDef:null,fieldDef:null,argDef:null,argDefs:null,objectFieldDefs:null};return(0,r.f)(t,(t=>{var i,r;switch(t.kind){case"Query":case"ShortQuery":n.type=e.getQueryType();break;case"Mutation":n.type=e.getMutationType();break;case"Subscription":n.type=e.getSubscriptionType();break;case"InlineFragment":case"FragmentDefinition":t.type&&(n.type=e.getType(t.type));break;case"Field":case"AliasedField":n.fieldDef=n.type&&t.name?l(e,n.parentType,t.name):null,n.type=null===(i=n.fieldDef)||void 0===i?void 0:i.type;break;case"SelectionSet":n.parentType=n.type?(0,o.MR)(n.type):null;break;case"Directive":n.directiveDef=t.name?e.getDirective(t.name):null;break;case"Arguments":const a=t.prevState?"Field"===t.prevState.kind?n.fieldDef:"Directive"===t.prevState.kind?n.directiveDef:"AliasedField"===t.prevState.kind?t.prevState.name&&l(e,n.parentType,t.prevState.name):null:null;n.argDefs=a?a.args:null;break;case"Argument":if(n.argDef=null,n.argDefs)for(let e=0;e<n.argDefs.length;e++)if(n.argDefs[e].name===t.name){n.argDef=n.argDefs[e];break}n.inputType=null===(r=n.argDef)||void 0===r?void 0:r.type;break;case"EnumValue":const c=n.inputType?(0,o.MR)(n.inputType):null;n.enumValue=c instanceof o.Zb?d(c.getValues(),(e=>e.value===t.name)):null;break;case"ListValue":const u=n.inputType?(0,o.yl)(n.inputType):null;n.inputType=u instanceof o.KT?u.ofType:null;break;case"ObjectValue":const p=n.inputType?(0,o.MR)(n.inputType):null;n.objectFieldDefs=p instanceof o.zP?p.getFields():null;break;case"ObjectField":const s=t.name&&n.objectFieldDefs?n.objectFieldDefs[t.name]:null;n.inputType=null==s?void 0:s.type;break;case"NamedType":n.type=t.name?e.getType(t.name):null}})),n}function l(e,t,n){return n===i.S0.name&&e.getQueryType()===t?i.S0:n===i.Xe.name&&e.getQueryType()===t?i.Xe:n===i.of.name&&(0,o.ML)(t)?i.of:t&&t.getFields?t.getFields()[n]:void 0}function d(e,t){for(let n=0;n<e.length;n++)if(t(e[n]))return e[n]}function p(e){return{kind:"Field",schema:e.schema,field:e.fieldDef,type:y(e.fieldDef)?null:e.parentType}}function s(e){return{kind:"Directive",schema:e.schema,directive:e.directiveDef}}function f(e){return e.directiveDef?{kind:"Argument",schema:e.schema,argument:e.argDef,directive:e.directiveDef}:{kind:"Argument",schema:e.schema,argument:e.argDef,field:e.fieldDef,type:y(e.fieldDef)?null:e.parentType}}function m(e){return{kind:"EnumValue",value:e.enumValue||void 0,type:e.inputType?(0,o.MR)(e.inputType):void 0}}function v(e,t){return{kind:"Type",schema:e.schema,type:t||e.type}}function y(e){return"__"===e.name.slice(0,2)}c(u,"getTypeInfo"),c(l,"getFieldDef"),c(d,"find"),c(p,"getFieldReference"),c(s,"getDirectiveReference"),c(f,"getArgumentReference"),c(m,"getEnumValueReference"),c(v,"getTypeReference"),c(y,"isMetaField")},53171:(e,t,n)=>{n.r(t),n.d(t,{C:()=>a,c:()=>c});var o=n(81205);function i(e,t){for(var n=0;n<t.length;n++){const o=t[n];if("string"!=typeof o&&!Array.isArray(o))for(const t in o)if("default"!==t&&!(t in e)){const n=Object.getOwnPropertyDescriptor(o,t);n&&Object.defineProperty(e,t,n.get?n:{enumerable:!0,get:()=>o[t]})}}return Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}(0,Object.defineProperty)(i,"name",{value:"_mergeNamespaces",configurable:!0});var r=(0,o.r)();const a=(0,o.g)(r),c=i({__proto__:null,default:a},[r])},26088:(e,t,n)=>{n.d(t,{f:()=>o});function o(e,t){const n=[];let o=e;for(;null!=o&&o.kind;)n.push(o),o=o.prevState;for(let i=n.length-1;i>=0;i--)t(n[i])}(0,Object.defineProperty)(o,"name",{value:"forEachState",configurable:!0})},80124:(e,t,n)=>{n.r(t);var o=n(53171),i=(n(81205),Object.defineProperty),r=(e,t)=>i(e,"name",{value:t,configurable:!0});function a(e){return{options:e instanceof Function?{render:e}:!0===e?{}:e}}function c(e){const{options:t}=e.state.info;return(null==t?void 0:t.hoverTime)||500}function u(e,t){const n=e.state.info,i=t.target||t.srcElement;if(!(i instanceof HTMLElement)||"SPAN"!==i.nodeName||void 0!==n.hoverTimeout)return;const a=i.getBoundingClientRect(),u=r((function(){clearTimeout(n.hoverTimeout),n.hoverTimeout=setTimeout(p,s)}),"onMouseMove"),d=r((function(){o.C.off(document,"mousemove",u),o.C.off(e.getWrapperElement(),"mouseout",d),clearTimeout(n.hoverTimeout),n.hoverTimeout=void 0}),"onMouseOut"),p=r((function(){o.C.off(document,"mousemove",u),o.C.off(e.getWrapperElement(),"mouseout",d),n.hoverTimeout=void 0,l(e,a)}),"onHover"),s=c(e);n.hoverTimeout=setTimeout(p,s),o.C.on(document,"mousemove",u),o.C.on(e.getWrapperElement(),"mouseout",d)}function l(e,t){const n=e.coordsChar({left:(t.left+t.right)/2,top:(t.top+t.bottom)/2},"window"),o=e.state.info,{options:i}=o,r=i.render||e.getHelper(n,"info");if(r){const o=e.getTokenAt(n,!0);if(o){const a=r(o,i,e,n);a&&d(e,t,a)}}}function d(e,t,n){const i=document.createElement("div");i.className="CodeMirror-info",i.append(n),document.body.append(i);const a=i.getBoundingClientRect(),c=window.getComputedStyle(i),u=a.right-a.left+parseFloat(c.marginLeft)+parseFloat(c.marginRight),l=a.bottom-a.top+parseFloat(c.marginTop)+parseFloat(c.marginBottom);let d=t.bottom;l>window.innerHeight-t.bottom-15&&t.top>window.innerHeight-t.bottom&&(d=t.top-l),d<0&&(d=t.bottom);let p,s=Math.max(0,window.innerWidth-u-15);s>t.left&&(s=t.left),i.style.opacity="1",i.style.top=d+"px",i.style.left=s+"px";const f=r((function(){clearTimeout(p)}),"onMouseOverPopup"),m=r((function(){clearTimeout(p),p=setTimeout(v,200)}),"onMouseOut"),v=r((function(){o.C.off(i,"mouseover",f),o.C.off(i,"mouseout",m),o.C.off(e.getWrapperElement(),"mouseout",m),i.style.opacity?(i.style.opacity="0",setTimeout((()=>{i.parentNode&&i.remove()}),600)):i.parentNode&&i.remove()}),"hidePopup");o.C.on(i,"mouseover",f),o.C.on(i,"mouseout",m),o.C.on(e.getWrapperElement(),"mouseout",m)}o.C.defineOption("info",!1,((e,t,n)=>{if(n&&n!==o.C.Init){const t=e.state.info.onMouseOver;o.C.off(e.getWrapperElement(),"mouseover",t),clearTimeout(e.state.info.hoverTimeout),delete e.state.info}if(t){const n=e.state.info=a(t);n.onMouseOver=u.bind(null,e),o.C.on(e.getWrapperElement(),"mouseover",n.onMouseOver)}})),r(a,"createState"),r(c,"getHoverTime"),r(u,"onMouseOver"),r(l,"onMouseHover"),r(d,"showPopup")},70781:(e,t,n)=>{n.r(t);var o=n(20475),i=n(53171),r=n(43777),a=(n(80124),n(81205),n(26088),Object.defineProperty),c=(e,t)=>a(e,"name",{value:t,configurable:!0});function u(e,t,n){l(e,t,n),f(e,t,n,t.type)}function l(e,t,n){var o;g(e,(null===(o=t.fieldDef)||void 0===o?void 0:o.name)||"","field-name",n,(0,r.a)(t))}function d(e,t,n){var o;g(e,"@"+((null===(o=t.directiveDef)||void 0===o?void 0:o.name)||""),"directive-name",n,(0,r.b)(t))}function p(e,t,n){var o;g(e,(null===(o=t.argDef)||void 0===o?void 0:o.name)||"","arg-name",n,(0,r.c)(t)),f(e,t,n,t.inputType)}function s(e,t,n){var o;const i=(null===(o=t.enumValue)||void 0===o?void 0:o.name)||"";m(e,t,n,t.inputType),g(e,"."),g(e,i,"enum-value",n,(0,r.d)(t))}function f(e,t,n,i){const a=document.createElement("span");a.className="type-name-pill",i instanceof o.Gc?(m(a,t,n,i.ofType),g(a,"!")):i instanceof o.KT?(g(a,"["),m(a,t,n,i.ofType),g(a,"]")):g(a,(null==i?void 0:i.name)||"","type-name",n,(0,r.e)(t,i)),e.append(a)}function m(e,t,n,i){i instanceof o.Gc?(m(e,t,n,i.ofType),g(e,"!")):i instanceof o.KT?(g(e,"["),m(e,t,n,i.ofType),g(e,"]")):g(e,(null==i?void 0:i.name)||"","type-name",n,(0,r.e)(t,i))}function v(e,t,n){const{description:o}=n;if(o){const n=document.createElement("div");n.className="info-description",t.renderDescription?n.innerHTML=t.renderDescription(o):n.append(document.createTextNode(o)),e.append(n)}y(e,t,n)}function y(e,t,n){const o=n.deprecationReason;if(o){const n=document.createElement("div");n.className="info-deprecation",e.append(n);const i=document.createElement("span");i.className="info-deprecation-label",i.append(document.createTextNode("Deprecated")),n.append(i);const r=document.createElement("div");r.className="info-deprecation-reason",t.renderDescription?r.innerHTML=t.renderDescription(o):r.append(document.createTextNode(o)),n.append(r)}}function g(e,t,n="",o={onClick:null},i=null){if(n){const{onClick:r}=o;let a;r?(a=document.createElement("a"),a.href="javascript:void 0",a.addEventListener("click",(e=>{e.preventDefault(),r(i,e)}))):a=document.createElement("span"),a.className=n,a.append(document.createTextNode(t)),e.append(a)}else e.append(document.createTextNode(t))}i.C.registerHelper("info","graphql",((e,t)=>{if(!t.schema||!e.state)return;const{kind:n,step:o}=e.state,i=(0,r.g)(t.schema,e.state);if("Field"===n&&0===o&&i.fieldDef||"AliasedField"===n&&2===o&&i.fieldDef){const e=document.createElement("div");e.className="CodeMirror-info-header",u(e,i,t);const n=document.createElement("div");return n.append(e),v(n,t,i.fieldDef),n}if("Directive"===n&&1===o&&i.directiveDef){const e=document.createElement("div");e.className="CodeMirror-info-header",d(e,i,t);const n=document.createElement("div");return n.append(e),v(n,t,i.directiveDef),n}if("Argument"===n&&0===o&&i.argDef){const e=document.createElement("div");e.className="CodeMirror-info-header",p(e,i,t);const n=document.createElement("div");return n.append(e),v(n,t,i.argDef),n}if("EnumValue"===n&&i.enumValue&&i.enumValue.description){const e=document.createElement("div");e.className="CodeMirror-info-header",s(e,i,t);const n=document.createElement("div");return n.append(e),v(n,t,i.enumValue),n}if("NamedType"===n&&i.type&&i.type.description){const e=document.createElement("div");e.className="CodeMirror-info-header",m(e,i,t,i.type);const n=document.createElement("div");return n.append(e),v(n,t,i.type),n}})),c(u,"renderField"),c(l,"renderQualifiedField"),c(d,"renderDirective"),c(p,"renderArg"),c(s,"renderEnumValue"),c(f,"renderTypeAnnotation"),c(m,"renderType"),c(v,"renderDescription"),c(y,"renderDeprecation"),c(g,"text")}}]);
"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[4083,172],{30172:(e,o,t)=>{t.r(o),t.d(o,{C:()=>u,c:()=>s});var n=t(24421);function r(e,o){for(var t=0;t<o.length;t++){const n=o[t];if("string"!=typeof n&&!Array.isArray(n))for(const o in n)if("default"!==o&&!(o in e)){const t=Object.getOwnPropertyDescriptor(n,o);t&&Object.defineProperty(e,o,t.get?t:{enumerable:!0,get:()=>n[o]})}}return Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}(0,Object.defineProperty)(r,"name",{value:"_mergeNamespaces",configurable:!0});var i=(0,n.r)();const u=(0,n.g)(i),s=r({__proto__:null,default:u},[i])},14083:(e,o,t)=>{t.r(o);var n=t(30172),r=(t(24421),Object.defineProperty),i=(e,o)=>r(e,"name",{value:o,configurable:!0});function u(e){return{options:e instanceof Function?{render:e}:!0===e?{}:e}}function s(e){const{options:o}=e.state.info;return(null==o?void 0:o.hoverTime)||500}function m(e,o){const t=e.state.info,r=o.target||o.srcElement;if(!(r instanceof HTMLElement)||"SPAN"!==r.nodeName||void 0!==t.hoverTimeout)return;const u=r.getBoundingClientRect(),m=i((function(){clearTimeout(t.hoverTimeout),t.hoverTimeout=setTimeout(c,p)}),"onMouseMove"),f=i((function(){n.C.off(document,"mousemove",m),n.C.off(e.getWrapperElement(),"mouseout",f),clearTimeout(t.hoverTimeout),t.hoverTimeout=void 0}),"onMouseOut"),c=i((function(){n.C.off(document,"mousemove",m),n.C.off(e.getWrapperElement(),"mouseout",f),t.hoverTimeout=void 0,a(e,u)}),"onHover"),p=s(e);t.hoverTimeout=setTimeout(c,p),n.C.on(document,"mousemove",m),n.C.on(e.getWrapperElement(),"mouseout",f)}function a(e,o){const t=e.coordsChar({left:(o.left+o.right)/2,top:(o.top+o.bottom)/2},"window"),n=e.state.info,{options:r}=n,i=r.render||e.getHelper(t,"info");if(i){const n=e.getTokenAt(t,!0);if(n){const u=i(n,r,e,t);u&&f(e,o,u)}}}function f(e,o,t){const r=document.createElement("div");r.className="CodeMirror-info",r.append(t),document.body.append(r);const u=r.getBoundingClientRect(),s=window.getComputedStyle(r),m=u.right-u.left+parseFloat(s.marginLeft)+parseFloat(s.marginRight),a=u.bottom-u.top+parseFloat(s.marginTop)+parseFloat(s.marginBottom);let f=o.bottom;a>window.innerHeight-o.bottom-15&&o.top>window.innerHeight-o.bottom&&(f=o.top-a),f<0&&(f=o.bottom);let c,p=Math.max(0,window.innerWidth-m-15);p>o.left&&(p=o.left),r.style.opacity="1",r.style.top=f+"px",r.style.left=p+"px";const l=i((function(){clearTimeout(c)}),"onMouseOverPopup"),d=i((function(){clearTimeout(c),c=setTimeout(v,200)}),"onMouseOut"),v=i((function(){n.C.off(r,"mouseover",l),n.C.off(r,"mouseout",d),n.C.off(e.getWrapperElement(),"mouseout",d),r.style.opacity?(r.style.opacity="0",setTimeout((()=>{r.parentNode&&r.remove()}),600)):r.parentNode&&r.remove()}),"hidePopup");n.C.on(r,"mouseover",l),n.C.on(r,"mouseout",d),n.C.on(e.getWrapperElement(),"mouseout",d)}n.C.defineOption("info",!1,((e,o,t)=>{if(t&&t!==n.C.Init){const o=e.state.info.onMouseOver;n.C.off(e.getWrapperElement(),"mouseover",o),clearTimeout(e.state.info.hoverTimeout),delete e.state.info}if(o){const t=e.state.info=u(o);t.onMouseOver=m.bind(null,e),n.C.on(e.getWrapperElement(),"mouseover",t.onMouseOver)}})),i(u,"createState"),i(s,"getHoverTime"),i(m,"onMouseOver"),i(a,"onMouseHover"),i(f,"showPopup")}}]);
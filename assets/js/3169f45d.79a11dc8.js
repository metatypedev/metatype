"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[9805],{41732:(e,t,r)=>{r.r(t),r.d(t,{assets:()=>p,contentTitle:()=>c,default:()=>u,frontMatter:()=>i,metadata:()=>a,toc:()=>o});var n=r(11527),s=r(88672);const i={},c="HTTP/REST",a={id:"reference/runtimes/http/index",title:"HTTP/REST",description:"The HTTPRuntime allows our typegraphs to access external REST APIs.",source:"@site/docs/reference/runtimes/http/index.mdx",sourceDirName:"reference/runtimes/http",slug:"/reference/runtimes/http/",permalink:"/docs/reference/runtimes/http/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/runtimes/http/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"GraphQL",permalink:"/docs/reference/runtimes/graphql/"},next:{title:"Prisma",permalink:"/docs/reference/runtimes/prisma/"}},p={},o=[];function m(e){const t={code:"code",h1:"h1",p:"p",pre:"pre",...(0,s.a)(),...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(t.h1,{id:"httprest",children:"HTTP/REST"}),"\n",(0,n.jsx)(t.p,{children:"The HTTPRuntime allows our typegraphs to access external REST APIs."}),"\n",(0,n.jsx)(t.p,{children:"Example:"}),"\n",(0,n.jsx)(t.pre,{children:(0,n.jsx)(t.code,{className:"language-python",children:"from typegraph.runtime.http import HTTPRuntime\n\n# ..\n\nremote = HTTPRuntime('https://dev.to/api')\nremote.get(\n    '/test',\n    t.struct({}),\n    t.list(t.struct({'a': t.integer()})),\n)\n"})})]})}function u(e={}){const{wrapper:t}={...(0,s.a)(),...e.components};return t?(0,n.jsx)(t,{...e,children:(0,n.jsx)(m,{...e})}):m(e)}}}]);
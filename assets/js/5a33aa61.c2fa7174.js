"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[3794],{18411:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>a,contentTitle:()=>i,default:()=>d,frontMatter:()=>o,metadata:()=>p,toc:()=>c});var r=t(11527),s=t(63883);const o={},i="Python",p={id:"reference/runtimes/python/index",title:"Python",description:"Example:",source:"@site/docs/reference/runtimes/python/index.mdx",sourceDirName:"reference/runtimes/python",slug:"/reference/runtimes/python/",permalink:"/docs/reference/runtimes/python/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/runtimes/python/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Prisma",permalink:"/docs/reference/runtimes/prisma/"},next:{title:"Random",permalink:"/docs/reference/runtimes/random/"}},a={},c=[];function l(e){const n={code:"code",h1:"h1",p:"p",pre:"pre",...(0,s.a)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.h1,{id:"python",children:"Python"}),"\n",(0,r.jsx)(n.p,{children:"Example:"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-python",children:'# my_typegraph.py\n\nfrom typegraph import TypeGraph, policies, t\nfrom typegraph.runtimes.python import Python, PyModuleMat\n\nwith TypeGraph("example_python") as g:\n    public = policies.public()\n    python = Python()\n\n    g.expose(\n        add=t.func(\n            t.struct({"a": t.integer(), "b": t.integer()}),\n            t.integer(),\n            python.from_lambda(lambda x: x["a"] + x["b"]),\n        ),\n        sayHello=t.func(\n            t.struct({"name": t.string()}),\n            t.string(),\n            PyModuleMat("hello.py").imp("say_hello"),\n        ),\n        default_policy=[public],\n    )\n'})}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-python",children:'# hello.py\n\ndef say_hello(x: any):\n    return f"Hello {x["name"]}"\n'})})]})}function d(e={}){const{wrapper:n}={...(0,s.a)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(l,{...e})}):l(e)}}}]);
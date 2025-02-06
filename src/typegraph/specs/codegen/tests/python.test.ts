// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { assertEquals } from "jsr:@std/assert";
import PythonCodeGenerator from "../src/lib/python.ts";
import * as utils from "./utils.ts";

Deno.test("Python type alias codegen", () => {
  const pycg = new PythonCodeGenerator();

  pycg.process(utils.typeAliasCase);

  const result = pycg.formatTypeDefs();
  const expected = "Foo = Bar";

  assertEquals(result, expected);
});

Deno.test("Python struct codegen", () => {
  const pycg = new PythonCodeGenerator();

  pycg.process(utils.recordCase);

  const result = pycg.formatTypeDefs();
  const expected = `class RecordLike(BaseModel):
    num: int
    key: str
    str_arr: t.List[str]
    tup: t.Tuple[float, float]
    opt: t.Optional[bool]
    comp: t.Optional[t.List[t.Tuple[int, Something]]]

    def __init__(self, num: int, key: str, str_arr: t.List[str], tup: t.Tuple[float, float], opt: t.Optional[bool], comp: t.Optional[t.List[t.Tuple[int, Something]]], **kwargs):
        super().__init__(num=num,key=key,str_arr=str_arr,tup=tup,opt=opt,comp=comp, **kwargs)`;

  assertEquals(result, expected);
});

Deno.test("Python union codegen", () => {
  const pycg = new PythonCodeGenerator();

  pycg.process(utils.unionCase);

  const result = pycg.formatTypeDefs();
  const expected = `EnumLike = t.Union[
    t.Literal["simple"],
    t.TypedDict("EnumLikeComposite", {"composite": Something}),
    t.TypedDict("EnumLikeSnakeCase", {"snake_case": bool}),
]`;

  assertEquals(result, expected);
});

Deno.test("Python function codegen", () => {
  const pycg = new PythonCodeGenerator();

  pycg.process(utils.funcCase);

  const result = pycg.formatFuncDefs();
  const expected = `def func(param: str, opt: t.Optional[bool] = None) -> int:
    class RequestType(BaseModel):
        param: str
        opt: t.Optional[bool]

    class ReturnType(BaseModel):
        value: int

    req = RequestType(param=param, opt=opt)
    res = rpc_request("func", req.model_dump())
    ret = ReturnType(value=res)

    return ret.value`;

  assertEquals(result, expected);
});

Deno.test("Python import codegen", () => {
  const pycg = new PythonCodeGenerator();

  pycg.process(utils.importCase);

  const result = pycg.formatHeaders();
  const expected = `import typing_extensions as t
from pydantic import BaseModel
from typegraph.gen.client import rpc_request
from typegraph.gen.foobar import Foo, Bar`;

  assertEquals(result, expected);
});

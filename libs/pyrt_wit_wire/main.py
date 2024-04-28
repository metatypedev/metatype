import wit_wire.exports

# NOTE: all imports must be toplevel as constrained by `componentize-py`
# https://github.com/bytecodealliance/componentize-py/issues/23
# from pyrt.imports.typegate_wire import hostcall
from wit_wire.exports.mat_wire import (
    InitArgs,
    InitResponse,
    InitError_UnexpectedMat,
    MatInfo,
    HandleReq,
    HandleErr_NoHandler,
    HandleErr_InJsonErr,
    HandleErr_HandlerErr,
    Err,
)

import json
import types
from typing import Callable, Any

# the `MatWire` class is instantiated for each
# external call. We have to put any persisted
# state here.
handlers = {}


class MatWire(wit_wire.exports.MatWire):
    def init(self, args: InitArgs):
        for op in args.expected_ops:
            handlers[op.op_name] = op_to_handler(op)
        return InitResponse(ok=True)

    def handle(self, req: HandleReq):
        handler = handlers.get(req.op_name)
        if handler is None:
            raise Err(HandleErr_NoHandler())
        try:
            return handler.handle(req)
        except json.JSONDecodeError as err:
            raise Err(HandleErr_InJsonErr(str(err)))
        except Exception as err:
            raise Err(HandleErr_HandlerErr(str(err)))


class ErasedHandler:
    def __init__(self, handler_fn: Callable[[Any], Any]) -> None:
        self.handler_fn = handler_fn

    def handle(self, req: HandleReq):
        in_parsed = json.loads(req.in_json)
        out = self.handler_fn(in_parsed)
        return json.dumps(out)


def op_to_handler(op: MatInfo) -> ErasedHandler:
    data_parsed = json.loads(op.mat_data_json)
    if data_parsed["ty"] == "def":
        module = types.ModuleType(op.op_name)
        exec(data_parsed["source"], module.__dict__)
        fn = module.__dict__[data_parsed["func_name"]]
        return ErasedHandler(handler_fn=lambda inp: fn(inp))
    elif data_parsed["ty"] == "lambda":
        fn = eval(data_parsed["source"])
        return ErasedHandler(handler_fn=lambda inp: fn(inp))
    else:
        raise Err(InitError_UnexpectedMat(op))

import wit_wire.exports

# NOTE: all imports must be toplevel as constrained by `componentize-py`
# https://github.com/bytecodealliance/componentize-py/issues/23
# from pyrt.imports.typegate_wire import hostcall
from wit_wire.exports.mat_wire import (
    InitArgs,
    InitResponse,
    InitError_UnexpectedMat,
    InitError_Other,
    MatInfo,
    HandleReq,
    HandleErr_NoHandler,
    HandleErr_InJsonErr,
    HandleErr_HandlerErr,
    Err,
)

import json
import types
from typing import Callable, Any, Dict
import importlib
import importlib.util
import importlib.abc
import importlib.machinery
import os
import sys
import traceback

# the `MatWire` class is instantiated for each
# external call. We have to put any persisted
# state here.
handlers = {}


class MatWire(wit_wire.exports.MatWire):
    def init(self, args: InitArgs):
        for op in args.expected_ops:
            try:
                handlers[op.op_name] = op_to_handler(op)
            except Err as err:
                traceback.print_exc()
                raise err
            except Exception as err:
                traceback.print_exc()
                raise Err(InitError_Other(str(err)))
        return InitResponse(ok=True)

    def handle(self, req: HandleReq):
        handler = handlers.get(req.op_name)
        if handler is None:
            print(
                f"no handler found for {req.op_name}, registered handlers: {[op for op in handlers]}"
            )
            raise Err(HandleErr_NoHandler())
        try:
            return handler.handle(req)
        except json.JSONDecodeError as err:
            traceback.print_exc()
            raise Err(HandleErr_InJsonErr(str(err)))
        except Exception as err:
            traceback.print_exc()
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
    elif data_parsed["ty"] == "import_function":
        prefix = data_parsed["func_name"]

        modules_raw = data_parsed["sources"]
        finder = ThePathFinder(
            {os.path.join(prefix, path): modules_raw[path] for path in modules_raw}
        )
        sys.meta_path.append(finder)

        try:
            module = importlib.import_module(
                ThePathFinder.path_to_module(
                    os.path.join(prefix, data_parsed["root_src_path"])
                )
            )
        except Exception as err:
            finder.debug()
            raise Err(InitError_Other(f"{err}"))
        return ErasedHandler(handler_fn=getattr(module, data_parsed["func_name"]))
    elif data_parsed["ty"] == "lambda":
        fn = eval(data_parsed["source"])
        return ErasedHandler(handler_fn=lambda inp: fn(inp))
    else:
        raise Err(InitError_UnexpectedMat(op))


class ThePathFinder(importlib.abc.MetaPathFinder):
    @staticmethod
    def path_to_module(path: str):
        return os.path.splitext((os.path.normpath(path)))[0].replace("/", ".")

    def debug(self):
        print("= Loaded modules summary == == == ==")
        print(f" modules: {self._mod_names}")
        print(f" packages: {self._pkg_names}")
        print("== == == == == == == == == == == ==")

    def __init__(self, modules: Dict[str, str]):
        self._mods_raw = modules
        self._pkgs = set()
        for path in self._mods_raw:
            dirname = os.path.dirname(path)
            while dirname != "/" and dirname != "" and dirname != ".":
                if dirname not in self._mods_raw:
                    self._pkgs.add(dirname)
                dirname = os.path.dirname(dirname)
        self._mod_names = {ThePathFinder.path_to_module(path): path for path in modules}
        self._pkg_names = {
            ThePathFinder.path_to_module(path): path for path in self._pkgs
        }

    # Look for a spec under a certain module name
    # https://peps.python.org/pep-0302/
    # https://peps.python.org/pep-0451/
    def find_spec(self, fullname: str, _path, target=None):
        if fullname in self._mod_names:
            path = self._mod_names[fullname]
            # this helper will return a ModuleSpec populating
            # its' fields according to methods on the Loader
            # note, the loader is ultimately responsible for making
            # the module as well. The spec itself is an indirection
            # for flexebility purposes
            return importlib.util.spec_from_loader(
                fullname,
                # our fake loader will give out the raw module src
                # when asked
                FakeFileLoader(
                    fullname, path, src=self._mods_raw[path], is_package=False
                ),
            )
        # when one imports foo.bar.keg
        # python will ask us for packages foo and bar
        # to get to keg.
        # incoming artifacts are written around directory
        # based packages. this impl doesn't support that
        # so we instead return empty files for packages
        if fullname in self._pkg_names:
            path = self._pkg_names[fullname]
            return importlib.util.spec_from_loader(
                fullname, FakeFileLoader(fullname, path, src="", is_package=True)
            )


# most of the actual Loader impl lives in FileLoader
# and othe parent classes.
# We only need to override enough for our usecases
class FakeFileLoader(importlib.abc.FileLoader):
    def __init__(
        self,
        fullname: str,
        path: str,
        src: str,
        is_package: bool,
    ):
        self.name = fullname
        self.path = path
        self._is_pkg = is_package
        self._src = src

    def is_package(self, fullname: str):
        assert fullname == self.name
        return self._is_pkg

    def get_source(self, fullname: str):
        assert fullname == self.name
        return self._src

    def get_filename(self, name=None):
        assert name is not None and name == self.name
        return self.path

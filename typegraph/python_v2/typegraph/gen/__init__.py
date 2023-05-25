# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from .exports import core
import os
import wasmtime


class TypegraphCore:
    def __init__(self, store: wasmtime.Store) -> None:
        path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "typegraph_core.core0.wasm"
        )
        module = wasmtime.Module.from_file(store.engine, path)
        instance0 = wasmtime.Instance(store, module, []).exports(store)
        core_memory0 = instance0["memory"]
        assert isinstance(core_memory0, wasmtime.Memory)
        self._core_memory0 = core_memory0
        realloc0 = instance0["cabi_realloc"]
        assert isinstance(realloc0, wasmtime.Func)
        self._realloc0 = realloc0
        lift_callee0 = instance0["core#integerb"]
        assert isinstance(lift_callee0, wasmtime.Func)
        self.lift_callee0 = lift_callee0
        lift_callee1 = instance0["core#integermin"]
        assert isinstance(lift_callee1, wasmtime.Func)
        self.lift_callee1 = lift_callee1
        lift_callee2 = instance0["core#structb"]
        assert isinstance(lift_callee2, wasmtime.Func)
        self.lift_callee2 = lift_callee2
        lift_callee3 = instance0["core#gettpe"]
        assert isinstance(lift_callee3, wasmtime.Func)
        self.lift_callee3 = lift_callee3

    def core(self) -> core.Core:
        return core.Core(self)

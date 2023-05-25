from .exports import core
import os
import wasmtime

class TypegraphCore:
    
    def __init__(self, store: wasmtime.Store) -> None:
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'typegraph_core.core0.wasm')
        module = wasmtime.Module.from_file(store.engine, path)
        instance0 = wasmtime.Instance(store, module, []).exports(store)
        core_memory0 = instance0["memory"]
        assert(isinstance(core_memory0, wasmtime.Memory))
        self._core_memory0 = core_memory0
        realloc0 = instance0["cabi_realloc"]
        assert(isinstance(realloc0, wasmtime.Func))
        self._realloc0 = realloc0
        post_return0 = instance0["cabi_post_core#init-typegraph"]
        assert(isinstance(post_return0, wasmtime.Func))
        self._post_return0 = post_return0
        post_return1 = instance0["cabi_post_core#finalize-typegraph"]
        assert(isinstance(post_return1, wasmtime.Func))
        self._post_return1 = post_return1
        post_return2 = instance0["cabi_post_core#proxyb"]
        assert(isinstance(post_return2, wasmtime.Func))
        self._post_return2 = post_return2
        post_return3 = instance0["cabi_post_core#integerb"]
        assert(isinstance(post_return3, wasmtime.Func))
        self._post_return3 = post_return3
        post_return4 = instance0["cabi_post_core#type-as-integer"]
        assert(isinstance(post_return4, wasmtime.Func))
        self._post_return4 = post_return4
        post_return5 = instance0["cabi_post_core#structb"]
        assert(isinstance(post_return5, wasmtime.Func))
        self._post_return5 = post_return5
        post_return6 = instance0["cabi_post_core#type-as-struct"]
        assert(isinstance(post_return6, wasmtime.Func))
        self._post_return6 = post_return6
        post_return7 = instance0["cabi_post_core#get-type-repr"]
        assert(isinstance(post_return7, wasmtime.Func))
        self._post_return7 = post_return7
        post_return8 = instance0["cabi_post_core#funcb"]
        assert(isinstance(post_return8, wasmtime.Func))
        self._post_return8 = post_return8
        post_return9 = instance0["cabi_post_core#expose"]
        assert(isinstance(post_return9, wasmtime.Func))
        self._post_return9 = post_return9
        lift_callee0 = instance0["core#init-typegraph"]
        assert(isinstance(lift_callee0, wasmtime.Func))
        self.lift_callee0 = lift_callee0
        lift_callee1 = instance0["core#finalize-typegraph"]
        assert(isinstance(lift_callee1, wasmtime.Func))
        self.lift_callee1 = lift_callee1
        lift_callee2 = instance0["core#proxyb"]
        assert(isinstance(lift_callee2, wasmtime.Func))
        self.lift_callee2 = lift_callee2
        lift_callee3 = instance0["core#integerb"]
        assert(isinstance(lift_callee3, wasmtime.Func))
        self.lift_callee3 = lift_callee3
        lift_callee4 = instance0["core#type-as-integer"]
        assert(isinstance(lift_callee4, wasmtime.Func))
        self.lift_callee4 = lift_callee4
        lift_callee5 = instance0["core#structb"]
        assert(isinstance(lift_callee5, wasmtime.Func))
        self.lift_callee5 = lift_callee5
        lift_callee6 = instance0["core#type-as-struct"]
        assert(isinstance(lift_callee6, wasmtime.Func))
        self.lift_callee6 = lift_callee6
        lift_callee7 = instance0["core#get-type-repr"]
        assert(isinstance(lift_callee7, wasmtime.Func))
        self.lift_callee7 = lift_callee7
        lift_callee8 = instance0["core#funcb"]
        assert(isinstance(lift_callee8, wasmtime.Func))
        self.lift_callee8 = lift_callee8
        lift_callee9 = instance0["core#expose"]
        assert(isinstance(lift_callee9, wasmtime.Func))
        self.lift_callee9 = lift_callee9
    def core(self) -> core.Core:
        return core.Core(self)

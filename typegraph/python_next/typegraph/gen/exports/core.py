from ..intrinsics import _clamp, _decode_utf8, _encode_utf8, _load, _store
from ..types import Err, Ok, Result
import ctypes
from dataclasses import dataclass
from typing import List, Optional, Tuple
import wasmtime

from typing import TYPE_CHECKING
if TYPE_CHECKING:
  from .. import TypegraphCore

@dataclass
class TypegraphInitParams:
    name: str

Error = str
@dataclass
class TypeProxy:
    name: str

TypeId = int
@dataclass
class TypeInteger:
    min: Optional[int]
    max: Optional[int]

@dataclass
class TypeBase:
    name: Optional[str]

@dataclass
class TypeStruct:
    props: List[Tuple[str, TypeId]]

@dataclass
class TypeFunc:
    inp: TypeId
    out: TypeId

class Core:
    component: 'TypegraphCore'
    
    def __init__(self, component: 'TypegraphCore') -> None:
        self.component = component
    def init_typegraph(self, caller: wasmtime.Store, params: TypegraphInitParams) -> Result[None, Error]:
        record = params
        field = record.name
        ptr, len0 = _encode_utf8(field, self.component._realloc0, self.component._core_memory0, caller)
        ret = self.component.lift_callee0(caller, ptr, len0)
        assert(isinstance(ret, int))
        load = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 0)
        expected: Result[None, Error]
        if load == 0:
            expected = Ok(None)
        elif load == 1:
            load1 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            load2 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 8)
            ptr3 = load1
            len4 = load2
            list = _decode_utf8(self.component._core_memory0, caller, ptr3, len4)
            expected = Err(list)
        else:
            raise TypeError("invalid variant discriminant for expected")
        self.component._post_return0(caller, ret)
        return expected
    def finalize_typegraph(self, caller: wasmtime.Store) -> Result[str, Error]:
        ret = self.component.lift_callee1(caller)
        assert(isinstance(ret, int))
        load = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 0)
        expected: Result[str, Error]
        if load == 0:
            load0 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            load1 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 8)
            ptr = load0
            len2 = load1
            list = _decode_utf8(self.component._core_memory0, caller, ptr, len2)
            expected = Ok(list)
        elif load == 1:
            load3 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            load4 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 8)
            ptr5 = load3
            len6 = load4
            list7 = _decode_utf8(self.component._core_memory0, caller, ptr5, len6)
            expected = Err(list7)
        else:
            raise TypeError("invalid variant discriminant for expected")
        self.component._post_return1(caller, ret)
        return expected
    def proxyb(self, caller: wasmtime.Store, data: TypeProxy) -> Result[TypeId, Error]:
        record = data
        field = record.name
        ptr, len0 = _encode_utf8(field, self.component._realloc0, self.component._core_memory0, caller)
        ret = self.component.lift_callee2(caller, ptr, len0)
        assert(isinstance(ret, int))
        load = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 0)
        expected: Result[TypeId, Error]
        if load == 0:
            load1 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            expected = Ok(load1 & 0xffffffff)
        elif load == 1:
            load2 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            load3 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 8)
            ptr4 = load2
            len5 = load3
            list = _decode_utf8(self.component._core_memory0, caller, ptr4, len5)
            expected = Err(list)
        else:
            raise TypeError("invalid variant discriminant for expected")
        self.component._post_return2(caller, ret)
        return expected
    def integerb(self, caller: wasmtime.Store, data: TypeInteger, base: TypeBase) -> Result[TypeId, Error]:
        record = data
        field = record.min
        field0 = record.max
        if field is None:
            variant = 0
            variant2 = 0
        else:
            payload1 = field
            variant = 1
            variant2 = _clamp(payload1, -2147483648, 2147483647)
        if field0 is None:
            variant5 = 0
            variant6 = 0
        else:
            payload4 = field0
            variant5 = 1
            variant6 = _clamp(payload4, -2147483648, 2147483647)
        record7 = base
        field8 = record7.name
        if field8 is None:
            variant12 = 0
            variant13 = 0
            variant14 = 0
        else:
            payload10 = field8
            ptr, len11 = _encode_utf8(payload10, self.component._realloc0, self.component._core_memory0, caller)
            variant12 = 1
            variant13 = ptr
            variant14 = len11
        ret = self.component.lift_callee3(caller, variant, variant2, variant5, variant6, variant12, variant13, variant14)
        assert(isinstance(ret, int))
        load = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 0)
        expected: Result[TypeId, Error]
        if load == 0:
            load15 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            expected = Ok(load15 & 0xffffffff)
        elif load == 1:
            load16 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            load17 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 8)
            ptr18 = load16
            len19 = load17
            list = _decode_utf8(self.component._core_memory0, caller, ptr18, len19)
            expected = Err(list)
        else:
            raise TypeError("invalid variant discriminant for expected")
        self.component._post_return3(caller, ret)
        return expected
    def type_as_integer(self, caller: wasmtime.Store, ref: TypeId) -> Result[Tuple[TypeId, TypeBase, TypeInteger], Error]:
        ret = self.component.lift_callee4(caller, _clamp(ref, 0, 4294967295))
        assert(isinstance(ret, int))
        load = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 0)
        expected: Result[Tuple[TypeId, TypeBase, TypeInteger], Error]
        if load == 0:
            load0 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            load1 = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 8)
            option: Optional[str]
            if load1 == 0:
                option = None
            elif load1 == 1:
                load2 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 12)
                load3 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 16)
                ptr = load2
                len4 = load3
                list = _decode_utf8(self.component._core_memory0, caller, ptr, len4)
                option = list
            else:
                raise TypeError("invalid variant discriminant for option")
            load5 = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 20)
            option7: Optional[int]
            if load5 == 0:
                option7 = None
            elif load5 == 1:
                load6 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 24)
                option7 = load6
            else:
                raise TypeError("invalid variant discriminant for option")
            load8 = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 28)
            option10: Optional[int]
            if load8 == 0:
                option10 = None
            elif load8 == 1:
                load9 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 32)
                option10 = load9
            else:
                raise TypeError("invalid variant discriminant for option")
            expected = Ok((load0 & 0xffffffff, TypeBase(option), TypeInteger(option7, option10),))
        elif load == 1:
            load11 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            load12 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 8)
            ptr13 = load11
            len14 = load12
            list15 = _decode_utf8(self.component._core_memory0, caller, ptr13, len14)
            expected = Err(list15)
        else:
            raise TypeError("invalid variant discriminant for expected")
        self.component._post_return4(caller, ret)
        return expected
    def structb(self, caller: wasmtime.Store, data: TypeStruct, base: TypeBase) -> Result[TypeId, Error]:
        record = data
        field = record.props
        vec = field
        len3 = len(vec)
        result = self.component._realloc0(caller, 0, 0, 4, len3 * 12)
        assert(isinstance(result, int))
        for i4 in range(0, len3):
            e = vec[i4]
            base0 = result + i4 * 12
            (tuplei,tuplei1,) = e
            ptr, len2 = _encode_utf8(tuplei, self.component._realloc0, self.component._core_memory0, caller)
            _store(ctypes.c_uint32, self.component._core_memory0, caller, base0, 4, len2)
            _store(ctypes.c_uint32, self.component._core_memory0, caller, base0, 0, ptr)
            _store(ctypes.c_uint32, self.component._core_memory0, caller, base0, 8, _clamp(tuplei1, 0, 4294967295))
        record5 = base
        field6 = record5.name
        if field6 is None:
            variant = 0
            variant10 = 0
            variant11 = 0
        else:
            payload7 = field6
            ptr8, len9 = _encode_utf8(payload7, self.component._realloc0, self.component._core_memory0, caller)
            variant = 1
            variant10 = ptr8
            variant11 = len9
        ret = self.component.lift_callee5(caller, result, len3, variant, variant10, variant11)
        assert(isinstance(ret, int))
        load = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 0)
        expected: Result[TypeId, Error]
        if load == 0:
            load12 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            expected = Ok(load12 & 0xffffffff)
        elif load == 1:
            load13 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            load14 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 8)
            ptr15 = load13
            len16 = load14
            list = _decode_utf8(self.component._core_memory0, caller, ptr15, len16)
            expected = Err(list)
        else:
            raise TypeError("invalid variant discriminant for expected")
        self.component._post_return5(caller, ret)
        return expected
    def type_as_struct(self, caller: wasmtime.Store, id: TypeId) -> Result[Tuple[TypeId, TypeBase, TypeStruct], Error]:
        ret = self.component.lift_callee6(caller, _clamp(id, 0, 4294967295))
        assert(isinstance(ret, int))
        load = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 0)
        expected: Result[Tuple[TypeId, TypeBase, TypeStruct], Error]
        if load == 0:
            load0 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            load1 = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 8)
            option: Optional[str]
            if load1 == 0:
                option = None
            elif load1 == 1:
                load2 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 12)
                load3 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 16)
                ptr = load2
                len4 = load3
                list = _decode_utf8(self.component._core_memory0, caller, ptr, len4)
                option = list
            else:
                raise TypeError("invalid variant discriminant for option")
            load5 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 20)
            load6 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 24)
            ptr14 = load5
            len15 = load6
            result: List[Tuple[str, TypeId]] = []
            for i16 in range(0, len15):
                base7 = ptr14 + i16 * 12
                load8 = _load(ctypes.c_int32, self.component._core_memory0, caller, base7, 0)
                load9 = _load(ctypes.c_int32, self.component._core_memory0, caller, base7, 4)
                ptr10 = load8
                len11 = load9
                list12 = _decode_utf8(self.component._core_memory0, caller, ptr10, len11)
                load13 = _load(ctypes.c_int32, self.component._core_memory0, caller, base7, 8)
                result.append((list12, load13 & 0xffffffff,))
            expected = Ok((load0 & 0xffffffff, TypeBase(option), TypeStruct(result),))
        elif load == 1:
            load17 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            load18 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 8)
            ptr19 = load17
            len20 = load18
            list21 = _decode_utf8(self.component._core_memory0, caller, ptr19, len20)
            expected = Err(list21)
        else:
            raise TypeError("invalid variant discriminant for expected")
        self.component._post_return6(caller, ret)
        return expected
    def get_type_repr(self, caller: wasmtime.Store, id: TypeId) -> Result[str, Error]:
        ret = self.component.lift_callee7(caller, _clamp(id, 0, 4294967295))
        assert(isinstance(ret, int))
        load = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 0)
        expected: Result[str, Error]
        if load == 0:
            load0 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            load1 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 8)
            ptr = load0
            len2 = load1
            list = _decode_utf8(self.component._core_memory0, caller, ptr, len2)
            expected = Ok(list)
        elif load == 1:
            load3 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            load4 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 8)
            ptr5 = load3
            len6 = load4
            list7 = _decode_utf8(self.component._core_memory0, caller, ptr5, len6)
            expected = Err(list7)
        else:
            raise TypeError("invalid variant discriminant for expected")
        self.component._post_return7(caller, ret)
        return expected
    def funcb(self, caller: wasmtime.Store, data: TypeFunc) -> Result[TypeId, Error]:
        record = data
        field = record.inp
        field0 = record.out
        ret = self.component.lift_callee8(caller, _clamp(field, 0, 4294967295), _clamp(field0, 0, 4294967295))
        assert(isinstance(ret, int))
        load = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 0)
        expected: Result[TypeId, Error]
        if load == 0:
            load1 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            expected = Ok(load1 & 0xffffffff)
        elif load == 1:
            load2 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            load3 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 8)
            ptr = load2
            len4 = load3
            list = _decode_utf8(self.component._core_memory0, caller, ptr, len4)
            expected = Err(list)
        else:
            raise TypeError("invalid variant discriminant for expected")
        self.component._post_return8(caller, ret)
        return expected
    def expose(self, caller: wasmtime.Store, fns: List[Tuple[str, TypeId]], namespace: List[str]) -> Result[None, Error]:
        vec = fns
        len3 = len(vec)
        result = self.component._realloc0(caller, 0, 0, 4, len3 * 12)
        assert(isinstance(result, int))
        for i4 in range(0, len3):
            e = vec[i4]
            base0 = result + i4 * 12
            (tuplei,tuplei1,) = e
            ptr, len2 = _encode_utf8(tuplei, self.component._realloc0, self.component._core_memory0, caller)
            _store(ctypes.c_uint32, self.component._core_memory0, caller, base0, 4, len2)
            _store(ctypes.c_uint32, self.component._core_memory0, caller, base0, 0, ptr)
            _store(ctypes.c_uint32, self.component._core_memory0, caller, base0, 8, _clamp(tuplei1, 0, 4294967295))
        vec9 = namespace
        len11 = len(vec9)
        result10 = self.component._realloc0(caller, 0, 0, 4, len11 * 8)
        assert(isinstance(result10, int))
        for i12 in range(0, len11):
            e5 = vec9[i12]
            base6 = result10 + i12 * 8
            ptr7, len8 = _encode_utf8(e5, self.component._realloc0, self.component._core_memory0, caller)
            _store(ctypes.c_uint32, self.component._core_memory0, caller, base6, 4, len8)
            _store(ctypes.c_uint32, self.component._core_memory0, caller, base6, 0, ptr7)
        ret = self.component.lift_callee9(caller, result, len3, result10, len11)
        assert(isinstance(ret, int))
        load = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 0)
        expected: Result[None, Error]
        if load == 0:
            expected = Ok(None)
        elif load == 1:
            load13 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            load14 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 8)
            ptr15 = load13
            len16 = load14
            list = _decode_utf8(self.component._core_memory0, caller, ptr15, len16)
            expected = Err(list)
        else:
            raise TypeError("invalid variant discriminant for expected")
        self.component._post_return9(caller, ret)
        return expected

# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from ..intrinsics import _clamp, _decode_utf8, _encode_utf8, _load, _store
import ctypes
from dataclasses import dataclass
from typing import List, Optional, Tuple, Union
import wasmtime

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .. import TypegraphCore


@dataclass
class IntegerConstraints:
    min: Optional[int]
    max: Optional[int]


@dataclass
class Tpe:
    id: int


@dataclass
class StructConstraints:
    props: List[Tuple[str, int]]


@dataclass
class Out0:
    value: Tpe


@dataclass
class Out1:
    value: str


@dataclass
class Out2:
    value: int


@dataclass
class Out3:
    value: int


Out = Union[Out0, Out1, Out2, Out3]


class Core:
    component: "TypegraphCore"

    def __init__(self, component: "TypegraphCore") -> None:
        self.component = component

    def integerb(self, caller: wasmtime.Store, data: IntegerConstraints) -> Tpe:
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
        ret = self.component.lift_callee0(caller, variant, variant2, variant5, variant6)
        assert isinstance(ret, int)
        return Tpe(ret & 0xFFFFFFFF)

    def type_as_integer(
        self, caller: wasmtime.Store, id: int
    ) -> Optional[IntegerConstraints]:
        ret = self.component.lift_callee1(caller, _clamp(id, 0, 4294967295))
        assert isinstance(ret, int)
        load = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 0)
        option5: Optional[IntegerConstraints]
        if load == 0:
            option5 = None
        elif load == 1:
            load0 = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 4)
            option: Optional[int]
            if load0 == 0:
                option = None
            elif load0 == 1:
                load1 = _load(
                    ctypes.c_int32, self.component._core_memory0, caller, ret, 8
                )
                option = load1
            else:
                raise TypeError("invalid variant discriminant for option")
            load2 = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 12)
            option4: Optional[int]
            if load2 == 0:
                option4 = None
            elif load2 == 1:
                load3 = _load(
                    ctypes.c_int32, self.component._core_memory0, caller, ret, 16
                )
                option4 = load3
            else:
                raise TypeError("invalid variant discriminant for option")
            option5 = IntegerConstraints(option, option4)
        else:
            raise TypeError("invalid variant discriminant for option")
        return option5

    def structb(self, caller: wasmtime.Store, data: StructConstraints) -> Tpe:
        record = data
        field = record.props
        vec = field
        len3 = len(vec)
        result = self.component._realloc0(caller, 0, 0, 4, len3 * 12)
        assert isinstance(result, int)
        for i4 in range(0, len3):
            e = vec[i4]
            base0 = result + i4 * 12
            (
                tuplei,
                tuplei1,
            ) = e
            ptr, len2 = _encode_utf8(
                tuplei, self.component._realloc0, self.component._core_memory0, caller
            )
            _store(
                ctypes.c_uint32, self.component._core_memory0, caller, base0, 4, len2
            )
            _store(ctypes.c_uint32, self.component._core_memory0, caller, base0, 0, ptr)
            _store(
                ctypes.c_uint32,
                self.component._core_memory0,
                caller,
                base0,
                8,
                _clamp(tuplei1, 0, 4294967295),
            )
        ret = self.component.lift_callee2(caller, result, len3)
        assert isinstance(ret, int)
        return Tpe(ret & 0xFFFFFFFF)

    def type_as_struct(
        self, caller: wasmtime.Store, id: int
    ) -> Optional[StructConstraints]:
        ret = self.component.lift_callee3(caller, _clamp(id, 0, 4294967295))
        assert isinstance(ret, int)
        load = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 0)
        option: Optional[StructConstraints]
        if load == 0:
            option = None
        elif load == 1:
            load0 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            load1 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 8)
            ptr7 = load0
            len8 = load1
            result: List[Tuple[str, int]] = []
            for i9 in range(0, len8):
                base2 = ptr7 + i9 * 12
                load3 = _load(
                    ctypes.c_int32, self.component._core_memory0, caller, base2, 0
                )
                load4 = _load(
                    ctypes.c_int32, self.component._core_memory0, caller, base2, 4
                )
                ptr = load3
                len5 = load4
                list = _decode_utf8(self.component._core_memory0, caller, ptr, len5)
                load6 = _load(
                    ctypes.c_int32, self.component._core_memory0, caller, base2, 8
                )
                result.append(
                    (
                        list,
                        load6 & 0xFFFFFFFF,
                    )
                )
            option = StructConstraints(result)
        else:
            raise TypeError("invalid variant discriminant for option")
        self.component._post_return0(caller, ret)
        return option

    def get_type_repr(self, caller: wasmtime.Store, id: int) -> Optional[str]:
        ret = self.component.lift_callee4(caller, _clamp(id, 0, 4294967295))
        assert isinstance(ret, int)
        load = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 0)
        option: Optional[str]
        if load == 0:
            option = None
        elif load == 1:
            load0 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            load1 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 8)
            ptr = load0
            len2 = load1
            list = _decode_utf8(self.component._core_memory0, caller, ptr, len2)
            option = list
        else:
            raise TypeError("invalid variant discriminant for option")
        self.component._post_return1(caller, ret)
        return option

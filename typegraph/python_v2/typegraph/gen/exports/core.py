# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from ..intrinsics import _clamp, _encode_utf8, _load, _store
import ctypes
from dataclasses import dataclass
from typing import List, Optional, Tuple, Union
import wasmtime

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .. import TypegraphCore


@dataclass
class Tpe:
    id: int


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

    def integerb(self, caller: wasmtime.Store) -> Tpe:
        ret = self.component.lift_callee0(caller)
        assert isinstance(ret, int)
        return Tpe(ret & 0xFFFFFFFF)

    def integermin(self, caller: wasmtime.Store, id: int, n: int) -> Tpe:
        ret = self.component.lift_callee1(
            caller, _clamp(id, 0, 4294967295), _clamp(n, -2147483648, 2147483647)
        )
        assert isinstance(ret, int)
        return Tpe(ret & 0xFFFFFFFF)

    def structb(self, caller: wasmtime.Store, props: List[Tuple[str, Tpe]]) -> Tpe:
        vec = props
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
            record = tuplei1
            field = record.id
            _store(
                ctypes.c_uint32,
                self.component._core_memory0,
                caller,
                base0,
                8,
                _clamp(field, 0, 4294967295),
            )
        ret = self.component.lift_callee2(caller, result, len3)
        assert isinstance(ret, int)
        return Tpe(ret & 0xFFFFFFFF)

    def gettpe(self, caller: wasmtime.Store, id: int, field: str) -> Optional[Tpe]:
        ptr, len0 = _encode_utf8(
            field, self.component._realloc0, self.component._core_memory0, caller
        )
        ret = self.component.lift_callee3(caller, _clamp(id, 0, 4294967295), ptr, len0)
        assert isinstance(ret, int)
        load = _load(ctypes.c_uint8, self.component._core_memory0, caller, ret, 0)
        option: Optional[Tpe]
        if load == 0:
            option = None
        elif load == 1:
            load1 = _load(ctypes.c_int32, self.component._core_memory0, caller, ret, 4)
            option = Tpe(load1 & 0xFFFFFFFF)
        else:
            raise TypeError("invalid variant discriminant for option")
        return option

# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import ctypes
from typing import Any, Tuple
import wasmtime


def _clamp(i: int, min: int, max: int) -> int:
    if i < min or i > max:
        raise OverflowError(f"must be between {min} and {max}")
    return i


def _encode_utf8(
    val: str, realloc: wasmtime.Func, mem: wasmtime.Memory, store: wasmtime.Storelike
) -> Tuple[int, int]:
    bytes = val.encode("utf8")
    ptr = realloc(store, 0, 0, 1, len(bytes))
    assert isinstance(ptr, int)
    ptr = ptr & 0xFFFFFFFF
    if ptr + len(bytes) > mem.data_len(store):
        raise IndexError("string out of bounds")
    base = mem.data_ptr(store)
    base = ctypes.POINTER(ctypes.c_ubyte)(
        ctypes.c_ubyte.from_address(ctypes.addressof(base.contents) + ptr)
    )
    ctypes.memmove(base, bytes, len(bytes))
    return (ptr, len(bytes))


def _store(
    ty: Any,
    mem: wasmtime.Memory,
    store: wasmtime.Storelike,
    base: int,
    offset: int,
    val: Any,
) -> None:
    ptr = (base & 0xFFFFFFFF) + offset
    if ptr + ctypes.sizeof(ty) > mem.data_len(store):
        raise IndexError("out-of-bounds store")
    raw_base = mem.data_ptr(store)
    c_ptr = ctypes.POINTER(ty)(
        ty.from_address(ctypes.addressof(raw_base.contents) + ptr)
    )
    c_ptr[0] = val


def _load(
    ty: Any, mem: wasmtime.Memory, store: wasmtime.Storelike, base: int, offset: int
) -> Any:
    ptr = (base & 0xFFFFFFFF) + offset
    if ptr + ctypes.sizeof(ty) > mem.data_len(store):
        raise IndexError("out-of-bounds store")
    raw_base = mem.data_ptr(store)
    c_ptr = ctypes.POINTER(ty)(
        ty.from_address(ctypes.addressof(raw_base.contents) + ptr)
    )
    return c_ptr[0]

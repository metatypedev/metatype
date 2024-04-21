from typing import TypeVar, Generic, Union, Optional, Protocol, Tuple, List, Any, Self
from enum import Flag, Enum, auto
from dataclasses import dataclass
from abc import abstractmethod
import weakref

from ..types import Result, Ok, Err, Some


@dataclass
class MatInfo:
    op_name: str
    mat_title: str
    mat_hash: str
    mat_data_json: str

@dataclass
class InitArgs:
    metatype_version: str
    expected_ops: List[MatInfo]

@dataclass
class InitResponse:
    ok: int


@dataclass
class InitError_VersionMismatch:
    value: str


@dataclass
class InitError_UnexpectedMat:
    value: MatInfo


@dataclass
class InitError_Other:
    value: str


InitError = Union[InitError_VersionMismatch, InitError_UnexpectedMat, InitError_Other]



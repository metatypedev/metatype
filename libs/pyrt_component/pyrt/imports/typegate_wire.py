from typing import TypeVar, Generic, Union, Optional, Protocol, Tuple, List, Any, Self
from enum import Flag, Enum, auto
from dataclasses import dataclass
from abc import abstractmethod
import weakref

from ..types import Result, Ok, Err, Some


@dataclass
class Req:
    op_name: str
    in_json: str


def hostcall(req: Req) -> str:
    """
    Raises: `pyrt.types.Err(pyrt.imports.str)`
    """
    raise NotImplementedError

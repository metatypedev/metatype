from typing import TypeVar, Generic, Union, Optional, Protocol, Tuple, List, Any, Self
from enum import Flag, Enum, auto
from dataclasses import dataclass
from abc import abstractmethod
import weakref

from ..types import Result, Ok, Err, Some
from ..imports import shared
from ..exports import mat_wire

class MatWire(Protocol):

    @abstractmethod
    def init(self, args: mat_wire.InitArgs) -> mat_wire.InitResponse:
        """
        Raises: `pyrt.types.Err(pyrt.imports.mat_wire.InitError)`
        """
        raise NotImplementedError

    @abstractmethod
    def handle(self, req: shared.Req) -> Result[str, str]:
        raise NotImplementedError



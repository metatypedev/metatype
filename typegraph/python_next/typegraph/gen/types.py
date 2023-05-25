from dataclasses import dataclass
from typing import Generic, TypeVar, Union


T = TypeVar('T')
@dataclass
class Ok(Generic[T]):
    value: T
E = TypeVar('E')
@dataclass
class Err(Generic[E]):
    value: E

Result = Union[Ok[T], Err[E]]

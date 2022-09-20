# Copyright Metatype under the Elastic License 2.0.

from dataclasses import dataclass
from dataclasses import KW_ONLY


@dataclass(frozen=True, eq=True)
class Runtime:
    runtime_name: str

    @property
    def data(self):
        return {}


@dataclass(eq=True, frozen=True)
class Materializer:
    runtime: Runtime
    _: KW_ONLY
    serial: bool = False

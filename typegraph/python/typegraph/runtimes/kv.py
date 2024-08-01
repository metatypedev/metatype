# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import Optional

from typegraph.gen.exports.runtimes import KvRuntimeData
from typegraph.runtimes.base import Runtime
from typegraph.wit import runtimes, store


class KvRuntime(Runtime):
    host: str
    port: Optional[str]
    db_number: Optional[int]
    password: Optional[str]

    def __ini__(
        self,
        host: str,
        port: Optional[str],
        db_number: Optional[int],
        password: Optional[str],
    ):
        data = KvRuntimeData(
            host=host, port=port, db_number=db_number, password=password
        )
        runtime_id = runtimes.register_kv_runtime(store, data)
        super().__init__(runtime_id.value)
        self.host = host
        self.port = port
        self.db_number = db_number
        self.password = password

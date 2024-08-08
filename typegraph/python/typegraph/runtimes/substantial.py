# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import t
from typegraph.runtimes.base import Runtime


class SubstantialRuntime(Runtime):
    def __init__(self, host: str, port: str):
        # super().__init__(runtimes.register_substantial_runtime(store))
        pass

    def send(event: str, payload: "t.typedef"):
        pass

    def start(workflow: str):
        pass

    def stop(workflow: str):
        pass

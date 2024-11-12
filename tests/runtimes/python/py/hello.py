# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import Dict

from .nested.dep import hello


def sayHello(x: Dict):
    return hello(x["name"])


def identity(x: Dict):
    return x["input"]

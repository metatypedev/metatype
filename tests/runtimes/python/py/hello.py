# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from .nested.dep import hello
from typing import Dict


def sayHello(x: Dict):
    return hello(x["name"])


def identity(x: Dict):
    return x["input"]

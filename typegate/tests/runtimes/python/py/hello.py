from .nested.dep import hello
from typing import Dict


def sayHello(x: Dict):
    return hello(x["name"])


def identity(x: Dict):
    return x["input"]

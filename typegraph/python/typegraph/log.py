from typing import Any
import json


def __format(*largs: Any):
    return " ".join(map(str, largs))


def debug(*largs: Any):
    print("debug:", __format(*largs))


def info(*largs: Any):
    print("info:", __format(*largs))


def warn(*largs: Any):
    print("warning:", __format(*largs))


def error(*largs: Any):
    print("error:", __format(*largs))


def failure(data: Any):
    print("failure:", json.dumps(data))


def success(data: Any):
    print("success:", json.dumps(data))

# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from json import dumps
from typing import Dict, Union
from box import Box
import re


def sanitize_ts_string(content: str):
    return dumps(content)[1:-1]


def inject_params(s: str, params: Union[None, Dict[str, str]]):
    """
    Example:\n
    s = `"{protocol}://{hostname}"`, params= `{'protocol': 'http', 'hostname': 'example.com'}`\n
    returns `"http://example.com"`
    """
    if params is None:
        return s
    for placeholder, value in params.items():
        s = re.sub(f"\\{{\\s*{placeholder}\\s*\\}}", value, s)

    return s


def as_attr(name: str):
    """
    Convert a string into valid attribute\n
    Example:\n
    `root:some complicated/Name` => `root_some_complicated_Name`
    """
    # return re.sub(r"[^0-9a-zA-Z]+", "_", name)
    return Box()._safe_attr(name)

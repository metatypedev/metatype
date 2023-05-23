# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from json import dumps
from typing import Dict, Union
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

# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.
from json import dumps
from typing import Dict
import re


def sanitize_ts_string(content: str):
    return dumps(content)[1:-1]


def inject_params(s: str, params: Dict[str, str] | None):
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

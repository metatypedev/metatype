# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from json import dumps


def sanitize_ts_string(content: str):
    return dumps(content)[1:-1]

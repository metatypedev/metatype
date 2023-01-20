# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import orjson


def sanitize_ts_string(content: str):
    return orjson.dumps(content).decode("utf-8")[1:-1]

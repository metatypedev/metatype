# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from json import dumps


def sanitize_ts_string(content: str):
    return dumps(content)[1:-1]

# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json

from client import rpc_request


first = rpc_request("hello", {"name": "world"})
second = rpc_request("foo")

print(json.dumps({"first": first, "second": second}))

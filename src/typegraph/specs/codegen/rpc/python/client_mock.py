import json

from client import rpc_request


first = rpc_request("hello", {"name": "world"})
second = rpc_request("foo")

print(json.dumps({"first": first, "second": second}))

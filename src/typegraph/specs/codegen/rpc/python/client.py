import json
import sys

from typing import Any, Optional


state = {"id": 0}


def rpc_request(method: str, params: Optional[Any] = None):
    request = {
        "jsonrpc": "2.0",
        "method": method,
        "id": state["id"],
    }

    if params != None:
        request["params"] = params

    json_request = json.dumps(request)

    sys.stdout.write(json_request + "\n")
    sys.stdout.flush()
    state["id"] += 1

    response = json.loads(sys.stdin.readline())

    if "error" in response:
        raise Exception(response["error"]["message"])

    return response["result"]

# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

# ..
from typegraph.graph.tg_deploy import (
    TypegateConnectionOptions,
    TypegraphRemoveParams,
    tg_remove,
)

from typegraph import Graph, typegraph
from typegraph.graph.shared_types import BasicAuth

# skip:start
import sys
# skip:end


# Your typegraph
@typegraph()
def example(g: Graph):
    # ..
    # skip:next-line
    pass


# skip:start
PORT = sys.argv[1]


# skip:end
def remove():
    base_url = "<TYPEGATE_URL>"
    auth = BasicAuth("<USERNAME>", "<PASSWORD>")
    # skip:start
    base_url = f"http://localhost:{PORT}"
    auth = BasicAuth("admin", "password")
    # skip:end

    result = tg_remove(
        example.name,  # pass the typegraph name
        params=TypegraphRemoveParams(
            typegate=TypegateConnectionOptions(url=base_url, auth=auth),
        ),
    )

    return result


# Response from typegate
res = remove()
# skip:next-line
print(res.typegate)

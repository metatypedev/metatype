# ..
import sys
from typegraph.graph.tg_deploy import (
    TypegateConnectionOptions,
    TypegraphRemoveParams,
    tg_remove,
)

from typegraph import Graph, typegraph
from typegraph.graph.shared_types import BasicAuth

# Your typegraph


@typegraph()
def example(g: Graph):
    # ..
    pass


PORT = sys.argv[1]


def remove():
    base_url = "<TYPEGATE_URL>"
    auth = BasicAuth("<USERNAME>", "<PASSWORD>")

    base_url = f"http://localhost:{PORT}"
    auth = BasicAuth("admin", "password")

    result = tg_remove(
        example,
        params=TypegraphRemoveParams(
            typegate=TypegateConnectionOptions(url=base_url, auth=auth)
        ),
    )

    return result


res = remove()

# Response from typegate

print(res.typegate)

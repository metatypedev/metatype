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
# skip: end

# Your typegraph


@typegraph()
def example(g: Graph):
    # ..
    # skip:next-line
    pass


# skip:start
# cwd = sys.argv[1]
PORT = sys.argv[2]
# skip:end


def remove():
    base_url = "<TYPEGATE_URL>"
    auth = BasicAuth("<USERNAME>", "<PASSWORD>")

    # skip:start
    base_url = f"http://localhost:{PORT}"
    auth = BasicAuth("admin", "password")
    # skip:end

    result = tg_remove(
        example,
        params=TypegraphRemoveParams(
            typegate=TypegateConnectionOptions(url=base_url, auth=auth),
        ),
    )

    return result


res = remove()

# Response from typegate
print(res.typegate)

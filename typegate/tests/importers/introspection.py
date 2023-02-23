from pathlib import Path

import httpx
from graphql import get_introspection_query

res = httpx.post(
    "https://hivdb.stanford.edu/graphql", json={"query": get_introspection_query()}
)

with open(Path(__file__).parent.joinpath("introspection.json"), "w") as f:
    f.write(res.text)

from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.http import HTTPRuntime
from typegraph.policies import allow_all
from typegraph.types import types as t

with TypeGraph(
    "elastic",
) as g:

    all = allow_all()
    remote = HTTPRuntime(
        "https://localhost:9200",
        basic_auth_secret="basic",
        cert_secret="cert",
    )

    g.expose(
        user=remote.get(
            "/_cat/indices?format=json",
            t.struct({}),
            t.struct(
                {
                    "id": t.integer(),
                    "login": t.string(),
                }
            ).s_optional(),
            auth_token_field="token",
        ).add_policy(all),
        add=remote.post(
            "/test/_doc",
            t.struct({"name": t.string()}),
            t.struct(
                {
                    "_index": t.string(),
                    "_id": t.string(),
                    "result": t.string(),
                }
            ),
        ).add_policy(all),
        search=remote.get(
            "/test/_search",
            t.struct({}).s_raw({"match": {"match_all": {}}}),
            t.struct(
                {
                    "took": t.integer(),
                    "hits": t.struct(
                        {
                            "total": t.struct({"value": t.integer()}),
                            "max_score": t.float(),
                            "hits": t.list(
                                t.struct(
                                    {
                                        "_index": t.string(),
                                        "_id": t.string(),
                                        "_source": t.struct({"name": t.string()}),
                                    }
                                )
                            ),
                        }
                    ),
                }
            ),
        ).add_policy(all),
    )

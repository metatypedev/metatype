from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.http import HTTPRuntime

with TypeGraph(
    "elastic",
) as g:

    all = policies.allow_all()
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
            ).optional(),
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
            t.struct({}).set({"match": {"match_all": {}}}),
            t.struct(
                {
                    "took": t.integer(),
                    "hits": t.struct(
                        {
                            "total": t.struct({"value": t.integer()}),
                            "max_score": t.float(),
                            "hits": t.array(
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

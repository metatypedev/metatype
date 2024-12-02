# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import os
import json

from client import File, QueryGraph


port = os.environ.get("TG_PORT")

api = QueryGraph()
gql = api.graphql_sync(f"http://localhost:{port}/sample")

res1 = gql.mutation(
    {
        "upload": api.upload(
            {
                "file": File(b"Hello", "hello.txt", "text/plain"),
                "path": "python/hello.txt",
            }
        )
    }
)

res2 = gql.mutation(
    {
        "uploadMany": api.upload_many(
            {
                "files": list(
                    map(lambda i: File(b"Hello", f"{i}", "text/plain"), range(5))
                ),
                "prefix": "python/",
            }
        )
    }
)

print(json.dumps([res1, res2]))

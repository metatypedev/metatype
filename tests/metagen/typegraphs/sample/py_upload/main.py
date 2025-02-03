# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import os
import json

from client import File, QueryGraph, Tranports


port = os.environ.get("TG_PORT")

api = QueryGraph()
gql = Tranports.graphql_sync(api, f"http://localhost:{port}/sample")

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

file = File(b"Hello", "reusable.txt")

res3 = gql.mutation(
    {
        "uploadFirst": api.upload({"file": file, "path": "python/first.txt"}),
        "uploadSecond": api.upload({"file": file, "path": "python/second.txt"}),
    }
)

print(json.dumps([res1, res2, res3]))

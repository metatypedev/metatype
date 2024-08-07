from client import QueryGraph, PostSelections, SelectionFlags, UserSelections, Alias
import json
import os

qg = QueryGraph()
port = os.getenv("TG_PORT")
gql_client = qg.graphql_sync(f"http://localhost:{port}/sample")

res = gql_client.query(
    {
        "user": qg.get_user(
            UserSelections(
                _=SelectionFlags(select_all=True),
                posts=Alias(
                    post1=PostSelections(
                        id=True,
                        slug=True,
                        title=True,
                    ),
                    post2=PostSelections(
                        _=SelectionFlags(select_all=True),
                        id=False,
                    ),
                ),
            ),
        ),
        "posts": qg.get_posts({"_": SelectionFlags(select_all=True)}),
        "scalarNoArgs": qg.scalar_no_args(),
        "scalarArgs": qg.scalar_args(
            {
                "id": "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
                "slug": "",
                "title": "",
            }
        ),
        "compositeNoArgs": qg.composite_no_args({"_": SelectionFlags(select_all=True)}),
        "compositeArgs": qg.composite_args(
            {
                "id": "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
            },
            {"_": SelectionFlags(select_all=True)},
        ),
    }
)

print(json.dumps(res))

# prepared = gql_client.prepare_query(
#     str,
#     lambda args: {
#         "user": qg.get_user(
#             UserArgs(id="1234"),
#             UserSelectParams(
#                 id=True,
#                 email=True,
#                 posts=(PostArgs(filter="top"), PostSelectParams(slug=True, title=True)),
#             ),
#         ),
#         "posts": qg.get_post(
#             PostArgs(filter="today"), PostSelectParams(slug=True, title=True)
#         ),
#     },
# )
#
# out = prepared.do("arg")

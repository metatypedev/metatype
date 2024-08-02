from client import (
    QueryGraph,
    GetUserInput,
    UserSelections,
    GetPostsInput,
    PostSelections,
)
import json
import os

qg = QueryGraph()
port = os.getenv("TG_PORT")
gql_client = qg.graphql_sync(f"http://localhost:{port}/sample")

res = gql_client.query(
    {
        "user": qg.get_user(
            GetUserInput(id="1234"),
            UserSelections(
                id=True,
                email=True,
                posts=(
                    GetPostsInput(filter="top"),
                    PostSelections(slug=True, title=True),
                ),
            ),
        ),
        "posts": qg.get_posts(
            GetPostsInput(filter="today"), PostSelections(slug=True, title=True)
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

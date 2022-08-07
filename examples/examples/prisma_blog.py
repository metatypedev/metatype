from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.prisma import PrismaRuntime
from typegraph.types import typedefs as t

# import debugpy

# debugpy.listen(5678)
# debugpy.wait_for_client()

with TypeGraph(name="blog") as g:
    db = PrismaRuntime("postgresql://postgres:password@localhost:5432/db?schema=blog")

    postAuthor = db.one_to_many(g("User"), g("Post")).named("postAuthor")

    userProfile = db.one_to_one(g("User"), g("Profile")).named("userProfile")

    users = t.struct(
        {
            "id": t.integer().id,
            "name": t.string(),
            "posts": postAuthor.owned(),
            "profile": userProfile.owned(),
        }
    ).named("User")

    profiles = t.struct(
        {"id": t.integer().id, "profilePic": t.string(), "user": userProfile.owner()}
    ).named("Profile")

    posts = t.struct(
        {"id": t.integer().id, "content": t.string(), "author": postAuthor.owner()}
    ).named("Post")

    db.manage(users)
    db.manage(posts)
    db.manage(profiles)

    allow_all = policies.allow_all()

    g.expose(
        **db.gen(
            {
                "createUser": (users, "create", allow_all),
                "findUniqueUser": (users, "findUnique", allow_all),
                "findManyUsers": (users, "findMany", allow_all),
                "updateUser": (users, "update", allow_all),
                "deleteUser": (users, "delete", allow_all),
                "createPost": (posts, "create", allow_all),
                "findUniquePost": (posts, "findUnique", allow_all),
                "findManyPosts": (posts, "findMany", allow_all),
            }
        )
    )

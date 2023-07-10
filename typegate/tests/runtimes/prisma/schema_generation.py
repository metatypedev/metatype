from typegraph import TypeGraph, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph("simple-model") as g1:
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer().as_id.config("auto"),
            "name": t.string(),
        }
    ).named("User")

    g1.expose(
        createUser=db.create(user),
    )


with TypeGraph("one-to-many") as g2:
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer().as_id,
            "posts": db.link(t.array(g2("Post")), "postAuthor"),
        }
    ).named("User")

    post = t.struct(
        {
            "id": t.integer().as_id,
            "author": db.link(g2("User"), "postAuthor"),
        }
    ).named("Post")

    g2.expose(
        createUser=db.create(user),
        createPost=db.create(post),
    )


with TypeGraph("implicit-one-to-many") as g3:
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer().as_id.config("auto"),
            "posts": t.array(g3("Post")),
        }
    ).named("User")

    post = t.struct(
        {
            "id": t.integer().as_id.config("auto"),
            "author": g3("User"),
        }
    ).named("Post")

    g3.expose(
        createUser=db.create(user),
        createPost=db.create(post),
    )


with TypeGraph("optional-one-to-many") as g4:
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer().as_id.config("auto"),
            "posts": t.array(g4("Post")),
        }
    ).named("User")

    post = t.struct(
        {
            "id": t.integer().as_id.config("auto"),
            "author": g4("User").optional(),
        }
    ).named("Post")

    g4.expose(
        createUser=db.create(user),
        createPost=db.create(post),
    )


with TypeGraph("one-to-one") as g5:
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer().as_id,
            "profile": db.link(g5("Profile").optional(), "userProfile"),
        }
    ).named("User")

    profile = t.struct(
        {
            "id": t.uuid().as_id.config("auto"),
            "user": db.link(g5("User"), "userProfile"),
        }
    ).named("Profile")

    g5.expose(
        createUser=db.create(user),
        createProfile=db.create(profile),
    )


with TypeGraph("implicit-one-to-one") as g6:
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer().as_id.config("auto"),
            "profile": g6("Profile").optional().config("unique"),
        }
    ).named("User")

    profile = t.struct(
        {
            "id": t.uuid().as_id.config("auto"),
            "user": g6("User"),
        }
    ).named("Profile")

    g6.expose(
        createUser=db.create(user),
        createProfile=db.create(profile),
    )


with TypeGraph("optional-one-to-one") as g7:
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer().as_id.config("auto"),
            "profile": g7("Profile").optional(),
        }
    ).named("User")

    profile = t.struct(
        {
            "id": t.uuid().as_id.config("auto"),
            "user": db.link(g7("User").optional(), fkey=True),
        }
    ).named("Profile")

    g7.expose(
        createUser=db.create(user),
        createProfile=db.create(profile),
    )


with TypeGraph("semi-implicit-one-to-one") as g8:
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer().as_id,
            "profile": db.link(g8("Profile").optional(), "userProfile"),
        }
    ).named("User")

    profile = t.struct({"id": t.uuid().as_id.config("auto"), "user": g8("User")}).named(
        "Profile"
    )

    g8.expose(
        createUser=db.create(user),
        createProfile=db.create(profile),
    )


with TypeGraph("semi-implicit-one-to-one-2") as g9:
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer().as_id,
            "profile": g9("Profile").optional(),
        }
    ).named("User")

    profile = t.struct(
        {
            "id": t.uuid().as_id.config("auto"),
            "user": db.link(g9("User"), "userProfile"),
        }
    ).named("Profile")

    g9.expose(
        createUser=db.create(user),
        createProfile=db.create(profile),
    )

with TypeGraph("one-to-many-self") as g10:
    db = PrismaRuntime("test", "POSTGRES")

    tree_node = t.struct(
        {
            "id": t.integer().as_id.config("auto"),
            "parent": g10("TreeNode"),
            "children": t.array(g10("TreeNode")),
        }
    ).named("TreeNode")

    g10.expose(
        createTreeNode=db.create(tree_node),
    )


with TypeGraph("explicit-one-to-many-self") as g11:
    db = PrismaRuntime("test", "POSTGRES")

    tree_node = t.struct(
        {
            "id": t.integer().as_id.config("auto"),
            "parent": db.link(g11("TreeNode"), field="children"),
            "children": db.link(t.array(g11("TreeNode")), field="parent"),
        }
    ).named("TreeNode")

    g11.expose(
        createTreeNode=db.create(tree_node),
    )


with TypeGraph("one-to-many-self-2") as g12:
    db = PrismaRuntime("test", "POSTGRES")

    tree_node = t.struct(
        {
            "id": t.integer().as_id.config("auto"),
            "children": t.array(g12("TreeNode")),
            "parent": g12("TreeNode"),
        }
    ).named("TreeNode")

    g12.expose(
        createTreeNode=db.create(tree_node),
    )


with TypeGraph("explicit-one-to-many-self-2") as g13:
    db = PrismaRuntime("test", "POSTGRES")

    tree_node = t.struct(
        {
            "id": t.integer().as_id.config("auto"),
            "children": db.link(t.array(g13("TreeNode")), field="parent"),
            "parent": db.link(g13("TreeNode"), field="children"),
        }
    ).named("TreeNode")

    g13.expose(
        createTreeNode=db.create(tree_node),
    )


with TypeGraph("one-to-one-self") as g14:
    db = PrismaRuntime("test", "POSTGRES")

    list_node = t.struct(
        {
            "id": t.uuid().as_id.config("auto"),
            "next": g14("ListNode").optional().config("unique"),
            "prev": g14("ListNode").optional(),
        }
    ).named("ListNode")

    g14.expose(
        createListNode=db.create(list_node),
    )

with TypeGraph("one-to-one-self-2") as g15:
    db = PrismaRuntime("test", "POSTGRES")

    list_node = t.struct(
        {
            "id": t.uuid().as_id.config("auto"),
            "prev": g15("ListNode").optional(),
            "next": g15("ListNode").optional().config("unique"),
        }
    ).named("ListNode")

    g15.expose(
        createListNode=db.create(list_node),
    )


# TODO ambiguous targets
# with TypeGraph("multiple-relationships") as g16:
#     db = PrismaRuntime("test", "POSTGRES")
#
#     user = t.struct(
#         {
#             "id": t.uuid().as_id.config("auto"),
#             "email": t.email().config("unique"),
#             "posts": t.array(g16("Post")),
#             "favorite_post": t.optional(g16("Post")).config("unique"),
#             "published_posts": t.array(g16("Post")),
#         }
#     ).named("User")
#
#     post = t.struct(
#         {
#             "id": t.uuid().as_id.config("auto"),
#             "title": t.string().min(10).max(256),
#             "content": t.string().min(1000),
#             "author": g16("User"),
#             "publisher": g16("User").optional(),
#             "favorite_of": t.array(g16("User")),
#         }
#     ).named("Post")
#
#     g16.expose(
#         createUser=db.create(user),
#         createPost=db.create(post),
#     )


with TypeGraph("multiple-relationships") as g17:
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.uuid().as_id.config("auto"),
            "email": t.email().config("unique"),
            "posts": db.link(t.array(g17("Post")), field="author"),
            "favorite_post": t.optional(g17("Post")).config("unique"),
        }
    ).named("User")

    post = t.struct(
        {
            "id": t.uuid().as_id.config("auto"),
            "title": t.string().min(10).max(256),
            "content": t.string().min(1000),
            "author": g17("User"),
            "favorite_of": db.link(t.array(g17("User")), field="favorite_post"),
        }
    ).named("Post")

    g17.expose(
        createUser=db.create(user),
        createPost=db.create(post),
    )

with TypeGraph("multiple-relationships-2") as g18:
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.uuid().as_id.config("auto"),
            "email": t.email().config("unique"),
            "posts": db.link(t.array(g18("Post")), field="author"),
            "published_posts": db.link(t.array(g18("Post")), name="PostPublisher"),
            "favorite_post": t.optional(g18("Post")).config("unique"),
        }
    ).named("User")

    post = t.struct(
        {
            "id": t.uuid().as_id.config("auto"),
            "title": t.string().min(10).max(256),
            "content": t.string().min(1000),
            "author": g18("User"),
            "publisher": db.link(g18("User").optional(), name="PostPublisher"),
            "favorite_of": db.link(t.array(g18("User")), field="favorite_post"),
            # "favorite_of": t.array(g("User")),
        }
    ).named("Post")

    # TODO db.create(user) fails here
    g18.expose(
        createUser=db.find_unique(user),
        createPost=db.find_unique(post),
    )

with TypeGraph("multiple-self-relationships") as g19:
    db = PrismaRuntime("test", "POSTGRES")

    person = t.struct(
        {
            "id": t.uuid().as_id.config("auto"),
            "personal_hero": db.link(
                g19("Person").optional().config("unique"), field="hero_of"
            ),
            "hero_of": g19("Person").optional(),
            "mother": g19("Person").optional(),
            "children": db.link(t.array(g19("Person")), field="mother"),
        }
    ).named("Person")

    # TODO db.create(user) fails here
    g19.expose(
        createPerson=db.find_unique(person),
    )

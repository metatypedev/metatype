from typegraph_next import typegraph, t, Policy, Graph
from typegraph_next.providers.prisma import PrismaRuntime


@typegraph()
def simple_model(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "name": t.string(),
        },
        name="User",
    )

    g.expose(
        createUser=db.create(user),
    )


@typegraph()
def one_to_many(g: Graph):
    db = PrismaRuntime("test_one_to_many", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer(as_id=True),
            "posts": db.link(t.array(t.ref("Post")), "postAuthor"),
        },
        name="User",
    )

    post = t.struct(
        {
            "id": t.integer(as_id=True),
            "author": db.link("User", "postAuthor"),
        },
        name="Post",
    )

    g.expose(
        createUser=db.create(user),
        createPost=db.create(post),
    )


@typegraph()
def implicit_one_to_many(g: Graph):
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "posts": t.array(t.ref("Post")),
        },
        name="User",
    )

    post = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "author": t.ref("User"),
        },
        name="Post",
    )

    g.expose(
        createUser=db.create(user),
        createPost=db.create(post),
    )


# @typegraph()
# def optional_one_to_many(g: Graph):
#     db = PrismaRuntime("test", "POSTGRES")
#
#     user = t.struct(
#         {
#             "id": t.integer(as_id=True, config={"auto": True}),
#             "posts": t.array(t.ref("Post")),
#         },
#         name="User",
#     )
#
#     post = t.struct(
#         {
#             "id": t.integer(as_id=True, config={"auto": True}),
#             "author": t.ref("User").optional(),
#         },
#         name="Post",
#     )
#
#     g.expose(
#         createUser=db.create(user),
#         createPost=db.create(post),
#     )
#
#
# @typegraph()
# def one_to_one(g: Graph):
#     db = PrismaRuntime("test", "POSTGRES")
#
#     user = t.struct(
#         {
#             "id": t.integer(as_id=True),
#             "profile": db.link(t.ref("Profile").optional(), "userProfile"),
#         },
#         name="User",
#     )
#
#     profile = t.struct(
#         {
#             "id": t.uuid(as_id=True, config={"auto": True}),
#             "user": db.link("User", "userProfile"),
#         },
#         name="Profile",
#     )
#
#     g.expose(
#         createUser=db.create(user),
#         createProfile=db.create(profile),
#     )
#
#
# @typegraph()
# def implicit_one_to_one(g: Graph):
#     db = PrismaRuntime("test", "POSTGRES")
#
#     user = t.struct(
#         {
#             "id": t.integer(as_id=True, config={"auto": True}),
#             "profile": t.ref("Profile").optional(config={"auto": True}),
#         },
#         name="User",
#     )
#
#     profile = t.struct(
#         {
#             "id": t.uuid(as_id=True, config={"auto": True}),
#             "user": t.ref("User"),
#         },
#         name="Profile",
#     )
#
#     g.expose(
#         createUser=db.create(user),
#         createProfile=db.create(profile),
#     )
#
#
# @typegraph()
# def optional_one_to_one(g: Graph):
#     db = PrismaRuntime("test", "POSTGRES")
#
#     user = t.struct(
#         {
#             "id": t.integer(as_id=True, config={"auto": True}),
#             "profile": t.ref("Profile").optional(),
#         },
#         name="User",
#     )
#
#     profile = t.struct(
#         {
#             "id": t.uuid(as_id=True, config={"auto": True}),
#             "user": db.link(t.ref("User").optional(), fkey=True),
#         },
#         name="Profile",
#     )
#
#     g.expose(
#         createUser=db.create(user),
#         createProfile=db.create(profile),
#     )
#
#
# @typegraph()
# def semi_implicit_one_to_one(g: Graph):
#     db = PrismaRuntime("test", "POSTGRES")
#
#     user = t.struct(
#         {
#             "id": t.integer(as_id=True),
#             "profile": db.link(t.ref("Profile").optional(), "userProfile"),
#         },
#         name="User",
#     )
#
#     profile = t.struct(
#         {"id": t.uuid(as_id=True, config={"auto": True}), "user": t.ref("User")},
#         name="Profile",
#     )
#
#     g.expose(
#         createUser=db.create(user),
#         createProfile=db.create(profile),
#     )
#
#
# @typegraph()
# def semi_implicit_one_to_one_2(g: Graph):
#     db = PrismaRuntime("test", "POSTGRES")
#
#     user = t.struct(
#         {
#             "id": t.integer(as_id=True),
#             "profile": t.ref("Profile").optional(),
#         },
#         name="User",
#     )
#
#     profile = t.struct(
#         {
#             "id": t.uuid(as_id=True, config={"auto": True}),
#             "user": db.link("User", "userProfile"),
#         },
#         name="Profile",
#     )
#
#     g.expose(
#         createUser=db.create(user),
#         createProfile=db.create(profile),
#     )
#
#
# @typegraph()
# def one_to_one_self(g: Graph):
#     db = PrismaRuntime("test", "POSTGRES")
#
#     tree_node = t.struct(
#         {
#             "id": t.integer(as_id=True, config={"auto": True}),
#             "parent": t.ref("TreeNode"),
#             "children": t.array(t.ref("TreeNode")),
#         },
#         name="TreeNode",
#     )
#
#     g.expose(
#         createTreeNode=db.create(tree_node),
#     )
#
#
# @typegraph()
# def one_to_one_self_2(g: Graph):
#     db = PrismaRuntime("test", "POSTGRES")
#
#     tree_node = t.struct(
#         {
#             "id": t.integer(as_id=True, config={"auto": True}),
#             "parent": db.link("TreeNode", field="children"),
#             "children": db.link(t.array(t.ref("TreeNode")), field="parent"),
#         },
#         name="TreeNode",
#     )
#
#     g.expose(
#         createTreeNode=db.create(tree_node),
#     )
#
#
# @typegraph()
# def one_to_many_self(g: Graph):
#     db = PrismaRuntime("test", "POSTGRES")
#
#     tree_node = t.struct(
#         {
#             "id": t.integer(as_id=True, config={"auto": True}),
#             "children": t.array(g12("TreeNode")),
#             "parent": g12("TreeNode"),
#         },
#         name="TreeNode",
#     )
#
#     g.expose(
#         createTreeNode=db.create(tree_node),
#     )
#
#
# @typegraph()
# def one_to_many_self_2(g: Graph):
#     db = PrismaRuntime("test", "POSTGRES")
#
#     tree_node = t.struct(
#         {
#             "id": t.integer(as_id=True, config={"auto": True}),
#             "children": db.link(t.array(t.ref("TreeNode")), field="parent"),
#             "parent": db.link(t.ref("TreeNode"), field="children"),
#         },
#         name="TreeNode",
#     )
#
#     g.expose(
#         createTreeNode=db.create(tree_node),
#     )
#
#
# @typegraph()
# def one_to_one_self(g: Graph):
#     db = PrismaRuntime("test", "POSTGRES")
#
#     list_node = t.struct(
#         {
#             "id": t.uuid(as_id=True, config={"auto": True}),
#             "next": t.ref("ListNode").optional(config={"auto": True}),
#             "prev": t.ref("ListNode").optional(),
#         },
#         name="ListNode",
#     )
#
#     g.expose(
#         createListNode=db.create(list_node),
#     )
#
#
# @typegraph()
# def one_to_one_self_2(g: Graph):
#     db = PrismaRuntime("test", "POSTGRES")
#
#     list_node = t.struct(
#         {
#             "id": t.uuid(as_id=True, config={"auto": True}),
#             "prev": t.ref("ListNode").optional(),
#             "next": t.ref("ListNode").optional(config={"unique": True}),
#         },
#         name="ListNode",
#     )
#
#     g.expose(
#         createListNode=db.create(list_node),
#     )
#
#
# # TODO ambiguous targets
# # with TypeGraph("multiple-relationships") as g16:
# #     db = PrismaRuntime("test", "POSTGRES")
# #
# #     user = t.struct(
# #         {
# #             "id": t.uuid().as_id.config("auto"),
# #             "email": t.email().config("unique"),
# #             "posts": t.array(g16("Post")),
# #             "favorite_post": t.optional(g16("Post")).config("unique"),
# #             "published_posts": t.array(g16("Post")),
# #         }
# #     ).named("User")
# #
# #     post = t.struct(
# #         {
# #             "id": t.uuid().as_id.config("auto"),
# #             "title": t.string().min(10).max(256),
# #             "content": t.string().min(1000),
# #             "author": g16("User"),
# #             "publisher": g16("User").optional(),
# #             "favorite_of": t.array(g16("User")),
# #         }
# #     ).named("Post")
# #
# #     g16.expose(
# #         createUser=db.create(user),
# #         createPost=db.create(post),
# #     )
#
#
# @typegraph()
# def multiple_relationship(g: Graph):
#     db = PrismaRuntime("test", "POSTGRES")
#
#     user = t.struct(
#         {
#             "id": t.uuid(as_id=True, config={"auto": True}),
#             "email": t.email(config={"unique": True}),
#             "posts": db.link(t.array(t.ref("Post")), field="author"),
#             "favorite_post": t.optional(g17("Post")).config("unique"),
#         },
#         name="User",
#     )
#
#     post = t.struct(
#         {
#             "id": t.uuid(as_id=True, config={"auto": True}),
#             "title": t.string(min=10, max=256),
#             "content": t.string(min=1000),
#             "author": t.ref("User"),
#             "favorite_of": db.link(t.array(t.ref("User")), field="favorite_post"),
#         }
#     ).named("Post")
#
#     g.expose(
#         createUser=db.create(user),
#         createPost=db.create(post),
#     )
#
#
# @typegraph()
# def multiple_relationship_2(g: Graph):
#     db = PrismaRuntime("test", "POSTGRES")
#
#     user = t.struct(
#         {
#             "id": t.uuid(as_id=True, config={"auto": True}),
#             "email": t.email(config={"unique": True}),
#             "posts": db.link(t.array(t.ref("Post")), field="author"),
#             "published_posts": db.link(t.array(t.ref("Post")), name="PostPublisher"),
#             "favorite_post": t.optional(t.ref("Post"), config={"unique": True}),
#         },
#         name="User",
#     )
#
#     post = t.struct(
#         {
#             "id": t.uuid(as_id=True, config={"auto": True}),
#             "title": t.string(min=10, max=256),
#             "content": t.string(min=1000),
#             "author": t.ref("User"),
#             "publisher": db.link(t.ref("User").optional(), name="PostPublisher"),
#             "favorite_of": db.link(t.array(t.ref("User")), field="favorite_post"),
#             # "favorite_of": t.array(g("User")),
#         },
#         name="Post",
#     )
#
#     # TODO db.create(user) fails here
#     g.expose(
#         createUser=db.find_unique(user),
#         createPost=db.find_unique(post),
#     )
#
#
# @typegraph()
# def multiple_relationship_3(g: Graph):
#     db = PrismaRuntime("test", "POSTGRES")
#
#     person = t.struct(
#         {
#             "id": t.uuid(as_id=True, config={"auto": True}),
#             "personal_hero": db.link(
#                 t.ref("Person").optional(config={"unique": True}), field="hero_of"
#             ),
#             "hero_of": t.ref("Person").optional(),
#             "mother": t.ref("Person").optional(),
#             "children": db.link(t.array(t.ref("Person")), field="mother"),
#         },
#         name="Person",
#     )
#
#     # TODO db.create(user) fails here
#     g.expose(
#         createPerson=db.find_unique(person),
#     )

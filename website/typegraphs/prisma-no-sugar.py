# # skip:start
# from typegraph import typegraph, effects, t, Graph
# from typegraph.providers.prisma import PrismaRuntime
#
#
# @typegraph()
# def prisma_no_sugar(g: Graph):
#     db = PrismaRuntime("database", "POSTGRES_CONN")
#     message = t.struct({})
#     skip: end
#     t.func(
#         t.struct(
#             {
#                 "data": t.struct(
#                     {
#                         # notice to absence of `id` as automatically generated
#                         "title": t.string(),
#                         "body": t.string(),
#                     }
#                 )
#             }
#         ),
#         t.list(message),
#         PrismaOperationMat(
#             db,
#             "Message",
#             "createOne",
#             effect=effects.create(),
#         ),
#     )

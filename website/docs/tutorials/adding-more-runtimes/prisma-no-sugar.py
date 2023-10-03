# # skip:start
# from typegraph_next import typegraph, effects, t, Graph
# from typegraph_next.providers.prisma import PrismaRuntime
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
#         t.array(message),
#         PrismaOperationMat(
#             db,
#             "Message",
#             "createOne",
#             effect=effects.create(),
#         ),
#     )

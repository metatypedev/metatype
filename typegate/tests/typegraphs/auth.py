from typegraph.graphs.typegraph import github_auth
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import IdentityMat
from typegraph.policies import allow_all
from typegraph.types import typedefs as t


with TypeGraph("auth", auths=[github_auth]) as g:

    all = allow_all()

    x = t.struct({"x": t.integer()})

    g.expose(all=t.func(x, x, IdentityMat()).add_policy(all))

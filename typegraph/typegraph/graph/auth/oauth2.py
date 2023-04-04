# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typegraph.graph.models import Auth

# soon to be deprecated, see __init__.py
github_auth = Auth.oauth2(
    "github",
    "https://github.com/login/oauth/authorize",
    "https://github.com/login/oauth/access_token",
    "openid profile email",
    "https://api.github.com/user",
)

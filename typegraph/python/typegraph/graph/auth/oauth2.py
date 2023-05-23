# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.graph.models import Auth

# soon to be deprecated, see __init__.py
github_auth = Auth.oauth2(
    "github",
    "https://github.com/login/oauth/authorize",
    "https://github.com/login/oauth/access_token",
    "openid profile email",
    "https://api.github.com/user",
)

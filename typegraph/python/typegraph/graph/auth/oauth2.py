# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import Dict

from typegraph.graph.models import Auth


def __gen(auth_name: str, details: Dict[str, str]):
    def auth(scopes: str, name=None):
        return Auth.oauth2(
            name if name is not None else auth_name,
            details.get("authorization_url"),
            details.get("access_url"),
            scopes,
            details.get("profile_url"),
        )

    return auth


for auth_name, details in {
    "bitbucket": {
        "authorization_url": "https://bitbucket.org/site/oauth2/authorize",
        "access_url": "https://bitbucket.org/site/oauth2/access_token",
        "profile_url": "https://api.bitbucket.org/2.0/user",
    },
    "digitalocean": {
        "authorization_url": "https://cloud.digitalocean.com/v1/oauth/authorize",
        "access_url": "https://cloud.digitalocean.com/v1/oauth/token",
        "profile_url": "https://api.digitalocean.com/v2/account",
    },
    "discord": {
        "authorization_url": "https://discord.com/api/oauth2/authorize",
        "access_url": "https://discord.com/api/oauth2/token",
        "profile_url": "https://discord.com/api/users/@me",
    },
    "dropbox": {
        "authorization_url": "https://www.dropbox.com/oauth2/authorize",
        "access_url": "https://api.dropboxapi.com/oauth2/token",
        "profile_url": "https://api.dropboxapi.com/2/users/get_current_account",
    },
    "facebook": {
        "authorization_url": "https://www.facebook.com/v16.0/dialog/oauth",
        "access_url": "https://graph.facebook.com/v16.0/oauth/access_token",
        "profile_url": "https://graph.facebook.com/me",
    },
    "github": {
        "authorization_url": "https://github.com/login/oauth/authorize",
        "access_url": "https://github.com/login/oauth/access_token",
        "profile_url": "https://api.github.com/user",
    },
    "gitlab": {
        "authorization_url": "https://gitlab.com/oauth/authorize",
        "access_url": "https://gitlab.com/oauth/token",
        "profile_url": "https://gitlab.com/api/v3/user",
    },
    "google": {
        "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "access_url": "https://oauth2.googleapis.com/token",
        "profile_url": "https://openidconnect.googleapis.com/v1/userinfo",
    },
    "instagram": {
        "authorization_url": "https://api.instagram.com/oauth/authorize",
        "access_url": "https://api.instagram.com/oauth/access_token",
        "profile_url": "https://graph.instagram.com/me",
    },
    "linkedin": {
        "authorization_url": "https://www.linkedin.com/oauth/v2/authorization",
        "access_url": "https://www.linkedin.com/oauth/v2/accessToken",
        "profile_url": "https://api.linkedin.com/v2/me",
    },
    "reddit": {
        "authorization_url": "https://www.reddit.com/api/v1/authorize",
        "access_url": "https://www.reddit.com/api/v1/access_token",
        "profile_url": "https://oauth.reddit.com/api/v1/me",
    },
    "slack": {
        "authorization_url": "https://slack.com/oauth/v2/authorize",
        "access_url": "https://slack.com/api/oauth.v2.access",
        "profile_url": "https://slack.com/api/auth.test",
    },
    "stackexchange": {
        "authorization_url": "https://stackoverflow.com/oauth",
        "access_url": "https://stackoverflow.com/oauth/access_token/json",
        "profile_url": "https://api.stackexchange.com/2.2/me",
    },
    "teams": {
        "authorization_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "access_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        "profile_url": "https://graph.microsoft.com/oidc/userinfo",
    },
    "twitter": {
        "authorization_url": "https://twitter.com/i/oauth2/authorize",
        "access_url": "https://api.twitter.com/2/oauth2/token",
        "profile_url": "https://api.twitter.com/2/users/me",
    },
    "yahoo": {
        "authorization_url": "https://api.login.yahoo.com/oauth2/request_auth",
        "access_url": "https://api.login.yahoo.com/oauth2/get_token",
        "profile_url": "https://api.login.yahoo.com/openid/v1/userinfo",
    },
}.items():
    globals()[auth_name] = __gen(auth_name, details)

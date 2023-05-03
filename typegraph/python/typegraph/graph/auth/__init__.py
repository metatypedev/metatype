# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.


from typing import Dict

from typegraph.graph.auth import oauth2
from typegraph.graph.models import Auth


def oauth2_gen(auth_name: str, details: Dict[str, str]):
    def auth(scopes: str, name=None):
        return Auth.oauth2(
            name if name is not None else auth_name,
            details.get("authorization_url"),
            details.get("access_url"),
            scopes,
            details.get("user_url"),
        )

    return auth


for name, details in {
    "bitbucket": {
        "authorization_url": "https://bitbucket.org/site/oauth2/authorize",
        "access_url": "https://bitbucket.org/site/oauth2/access_token",
    },
    "digitalocean": {
        "authorization_url": "https://cloud.digitalocean.com/v1/oauth/authorize",
        "access_url": "https://cloud.digitalocean.com/v1/oauth/token",
    },
    "discord": {
        "authorization_url": "https://discord.com/api/oauth2/authorize",
        "access_url": "https://discord.com/api/oauth2/token",
    },
    "dropbox": {
        "authorization_url": "https://www.dropbox.com/oauth2/authorize",
        "access_url": "https://api.dropboxapi.com/oauth2/token",
    },
    "facebook": {
        "authorization_url": "https://www.facebook.com/v16.0/dialog/oauth",
        "access_url": "https://graph.facebook.com/v16.0/oauth/access_token",
    },
    "github": {
        "authorization_url": "https://github.com/login/oauth/authorize",
        "access_url": "https://github.com/login/oauth/access_token",
    },
    "gitlab": {
        "authorization_url": "https://gitlab.com/oauth/authorize",
        "access_url": "https://gitlab.com/oauth/token",
    },
    "google": {
        "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "access_url": "https://oauth2.googleapis.com/token",
    },
    "instagram": {
        "authorization_url": "https://api.instagram.com/oauth/authorize",
        "access_url": "https://api.instagram.com/oauth/access_token",
    },
    "linkedin": {
        "authorization_url": "https://www.linkedin.com/oauth/v2/authorization",
        "access_url": "https://www.linkedin.com/oauth/v2/accessToken",
    },
    "reddit": {
        "authorization_url": "https://www.reddit.com/api/v1/authorize",
        "access_url": "https://www.reddit.com/api/v1/access_token",
    },
    "slack": {
        "authorization_url": "https://slack.com/oauth/v2/authorize",
        "access_url": "https://slack.com/api/oauth.v2.access",
    },
    "stackexchange": {
        "authorization_url": "https://stackoverflow.com/oauth",
        "access_url": "https://stackoverflow.com/oauth/access_token/json",
    },
    "twitter": {
        "authorization_url": "https://twitter.com/i/oauth2/authorize",
        "access_url": "https://api.twitter.com/2/oauth2/token",
    },
    "teams": {
        "authorization_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "access_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    },
    "yahoo": {
        "authorization_url": "https://api.login.yahoo.com/oauth2/request_auth",
        "access_url": "https://api.login.yahoo.com/oauth2/get_token",
    },
}.items():
    setattr(oauth2, name, oauth2_gen(name, details))

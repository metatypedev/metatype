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
            details.get("profiler"),
        )

    return auth


for auth_name, details in {
    "digitalocean": {
        "authorization_url": "https://cloud.digitalocean.com/v1/oauth/authorize",
        "access_url": "https://cloud.digitalocean.com/v1/oauth/token",
        # https://docs.digitalocean.com/reference/api/api-reference/#operation/account_get
        "profile_url": "https://api.digitalocean.com/v2/account",
        "profiler": "(p) => ({id: p.account.uuid})",
    },
    "discord": {
        "authorization_url": "https://discord.com/api/oauth2/authorize",
        "access_url": "https://discord.com/api/oauth2/token",
        # https://discord.com/developers/docs/resources/user
        "profile_url": "https://discord.com/api/users/@me",
        "profiler": "(p) => ({id: p.id})",
    },
    "dropbox": {
        "authorization_url": "https://www.dropbox.com/oauth2/authorize",
        "access_url": "https://api.dropboxapi.com/oauth2/token",
        # https://www.dropbox.com/developers/documentation/http/documentation#users-get_current_account
        # POST
        "profile_url": "POST@https://api.dropboxapi.com/2/users/get_current_account",
        "profiler": "(p) => ({p.account_id})",
    },
    "facebook": {
        "authorization_url": "https://www.facebook.com/v16.0/dialog/oauth",
        "access_url": "https://graph.facebook.com/v16.0/oauth/access_token",
        # https://developers.facebook.com/docs/graph-api/overview#me
        # https://developers.facebook.com/docs/graph-api/reference/user/
        "profile_url": "https://graph.facebook.com/me",
        "profiler": "(p) => ({id: p.id})",
    },
    "github": {
        "authorization_url": "https://github.com/login/oauth/authorize",
        "access_url": "https://github.com/login/oauth/access_token",
        # https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
        "profile_url": "https://api.github.com/user",
        "profiler": "(p) => ({id: `${p.id}`})",
    },
    "gitlab": {
        "authorization_url": "https://gitlab.com/oauth/authorize",
        "access_url": "https://gitlab.com/oauth/token",
        # https://docs.gitlab.com/ee/api/users.html#list-current-user
        "profile_url": "https://gitlab.com/api/v3/user",
        "profiler": "(p) => ({id: p.id})",
    },
    "google": {
        "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "access_url": "https://oauth2.googleapis.com/token",
        # https://cloud.google.com/identity-platform/docs/reference/rest/v1/UserInfo
        "profile_url": "https://openidconnect.googleapis.com/v1/userinfo",
        "profiler": "(p) => ({id: p.localId})",
    },
    "instagram": {
        "authorization_url": "https://api.instagram.com/oauth/authorize",
        "access_url": "https://api.instagram.com/oauth/access_token",
        # https://developers.facebook.com/docs/instagram-basic-display-api/reference/me/
        # https://developers.facebook.com/docs/instagram-basic-display-api/reference/user#reading
        "profile_url": "https://graph.instagram.com/me",
        "profiler": "(p) => ({id: p.id})",
    },
    "linkedin": {
        "authorization_url": "https://www.linkedin.com/oauth/v2/authorization",
        "access_url": "https://www.linkedin.com/oauth/v2/accessToken",
        # https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api#retrieve-current-members-profile
        "profile_url": "https://api.linkedin.com/v2/me",
        "profiler": "(p) => ({id: p.id})",
    },
    "microsoft": {
        "authorization_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "access_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        # https://learn.microsoft.com/en-us/javascript/api/@microsoft/teams-js/app.userinfo?view=msteams-client-js-latest
        "profile_url": "https://graph.microsoft.com/oidc/userinfo",
        "profiler": "(p) => ({id: p.id})",
    },
    "reddit": {
        "authorization_url": "https://www.reddit.com/api/v1/authorize",
        "access_url": "https://www.reddit.com/api/v1/access_token",
        # https://www.reddit.com/dev/api/#GET_api_v1_me
        "profile_url": "https://oauth.reddit.com/api/v1/me",
        "profiler": "(p) => ({id: p.id})",
    },
    "slack": {
        "authorization_url": "https://slack.com/oauth/v2/authorize",
        "access_url": "https://slack.com/api/oauth.v2.access",
        # https://api.slack.com/methods/auth.test
        "profile_url": "https://slack.com/api/auth.test",
        "profiler": "(p) => ({id: p.user_id })",
    },
    "stackexchange": {
        "authorization_url": "https://stackoverflow.com/oauth",
        "access_url": "https://stackoverflow.com/oauth/access_token/json",
        # https://api.stackexchange.com/docs/me
        "profile_url": "https://api.stackexchange.com/2.3/me",
        "profiler": "(p) => ({id: `${p.account_id}`})",
    },
    "twitter": {
        "authorization_url": "https://twitter.com/i/oauth2/authorize",
        "access_url": "https://api.twitter.com/2/oauth2/token",
        # https://developer.twitter.com/en/docs/twitter-api/users/lookup/api-reference/get-users-me
        "profile_url": "https://api.twitter.com/2/users/me",
        "profiler": "(p) => ({id: p.data.id})",
    },
}.items():
    globals()[auth_name] = __gen(auth_name, details)

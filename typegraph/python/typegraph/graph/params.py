# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
import json
from typing import List, Optional
from typegraph.gen.exports import utils
from box import Box


class Rate:
    window_limit: int
    window_sec: int
    query_limit: int
    context_identifier: Optional[str]
    local_excess: int

    def __init__(
        self,
        *,
        window_limit: int,
        window_sec: int,
        query_limit: int,
        context_identifier: Optional[str] = None,
        local_excess: int = 0,
    ):
        self.window_limit = window_limit
        self.window_sec = window_sec
        self.query_limit = query_limit
        self.context_identifier = context_identifier
        self.local_excess = local_excess


class Cors:
    allow_origin: List[str]
    allow_headers: List[str]
    expose_headers: List[str]
    allow_methods: List[str]
    allow_credentials: bool
    max_age_sec: Optional[int]

    def __init__(
        self,
        *,
        allow_origin: List[str] = [],
        allow_headers: List[str] = [],
        expose_headers: List[str] = [],
        allow_methods: List[str] = [],
        allow_credentials: bool = True,
        max_age_sec: Optional[int] = None,
    ):
        self.allow_origin = allow_origin
        self.allow_headers = allow_headers
        self.expose_headers = expose_headers
        self.allow_methods = allow_methods
        self.allow_credentials = allow_credentials
        self.max_age_sec = max_age_sec


class Auth:
    def jwt(name: str, format: str, algorithm: None) -> "utils.Auth":
        """
        [Documentation](http://localhost:3000/docs/guides/authentication#jwt-authentication)
        """
        if algorithm is None:
            algorithm = {}

        auth_data = [
            ("format", json.dumps(format)),
            ("algorithm", json.dumps(algorithm)),
        ]

        return utils.Auth(name, utils.AuthProtocolJwt(), auth_data)

    def hmac256(name: str) -> "utils.Auth":
        return Auth.jwt(name, "raw", {"name": "HMAC", "hash": {"name": "SHA-256"}})

    def basic(users: List[str]) -> "utils.Auth":
        auth_data = [("users", json.dumps(users))]
        return utils.Auth("basic", utils.AuthProtocolBasic(), auth_data)

    @classmethod
    def oauth2(
        cls,
        name: str,
        authorize_url: str,
        access_url: str,
        scopes: str,
        profile_url: Optional[str] = None,
        profiler: Optional[str] = None,
    ) -> "utils.Auth":
        return utils.Auth(
            name,
            utils.AuthProtocolOauth2(),
            [
                ("authorize_url", json.dumps(authorize_url)),
                ("access_url", json.dumps(access_url)),
                ("scopes", json.dumps(scopes)),
                ("profile_url", json.dumps(profile_url)),
                ("profiler", json.dumps(profiler)),
            ],
        )


oauth2 = dict()


@dataclass
class OAuth2Params:
    authorize_url: str
    access_url: str
    profile_url: Optional[str]
    profiler: Optional[str]


_oauth2_params = {
    "digitalocean": OAuth2Params(
        authorize_url="https://cloud.digitalocean.com/v1/oauth/authorize",
        access_url="https://cloud.digitalocean.com/v1/oauth/token",
        # https://docs.digitalocean.com/reference/api/api-reference/#operation/account_get
        profile_url="https://api.digitalocean.com/v2/account",
        profiler="(p) => ({id: p.account.uuid})",
    ),
    "discord": OAuth2Params(
        authorize_url="https://discord.com/api/oauth2/authorize",
        access_url="https://discord.com/api/oauth2/token",
        # https://discord.com/developers/docs/resources/user
        profile_url="https://discord.com/api/users/@me",
        profiler="(p) => ({id: p.id})",
    ),
    "dropbox": OAuth2Params(
        authorize_url="https://www.dropbox.com/oauth2/authorize",
        access_url="https://api.dropboxapi.com/oauth2/token",
        # https://www.dropbox.com/developers/documentation/http/documentation#users-get_current_account
        profile_url="https://api.dropboxapi.com/2/users/get_current_account",
        profiler="(p) => ({id: p.account_id})",
    ),
    "facebook": OAuth2Params(
        authorize_url="https://www.facebook.com/v16.0/dialog/oauth",
        access_url="https://graph.facebook.com/v16.0/oauth/access_token",
        # https://developers.facebook.com/docs/graph-api/overview#me
        # https://developers.facebook.com/docs/graph-api/reference/user/
        profile_url="https://graph.facebook.com/me",
        profiler="(p) => ({id: p.id})",
    ),
    "github": OAuth2Params(
        authorize_url="https://github.com/login/oauth/authorize",
        access_url="https://github.com/login/oauth/access_token",
        # https://docs.github.com/en/rest/reference/users?apiVersion=2022-11-28#get-the-authenticated-user
        profile_url="https://api.github.com/user",
        profiler="(p) => ({id: p.id})",
    ),
    "gitlab": OAuth2Params(
        authorize_url="https://gitlab.com/oauth/authorize",
        access_url="https://gitlab.com/oauth/token",
        # https://docs.gitlab.com/ee/api/users.html#list-current-user
        profile_url="https://gitlab.com/api/v3/user",
        profiler="(p) => ({id: p.id})",
    ),
    "google": OAuth2Params(
        authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
        access_url="https://oauth2.googleapis.com/token",
        # https://cloud.google.com/identity-platform/docs/reference/rest/v1/UserInfo
        profile_url="https://openidconnect.googleapis.com/v1/userinfo",
        profiler="(p) => ({id: p.localId})",
    ),
    "instagram": OAuth2Params(
        authorize_url="https://api.instagram.com/oauth/authorize",
        access_url="https://api.instagram.com/oauth/access_token",
        # https://developers.facebook.com/docs/instagram-basic-display-api/reference/me
        # https://developers.facebook.com/docs/instagram-basic-display-api/reference/user#reading
        profile_url="https://graph.instagram.com/me",
        profiler="(p) => ({id: p.id})",
    ),
    "linkedin": OAuth2Params(
        authorize_url="https://www.linkedin.com/oauth/v2/authorization",
        access_url="https://www.linkedin.com/oauth/v2/accessToken",
        # https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api#retrieve-current-members-profile
        profile_url="https://api.linkedin.com/v2/me",
        profiler="(p) => ({id: p.id})",
    ),
    "microsoft": OAuth2Params(
        authorize_url="https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        access_url="https://login.microsoftonline.com/common/oauth2/v2.0/token",
        # https://learn.microsoft.com/en-us//javascript/api/@microsoft/teams-js/app.userinfo?view=msteams-client-js-latest
        profile_url="https://graph.microsoft.com/oidc/userinfo",
        profiler="(p) => ({id: p.id})",
    ),
    "reddit": OAuth2Params(
        authorize_url="https://www.reddit.com/api/v1/authorize",
        access_url="https://www.reddit.com/api/v1/access_token",
        # https://www.reddit.com/dev/api/#GET_api_v1_me
        profile_url="https://oauth.reddit.com/api/v1/me",
        profiler="(p) => ({id: p.id})",
    ),
    "slack": OAuth2Params(
        authorize_url="https://slack.com/oauth/v2/authorize",
        access_url="https://slack.com/api/oauth.v2.access",
        # https://api.slack.com/methods/auth.test
        profile_url="https://slack.com/api/auth.test",
        profiler="(p) => ({id: p.user_id})",
    ),
    "stackexchange": OAuth2Params(
        authorize_url="https://stackoverflow.com/oauth",
        access_url="https://stackoverflow.com/oauth/access_token/json",
        # https://api.stackexchange.com/docs/me
        profile_url="https://api.stackexchange.com/2.3/me",
        profiler="(p) => ({id: `${p.account_id}`})",
    ),
    "twitter": OAuth2Params(
        authorize_url="https://twitter.com/i/oauth2/authorize",
        access_url="https://api.twitter.com/2/oauth2/token",
        # https://developer.twitter.com/en/docs/twitter-api/users/lookup/api-reference/get-users-me
        profile_url="https://api.twitter.com/2/users/me",
        profiler="(p) => ({id: p.data.id})",
    ),
}


def __gen(auth_name: str, details: OAuth2Params):
    def auth(scopes: str, name=None):
        return Auth.oauth2(
            name if name is not None else auth_name,
            details.authorize_url,
            details.access_url,
            scopes,
            details.profile_url,
            details.profiler,
        )

    return auth


oauth2 = Box(
    {
        auth_name: __gen(auth_name, params)
        for auth_name, params in _oauth2_params.items()
    }
)

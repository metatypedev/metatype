# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
import json
from typing import List, Optional, TYPE_CHECKING, Any
from typegraph.gen.exports import utils
from typegraph.wit import ErrorStack, store, wit_utils

from typegraph.gen.types import Err

if TYPE_CHECKING:
    from typegraph import t


class StdOauth2Profiler:
    pass


class NoProfiler(StdOauth2Profiler):
    pass


@dataclass
class ExtendedProfiler(StdOauth2Profiler):
    extension: Any


@dataclass
class CustomProfiler(StdOauth2Profiler):
    func: "t.func"


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
        profiler: Optional["t.func"] = None,
    ) -> "utils.Auth":
        return utils.Auth(
            name,
            utils.AuthProtocolOauth2(),
            [
                ("authorize_url", json.dumps(authorize_url)),
                ("access_url", json.dumps(access_url)),
                ("scopes", json.dumps(scopes)),
                ("profile_url", json.dumps(profile_url)),
                ("profiler", json.dumps(None if profiler is None else profiler._id)),
            ],
        )

    def oauth2_digitalocean(
        scopes: str, profiler: Optional[StdOauth2Profiler] = None
    ) -> "utils.Auth":
        return RawAuth.from_std("digitalocean", scopes, profiler)

    def oauth2_discord(
        scopes: str, profiler: Optional[StdOauth2Profiler] = None
    ) -> "utils.Auth":
        return RawAuth.from_std("discord", scopes, profiler)

    def oauth2_dropbox(
        scopes: str, profiler: Optional[StdOauth2Profiler] = None
    ) -> "utils.Auth":
        return RawAuth.from_std("dropbox", scopes, profiler)

    def oauth2_facebook(
        scopes: str, profiler: Optional[StdOauth2Profiler] = None
    ) -> "utils.Auth":
        return RawAuth.from_std("facebook", scopes, profiler)

    def oauth2_github(
        scopes: str, profiler: Optional[StdOauth2Profiler] = None
    ) -> "utils.Auth":
        return RawAuth.from_std("github", scopes, profiler)

    def oauth2_gitlab(
        scopes: str, profiler: Optional[StdOauth2Profiler] = None
    ) -> "utils.Auth":
        return RawAuth.from_std("gitlab", scopes, profiler)

    def oauth2_google(
        scopes: str, profiler: Optional[StdOauth2Profiler] = None
    ) -> "utils.Auth":
        return RawAuth.from_std("google", scopes, profiler)

    def oauth2_instagram(
        scopes: str, profiler: Optional[StdOauth2Profiler] = None
    ) -> "utils.Auth":
        return RawAuth.from_std("instagram", scopes, profiler)

    def oauth2_linkedin(
        scopes: str, profiler: Optional[StdOauth2Profiler] = None
    ) -> "utils.Auth":
        return RawAuth.from_std("linkedin", scopes, profiler)

    def oauth2_microsoft(
        scopes: str, profiler: Optional[StdOauth2Profiler] = None
    ) -> "utils.Auth":
        return RawAuth.from_std("microsoft", scopes, profiler)

    def oauth2_reddit(
        scopes: str, profiler: Optional[StdOauth2Profiler] = None
    ) -> "utils.Auth":
        return RawAuth.from_std("reddit", scopes, profiler)

    def oauth2_slack(
        scopes: str, profiler: Optional[StdOauth2Profiler] = None
    ) -> "utils.Auth":
        return RawAuth.from_std("slack", scopes, profiler)

    def oauth2_stackexchange(
        scopes: str, profiler: Optional[StdOauth2Profiler] = None
    ) -> "utils.Auth":
        return RawAuth.from_std("stackexchange", scopes, profiler)

    def oauth2_twitter(
        scopes: str, profiler: Optional[StdOauth2Profiler] = None
    ) -> "utils.Auth":
        return RawAuth.from_std("twitter", scopes, profiler)


@dataclass
class RawAuth:
    json_str: str

    @classmethod
    def from_std(
        cls, service: str, scopes: str, profiler: Optional[StdOauth2Profiler] = None
    ):
        if isinstance(profiler, NoProfiler):
            res = wit_utils.oauth2_without_profiler(store, service, scopes)
        elif isinstance(profiler, ExtendedProfiler):
            res = wit_utils.oauth2_with_extended_profiler(
                store, service, scopes, json.dumps(profiler.extension)
            )
        elif isinstance(profiler, CustomProfiler):
            res = wit_utils.oauth2_with_custom_profiler(
                store, service, scopes, profiler.func._id
            )
        else:  # default profiler
            res = wit_utils.oauth2(store, service, scopes)

        if isinstance(res, Err):
            raise ErrorStack(res.value)
        return cls(res.value)


@dataclass
class OAuth2Params:
    authorize_url: str
    access_url: str
    profile_url: Optional[str]
    profiler: Optional[int]

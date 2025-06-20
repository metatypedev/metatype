# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
import json
from typing import List, Literal, Optional, TYPE_CHECKING, Any, TypedDict
from typegraph.gen import utils
from typegraph.sdk import sdk_utils

if TYPE_CHECKING:
    from typegraph import t


class StdOauth2Profiler:
    pass


class NoProfiler(StdOauth2Profiler):
    pass


OauthProvider = Literal[
    "digitalocean",
    "discord",
    "dropbox",
    "facebook",
    "github",
    "gitlab",
    "google",
    "instagram",
    "linkedin",
    "microsoft",
    "reddit",
    "slack",
    "stackexchange",
    "twitter",
]


@dataclass
class PartialOauth2Params:
    scopes: List[str]
    type: Optional[str]
    profiler: StdOauth2Profiler
    clients: List[sdk_utils.Oauth2Client]


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


class Oauth2Client(TypedDict):
    id: str
    redirect_uri: str


def transform_clients_param(
    clients: List[Oauth2Client],
) -> List[sdk_utils.Oauth2Client]:
    return list(
        map(
            lambda param: sdk_utils.Oauth2Client(
                id=param["id"], redirect_uri=param["redirect_uri"]
            ),
            clients,
        )
    )


class Auth:
    @staticmethod
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

        return utils.Auth(name, "jwt", auth_data)

    @staticmethod
    def hmac256(name: str) -> "utils.Auth":
        return Auth.jwt(name, "raw", {"name": "HMAC", "hash": {"name": "SHA-256"}})

    @staticmethod
    def basic(users: List[str]) -> "utils.Auth":
        auth_data = [("users", json.dumps(users))]
        return utils.Auth("basic", "basic", auth_data)

    @staticmethod
    def oauth2(
        provider: OauthProvider,
        scopes: List[str],
        clients: List[sdk_utils.Oauth2Client],
        type: Optional[str] = None,
        profiler: Optional[StdOauth2Profiler] = None,
    ):
        return RawAuth.from_std(
            provider=provider,
            scopes=scopes,
            clients=clients,
            type=type,
            profiler=profiler,
        )


@dataclass
class RawAuth:
    json_str: str

    @classmethod
    def from_std(
        cls,
        provider: str,
        scopes: List[str],
        clients: List[sdk_utils.Oauth2Client],
        type: Optional[str],
        profiler: Optional[StdOauth2Profiler] = None,
    ):
        base_params = sdk_utils.BaseOauth2Params(
            provider=provider, scopes=" ".join(scopes), clients=clients
        )

        if isinstance(profiler, NoProfiler):
            res = sdk_utils.oauth2_without_profiler(base_params)
        elif isinstance(profiler, ExtendedProfiler):
            res = sdk_utils.oauth2_with_extended_profiler(
                base_params, json.dumps(profiler.extension)
            )
        elif isinstance(profiler, CustomProfiler):
            res = sdk_utils.oauth2_with_custom_profiler(base_params, profiler.func._id)
        else:  # default profiler
            res = sdk_utils.oauth2(base_params)

        return cls(res)


@dataclass
class OAuth2Params:
    authorize_url: str
    access_url: str
    profile_url: Optional[str]
    profiler: Optional[int]

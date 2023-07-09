# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import Dict, List, Literal, Optional

from attrs import define, field, frozen


@define
class Auth:
    name: str
    protocol: str
    auth_data: Dict[str, str]

    @classmethod
    def oauth2(
        cls,
        name: str,
        authorize_url: str,
        access_url: str,
        scopes: str,
        profile_url: Optional[str] = None,
        profiler: Optional[str] = None,
    ) -> "Auth":
        """
        [Documentation](http://localhost:3000/docs/guides/authentication#oauth2-authorization)
        """
        return Auth(
            name,
            "oauth2",
            dict(
                authorize_url=authorize_url,
                access_url=access_url,
                scopes=scopes,
                profile_url=profile_url,
                profiler=profiler,
            ),
        )

    @classmethod
    def jwt(cls, name: str, format: str, algorithm: None) -> "Auth":
        """
        [Documentation](http://localhost:3000/docs/guides/authentication#jwt-authentication)
        """
        if algorithm is None:
            algorithm = {}
        return Auth(name, "jwt", dict(format=format, algorithm=algorithm))

    @classmethod
    def hmac256(cls, name: str) -> "Auth":
        return Auth.jwt(name, "raw", {"name": "HMAC", "hash": {"name": "SHA-256"}})

    @classmethod
    def basic(cls, users: List[str]) -> "Auth":
        return Auth("basic", "basic", {"users": users})


@define
class Cors:
    allow_origin: List[str] = field(factory=list)
    allow_headers: List[str] = field(factory=list)
    expose_headers: List[str] = field(factory=list)
    allow_credentials: bool = True
    max_age_sec: Optional[int] = None


@define
class Rate:
    window_limit: int
    window_sec: int
    query_limit: int
    context_identifier: Optional[str] = None
    local_excess: int = 0


@frozen
class Code:
    name: str
    source: str
    type: Literal["func", "module"] = field(default="func")

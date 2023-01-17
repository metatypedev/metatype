# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Dict
from typing import List
from typing import Literal
from typing import Optional

from attrs import define
from attrs import field
from attrs import frozen


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
    ) -> "Auth":
        return Auth(
            name,
            "oauth2",
            dict(
                authorize_url=authorize_url,
                access_url=access_url,
                scopes=scopes,
                profile_url=profile_url,
            ),
        )

    # deno eval 'await crypto.subtle.generateKey({name: "ECDSA", namedCurve: "P-384"}, true, ["sign", "verify"]).then(k => crypto.subtle.exportKey("jwk", k.publicKey)).then(JSON.stringify).then(console.log);'
    @classmethod
    def jwk(cls, name: str, args=None) -> "Auth":
        return Auth(name, "jwk", args if args is not None else {})

    @classmethod
    def basic(cls, users: List[str]) -> "Auth":
        return Auth("basic", "basic", {"users": users})


@define
class Cors:
    allow_origin: List[str] = field(factory=list)
    allow_headers: List[str] = field(factory=list)
    expose_headers: List[str] = field(factory=list)
    allow_credentials: bool = True
    max_age: Optional[int] = None


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

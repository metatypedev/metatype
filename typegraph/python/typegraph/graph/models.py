# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Dict, List, Literal, Optional

from attrs import define, field, frozen


@define
class Auth:
    """
    Authentication options
    """

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
        """
        OAuth2 authentication
        """
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

    @classmethod
    def jwt(cls, name: str, format: str, algorithm: None) -> "Auth":
        """Import a JSON Web Token for authentication.

        Args:
            name (str): Name of the authentication
            format (str): Format of the key. Can be "jwk", "raw", "pkcs8" or "spki".
            algorithm (Dict[str, str], optional): Arguments for the authentication. Defaults to None. See `algorithm` parameters in [SubtleCrypto.importKey()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey) for more information.

        Example:
            Generate a private/public ECDSA key pair using Deno:
                deno eval '
                    const keys = await crypto.subtle.generateKey({name: "ECDSA", namedCurve: "P-384"}, true, ["sign", "verify"]);
                    const publicKey = await crypto.subtle.exportKey("jwk", keys.publicKey);
                    // save keys.privateKey for later use
                    console.log(JSON.stringify(publicKey));
                    // Auth.jwt("keycloak", "jwk", {"name": "ECDSA", "namedCurve": "P-384"})
                '
        """
        if algorithm is None:
            algorithm = {}
        return Auth(name, "jwt", dict(format=format, algorithm=algorithm))

    @classmethod
    def hmac256(cls, name: str) -> "Auth":
        """Import a HMAC SHA-256 for authentication.

        Args:
            name (str): Name of the authentication
        """
        return Auth.jwt(name, "raw", {"name": "HMAC", "hash": {"name": "SHA-256"}})

    @classmethod
    def basic(cls, users: List[str]) -> "Auth":
        return Auth("basic", "basic", {"users": users})


@define
class Cors:
    """
    CORS options
    """

    allow_origin: List[str] = field(factory=list)
    allow_headers: List[str] = field(factory=list)
    expose_headers: List[str] = field(factory=list)
    allow_credentials: bool = True
    max_age_sec: Optional[int] = None


@define
class Rate:
    """
    Rate limiting options
    """

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

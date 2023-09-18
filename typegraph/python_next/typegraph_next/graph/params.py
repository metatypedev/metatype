# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
from typing import List
from typegraph_next.gen.exports import core

Cors = core.Cors
Rate = core.Rate


class Auth:
    def jwt(name: str, format: str, algorithm: None) -> "core.Auth":
        """
        [Documentation](http://localhost:3000/docs/guides/authentication#jwt-authentication)
        """
        if algorithm is None:
            algorithm = {}

        auth_data = [
            ("format", json.dumps(format)),
            ("algorithm", json.dumps(algorithm)),
        ]

        return core.Auth(name, core.AuthProtocolJwt(), auth_data)

    def hmac256(name: str) -> "core.Auth":
        return Auth.jwt(name, "raw", {"name": "HMAC", "hash": {"name": "SHA-256"}})

    def basic(users: List[str]) -> "core.Auth":
        auth_data = [("users", json.dumps(users))]
        return core.Auth("basic", core.AuthProtocolBasic(), auth_data)

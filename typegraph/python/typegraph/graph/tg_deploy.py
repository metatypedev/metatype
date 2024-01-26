# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
from typing import Dict, Optional
from urllib import request
import json
from base64 import b64encode

from typegraph.graph.typegraph import TypegraphOutput


@dataclass
class BasicAuth:
    username: str
    password: str


@dataclass
class TypegraphDeployParams:
    base_url: str
    cli_version: str
    auth: Optional[BasicAuth] = None
    secrets: Optional[Dict[str, any]] = None


def tg_deploy(tg: TypegraphOutput, params: TypegraphDeployParams):
    sep = "/" if not params.base_url.endswith("/") else ""
    url = params.base_url + sep + "typegate"

    headers = {"Content-Type": "application/json"}
    if params.auth is not None:
        payload = b64encode(
            f"{params.auth.username}:{params.auth.password}".encode("utf-8")
        ).decode("utf-8")
        headers["Authorization"] = f"Basic {payload}"

    req = request.Request(
        url=url,
        method="POST",
        headers=headers,
        data=gql_body(
            tg.serialized, cli_version=params.cli_version, secrets=params.secrets
        ).encode(),
    )

    body = request.urlopen(req).read().decode()
    try:
        return json.loads(body)
    except Exception as _:
        return body


def gql_body(tg: str, cli_version: str, secrets: Optional[Dict[str, any]] = None):
    query = """
    mutation InsertTypegraph($tg: String!, $secrets: String!, $cliVersion: String!) {
        addTypegraph(fromString: $tg, secrets: $secrets, cliVersion: $cliVersion) {
            name
            messages { type text }
            migrations { runtime migrations }
            failure
        }
    }
    """
    return json.dumps(
        {
            "query": query,
            "variables": {
                "tg": tg,
                "secrets": json.dumps(secrets or {}),
                "cliVersion": cli_version,
            },
        }
    )

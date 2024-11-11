# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from pathlib import Path

import httpx

res = httpx.get(
    "https://petstore3.swagger.io/api/v3/openapi.json",
)

with open(Path(__file__).parent.joinpath("openapi_schema.json"), "w") as f:
    f.write(res.text)

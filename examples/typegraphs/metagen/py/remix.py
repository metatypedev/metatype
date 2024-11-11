# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from .remix_types import Idv3, typed_remix_track


# the following decorator makes sure your function
# adheres to the function types from the typegraph
@typed_remix_track
def remix_track(inp: Idv3) -> Idv3:
    return Idv3(
        title=f"{inp.title} (Remix)",
        artist=f"{inp.artist} + DJ Cloud",
        releaseTime=inp.releaseTime,
        mp3Url="https://mp3.url/remix1",
    )

from .remix_types import typed_remix_track, Idv3


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

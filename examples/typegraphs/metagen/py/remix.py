from .fdk import handler_remix_track, Idv3, Ctx


# the following decorator makes sure your function
# adheres to the function types from the typegraph
@handler_remix_track
def remix_track(inp: Idv3, _cx: Ctx) -> Idv3:
    return {
        "title": f"{inp['title']} (Remix)",
        "artist": f"{inp['artist']} + DJ Cloud",
        "release_time": inp["release_time"],
        "mp3_url": "https://mp3.url/remix1",
    }

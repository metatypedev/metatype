import asyncio
from pathlib import Path
from time import sleep
from time import time

from fastapi import APIRouter
from fastapi import FastAPI
from fastapi import Request
import httpx
import hypercorn
import hypercorn.asyncio
import orjson
from typegraph import dist
from typegraph.utils import loaders
from typer import echo
import watchfiles

router = APIRouter()


def serialize_typegraph(tg, indent=False):
    g = tg.build()
    opt = dict(option=orjson.OPT_INDENT_2) if indent else {}
    return orjson.dumps(g, **opt).decode()


def push_typegraph(tg_json, node, backoff=2):
    try:
        payload = {
            "operationName": "insert",
            "variables": {},
            "query": "query insert { addTypegraph(fromString: "
            + orjson.dumps(tg_json).decode()
            + ") { name }}",
        }
        res = httpx.post(f"http://{node}/typegate", json=payload, timeout=15)
        res.raise_for_status()
    except (httpx.ReadTimeout, httpx.ConnectError, httpx.HTTPStatusError) as e:
        if backoff > 0:
            print(f"Backoff: {e}")
            sleep(3)
            return push_typegraph(tg_json, node, backoff=backoff - 1)

        raise e


def reload_typegraphs(tgs, node: str):

    if len(tgs) == 0:
        echo("No typegraph detected")
        return []

    added = []

    for name, tg_json in tgs.items():
        print(name)
        push_typegraph(tg_json, node)

        start = time()
        push_typegraph(tg_json, node)
        end = time()
        echo(f"> Reloaded {name} {round((end - start) * 1000, 2)}ms")
        added.append(name)

    return added


@router.get("/dev")
def dev(request: Request, node: str):
    return reload_typegraphs(request.app.state.tgs, node)


def serve(config: hypercorn.Config, current_path: Path):
    tgs = loaders.import_folder(current_path) + loaders.import_modules(dist)
    serialized_tgs = {tg.name: serialize_typegraph(tg) for tg in tgs}

    app = FastAPI()
    app.include_router(router)
    app.state.tgs = serialized_tgs

    reload_typegraphs(serialized_tgs, "127.0.0.1:7890")

    asyncio.run(hypercorn.asyncio.serve(app, config))


def watch():
    current_path = Path(".").absolute()

    config = hypercorn.Config.from_mapping(bind="127.0.0.1:5000", loglevel="WARN")
    watchfiles.run_process(
        current_path,
        target=serve,
        args=(config, current_path),
        watch_filter=watchfiles.PythonFilter(),
    )

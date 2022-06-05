from pathlib import Path

import native
from typegraph.utils import loaders
from typer import echo


def diff():
    current_path = Path(".").absolute()
    tgs = loaders.import_folder(current_path)

    for tg in tgs:
        for rt in tg.build().runtimes:
            if rt.name == "prisma":

                res = native.diff(
                    {
                        "datasource": rt.data["datasource"],
                        "datamodel": rt.data["datamodel"],
                    }
                )
                print(res["message"])


def sync():
    current_path = Path(".").absolute()
    tgs = loaders.import_folder(current_path)

    for tg in tgs:
        for rt in tg.build().runtimes:
            if rt.name == "prisma":

                res = native.migrate(
                    {
                        "datasource": rt.data["datasource"],
                        "datamodel": rt.data["datamodel"],
                        # "migration_folder": "./migrations",
                    }
                )
                if res["error"] is not None:
                    echo(res["error"])
                    return

                print(res["result"])

    # print(native.migrate("test", dict(a=1))["name"])

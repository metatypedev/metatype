from pathlib import Path
from typing import Optional

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


def apply(file: Optional[str]):
    current_path = Path(".").absolute()
    if file is None:
        tgs = loaders.import_folder(current_path)
    else:
        tgs = loaders.import_file(current_path / file)

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

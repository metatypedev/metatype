from pathlib import Path
from typing import Optional

from typegraph.cli import dev
from typegraph.utils import loaders
from typer import echo


def deploy(file: Optional[str], gate: str):
    current_dir = Path(".").absolute()
    if file is None:
        tgs = loaders.import_folder(current_dir)
    else:
        tgs = loaders.import_file(current_dir / file)
    serialized_tgs = {tg.name: dev.serialize_typegraph(tg) for tg in tgs}
    for name, tg_json in serialized_tgs.items():
        echo(f'Pushing "{name}"...')
        dev.push_typegraph(tg_json, gate)
        echo(f"> Added {name}")

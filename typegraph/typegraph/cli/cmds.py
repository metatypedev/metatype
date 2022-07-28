from typing import Optional

from typegraph.cli import dev as _dev
from typegraph.cli import prisma as _prisma
from typegraph.cli import prod as _prod
from typegraph.cli import test as _test
import typer


root = typer.Typer()


@root.command()
def test():
    _test.test()


@root.command()
def dev():
    _dev.watch()


@root.command()
def serialize(file: str, typegraph: Optional[str] = None):
    _dev.serialize(file, typegraph)


@root.command()
def deploy(
    file: Optional[str] = typer.Argument(None),
    gate: str = typer.Option(
        "localhost:7890", "--gate", "-g", help="url of the typegate"
    ),
):
    _prod.deploy(file, gate)


prisma = typer.Typer()


@prisma.command()
def apply(file: Optional[str] = typer.Option(None, "-f")):
    _prisma.apply(file)


@prisma.command()
def diff():
    _prisma.diff()


root.add_typer(prisma, name="prisma")

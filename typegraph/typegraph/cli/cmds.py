from typegraph.cli import dev as _dev
from typegraph.cli import prisma as _prisma
import typer


root = typer.Typer()


@root.command()
def dev():
    _dev.watch()


prisma = typer.Typer()


@prisma.command()
def apply():
    _prisma.apply()


@prisma.command()
def diff():
    _prisma.diff()


root.add_typer(prisma, name="prisma")

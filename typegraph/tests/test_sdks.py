# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import subprocess
from pathlib import Path
import sys


def serialize(path: Path) -> str:
    print(f"serializing {path}...")
    proc = subprocess.run(
        [
            "cargo",
            "run",
            "-p",
            "meta-cli",
            "-q",
            "-F",
            "typegraph-next",
            "--",
            "serialize",
            "--pretty",
            "-f",
            str(path),
        ],
        capture_output=True,
        text=True,
    )

    print(proc.stderr, file=sys.stderr)

    if proc.returncode == 0:
        return proc.stdout
    else:
        raise Exception("error: return code was not {proc.returncode}")


def test_python_sdk(snapshot):
    snapshot.snapshot_dir = "__snapshots__/"

    for path in Path(__file__).parent.glob("typegraphs/*.py"):
        tg = serialize(path.absolute())
        snapshot.assert_match(tg, f"{path.stem}.json")


def test_deno_sdk(snapshot):
    snapshot.snapshot_dir = "__snapshots__/"

    for path in Path(__file__).parent.glob("typegraphs/*.ts"):
        tg = serialize(path.absolute())
        snapshot.assert_match(tg, f"{path.stem}.json")

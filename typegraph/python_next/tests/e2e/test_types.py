# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import subprocess
from pathlib import Path
import sys


def serialize(path: Path) -> str:
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
        raise Exception("error")


def test_types(snapshot):
    snapshot.snapshot_dir = "__snapshots__/e2e"
    tg = serialize((Path(__file__).parent / "e2e_types.py").absolute())
    snapshot.assert_match(tg, "types.json")

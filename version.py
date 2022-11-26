#!/usr/bin/env python3

import json
import subprocess
import sys

# Usage:
# ./version.py                                      output current version
# ./version.py [major|minor|patch|rc|beta|alpha]    bump version with specified increment


def shell(cmd: str, cwd=None):
    return subprocess.check_output(cmd, shell=True, cwd=cwd)


def cargo_version():
    cargo_metadata = shell("cargo metadata --format-version 1 --no-deps")
    return json.loads(cargo_metadata)["packages"][0]["version"]


def python_set_version(file: str, version: str):
    with open(file, "r") as f:
        ls = f.readlines()

    for i in range(len(ls)):
        if ls[i].startswith("version"):
            ls[i] = f'version = "{version}"\n'

    with open(file, "w") as f:
        f.writelines(ls)


if len(sys.argv) == 1:
    version = cargo_version()
    print(version)
    sys.exit(0)


bump = sys.argv[1]

shell("cargo install cargo-edit")
shell(f"cargo set-version --bump {bump}")
version = cargo_version()
shell(f"poetry version {version}", cwd="typegraph")
python_set_version("typegraph/typegraph/__init__.py", version)

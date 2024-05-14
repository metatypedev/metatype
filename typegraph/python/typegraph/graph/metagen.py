# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
from typing import Union
from typegraph.gen.exports.core import (
    ArtifactResolutionConfig,
    MigrationAction,
    MigrationConfig,
)
from typegraph.gen.exports.utils import MdkConfig
from typegraph.gen.types import Err
from typegraph.graph.shared_types import TypegraphOutput
from typegraph.utils import freeze_tg_output
from typegraph.wit import store, wit_utils

codegen_artefact_config = ArtifactResolutionConfig(
    prisma_migration=MigrationConfig(
        global_action=MigrationAction(create=False, reset=False), migration_dir="."
    ),
    # disable_artifact_resolution=True,
    codegen=True,
)


class Metagen:
    workspace_path: str = ""
    gen_config: any

    def __init__(self, workspace_path: str, gen_config: any) -> None:
        self.gen_config = gen_config
        self.workspace_path = workspace_path

    def run(
        self,
        tg_output: TypegraphOutput,
        target_name: str,
        overwrite: Union[bool, None] = None,
    ):
        frozen_out = freeze_tg_output(codegen_artefact_config, tg_output)
        mdk_config = MdkConfig(
            tg_json=frozen_out.serialize(codegen_artefact_config).tgJson,
            config_json=json.dumps(self.gen_config),
            workspace_path=self.workspace_path,
            target_name=target_name,
        )
        res = wit_utils.metagen_exec(store, mdk_config)
        if isinstance(res, Err):
            raise Exception(res.value)
        for item in res.value:
            if overwrite is not None:
                item.overwrite = overwrite
        return res.value

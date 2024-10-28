# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
from typing import List, Union
from typegraph.gen.core import (
    MigrationAction,
    SerializeParams,
    PrismaMigrationConfig,
)
from typegraph.gen.utils import FdkConfig, FdkOutput
from typegraph.graph.shared_types import TypegraphOutput
from typegraph.utils import freeze_tg_output
from typegraph.sdk import sdk_utils


class Metagen:
    workspace_path: str = ""
    gen_config: any

    def __init__(self, workspace_path: str, gen_config: any) -> None:
        self.gen_config = gen_config
        self.workspace_path = workspace_path

    def _get_fdk_config(
        self,
        tg_output: TypegraphOutput,
        target_name: str,
    ) -> FdkConfig:
        serialize_params = SerializeParams(
            typegraph_path=self.workspace_path + "/tg.py",
            prefix=None,
            artifact_resolution=False,
            codegen=True,
            prisma_migration=PrismaMigrationConfig(
                migrations_dir="prisma-migrations",
                migration_actions=[],
                default_migration_action=MigrationAction(
                    apply=False, create=False, reset=False
                ),
            ),
            pretty=False,
        )

        frozen_out = freeze_tg_output(serialize_params, tg_output)
        return FdkConfig(
            tg_json=frozen_out.serialize(serialize_params).tgJson,
            config_json=json.dumps(self.gen_config),
            workspace_path=self.workspace_path,
            target_name=target_name,
        )

    def dry_run(
        self,
        tg_output: TypegraphOutput,
        target_name: str,
        overwrite: Union[bool, None] = None,
    ) -> List[FdkOutput]:
        fdk_config = self._get_fdk_config(tg_output, target_name)
        res = sdk_utils.metagen_exec(fdk_config)
        for item in res:
            if overwrite is not None:
                item.overwrite = overwrite
        return res

    def run(
        self,
        tg_output: TypegraphOutput,
        target_name: str,
        overwrite: Union[bool, None] = None,
    ):
        items = self.dry_run(tg_output, target_name, overwrite)
        _ = sdk_utils.metagen_write_files(items, self.workspace_path)

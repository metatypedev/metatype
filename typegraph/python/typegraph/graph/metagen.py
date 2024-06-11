# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
from typing import List, Union
from typegraph.gen.exports.core import (
    MigrationAction,
    SerializeParams,
    PrismaMigrationConfig,
)
from typegraph.gen.exports.utils import MdkConfig, MdkOutput
from typegraph.gen.types import Err
from typegraph.graph.shared_types import TypegraphOutput
from typegraph.utils import freeze_tg_output
from typegraph.wit import store, wit_utils
from os import environ as env

_tg_path = env.get("MCLI_TG_PATH")
if _tg_path is None:
    raise Exception("MCLI_TG_PATH not set")

serialize_params = SerializeParams(
    typegraph_path=_tg_path,
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


class Metagen:
    workspace_path: str = ""
    gen_config: any

    def __init__(self, workspace_path: str, gen_config: any) -> None:
        self.gen_config = gen_config
        self.workspace_path = workspace_path

    def _get_mdk_config(
        self,
        tg_output: TypegraphOutput,
        target_name: str,
    ) -> MdkConfig:
        frozen_out = freeze_tg_output(serialize_params, tg_output)
        return MdkConfig(
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
    ) -> List[MdkOutput]:
        mdk_config = self._get_mdk_config(tg_output, target_name)
        res = wit_utils.metagen_exec(store, mdk_config)
        if isinstance(res, Err):
            raise Exception(res.value)
        for item in res.value:
            if overwrite is not None:
                item.overwrite = overwrite
        return res.value

    def run(
        self,
        tg_output: TypegraphOutput,
        target_name: str,
        overwrite: Union[bool, None] = None,
    ):
        items = self.dry_run(tg_output, target_name, overwrite)
        res = wit_utils.metagen_write_files(store, items)
        if isinstance(res, Err):
            raise Exception(res.value)

// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { PrismaRuntimeData, TGRuntime } from "../../types/typegraph.ts";

// from the CLI
export type DataRaw = Omit<PrismaRuntimeData, "datamodel">;

// after the add_datamodel hook
export type DataWithDatamodel = DataRaw & { datamodel: string };

// after the run_migrations hook
export type DataFinal = Omit<DataWithDatamodel, "migration_options">;

export type DS<RTData = DataFinal> = TGRuntime & {
  data: RTData;
};

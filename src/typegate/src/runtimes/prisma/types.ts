// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { RuntimeDataBase } from "../../types.ts";
import type { PrismaRuntimeData, TGRuntime } from "../../typegraph/types.ts";

// from the CLI
// export type DataRaw = Omit<PrismaRuntimeData, "datamodel">;
export type DataRaw = PrismaRuntimeData & RuntimeDataBase;

// after the add_datamodel hook
export type DataWithDatamodel = Omit<DataRaw, "datamodel"> & {
  datamodel: string;
};

// after the run_migrations hook
export type DataFinal = Omit<DataWithDatamodel, "migration_options">;

export type DS<RTData = DataFinal> = TGRuntime & {
  data: RTData;
};

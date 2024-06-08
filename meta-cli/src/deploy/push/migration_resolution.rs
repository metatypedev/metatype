// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// use crate::interlude::*;

// use crate::com::store::{MigrationAction, RuntimeMigrationAction, ServerStore};

// DatabaseReset failure

// #[derive(Debug)]
// pub struct ConfirmDatabaseResetRequired {
//     pub typegraph_path: PathBuf,
//     pub loader: Addr<LoaderActor>,
//     pub runtime_name: String,
// }

// impl ConfirmHandler for ConfirmDatabaseResetRequired {
//     fn on_confirm(&self) {
//         let tg_path = self.typegraph_path.clone();
//         let runtime_name = self.runtime_name.clone();
//         do_force_reset(&self.loader, tg_path, runtime_name);
//     }
// }

// // NullConstraintViolation failure

// /// Set `reset` to `true` for the specified prisma runtime + re-run the typegraph
// fn do_force_reset(loader: &Addr<LoaderActor>, tg_path: PathBuf, runtime_name: String) {
//     // reset
//     let glob_cfg = ServerStore::get_migration_action_glob();
//     ServerStore::set_migration_action(
//         tg_path.clone(),
//         RuntimeMigrationAction {
//             runtime_name,
//             action: MigrationAction {
//                 reset: true, // !
//                 create: glob_cfg.create,
//             },
//         },
//     );

//     // reload
//     loader.do_send(LoadModule(tg_path.into()));
// }

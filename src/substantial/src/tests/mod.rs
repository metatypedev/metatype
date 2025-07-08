// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::backends::Backend;
mod core_logic;
mod utils;

fn link_children_rec(json_obj: &serde_json::Value, backend: &dyn Backend) -> anyhow::Result<()> {
    if let serde_json::Value::Object(map_obj) = json_obj {
        for (parent_id, value) in map_obj {
            match value {
                serde_json::Value::String(child_id) => {
                    backend.write_parent_child_link(parent_id.clone(), child_id.clone())?;
                }
                serde_json::Value::Object(m) => {
                    for direct_child in m.keys() {
                        backend.write_parent_child_link(parent_id.clone(), direct_child.clone())?;
                    }
                    link_children_rec(value, backend)?;
                }
                _ => {}
            }
        }
    }

    Ok(())
}

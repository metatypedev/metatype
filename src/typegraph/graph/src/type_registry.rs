// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    conv::{dedup::DupKeyGen, ConversionMap},
    prelude::*,
};
use color_eyre::eyre::{bail, eyre, Result};

use super::{FunctionType, ObjectType};
use indexmap::IndexMap;
use std::sync::Arc;

#[derive(Default)]
pub struct TypeRegistry {
    pub functions: IndexMap<u32, Arc<FunctionType>>,
    pub namespaces: IndexMap<Vec<Arc<str>>, Arc<ObjectType>>,
    pub input_types: IndexMap<TypeKey, Type>,
    pub output_types: IndexMap<TypeKey, Type>,
}

pub struct TypeRegistryBuilder<'map, G: DupKeyGen> {
    map: &'map ConversionMap<G>,
    registry: TypeRegistry,
}

impl<'map, G: DupKeyGen> TypeRegistryBuilder<'map, G> {
    pub fn new(conversion_map: &'map ConversionMap<G>) -> Self {
        Self {
            map: conversion_map,
            registry: Default::default(),
        }
    }

    pub fn build(mut self, root: &Type) -> Result<TypeRegistry> {
        self.register_type(root)?;

        Ok(self.registry)
    }

    fn register_type(&mut self, ty: &Type) -> Result<()> {
        let map_item = self
            .map
            .direct
            .get(ty.idx() as usize)
            .ok_or_else(|| eyre!("type index out of bounds"))?;

        use crate::conv::MapItem as I;
        match map_item {
            I::Unset => bail!("unexpected"),
            // FIXME we can skip clonning for the path
            I::Namespace(ty, path) => {
                self.registry.namespaces.insert(path.clone(), ty.clone());
                for (_, prop) in ty.properties().iter() {
                    self.register_type(&prop.ty)?;
                }
            }
            I::Function(ty) => {
                self.registry.functions.insert(ty.idx(), ty.clone());
                self.register_value_type(&ty.input().wrap(), input_slot)?;
                self.register_value_type(ty.output(), output_slot)?;
            }
            I::Value(_) => {
                bail!("unexpected")
            }
        }

        Ok(())
    }

    fn register_value_type(
        &mut self,
        ty: &Type,
        slot: fn(&mut TypeRegistry) -> &mut IndexMap<TypeKey, Type>,
    ) -> Result<()> {
        let map_item = self
            .map
            .direct
            .get(ty.idx() as usize)
            .ok_or_else(|| eyre!("type index out of bounds"))?;
        use crate::conv::MapItem as I;

        match map_item {
            I::Value(_) => {
                let map = slot(&mut self.registry);
                // map.entry
                if !map.contains_key(&ty.key()) {
                    map.insert(ty.key(), ty.clone());
                    for child_ty in ty.children().iter() {
                        self.register_value_type(child_ty, slot)?;
                    }
                }
            }
            I::Function(_) => {
                self.register_type(ty)?;
            }
            _ => unreachable!(),
        }

        Ok(())
    }
}

fn input_slot(reg: &mut TypeRegistry) -> &mut IndexMap<TypeKey, Type> {
    &mut reg.input_types
}

fn output_slot(reg: &mut TypeRegistry) -> &mut IndexMap<TypeKey, Type> {
    &mut reg.output_types
}

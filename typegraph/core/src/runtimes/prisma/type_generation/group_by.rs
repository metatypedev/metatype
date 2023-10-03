// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    runtimes::prisma::type_generation::{where_::Where, with_filters::WithFilters},
    t::{self, ConcreteTypeBuilder, TypeBuilder},
    types::{Type, TypeId},
};

use super::{aggregate::CountOutput, TypeGen, TypeGenContext};

pub struct GroupingFields {
    model_id: TypeId,
}

impl GroupingFields {
    pub fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for GroupingFields {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let mut fields = vec![];
        for (k, type_id) in self.model_id.as_struct()?.iter_props() {
            if context
                .registry
                .find_relationship_on(self.model_id, k)
                .is_some()
            {
                continue;
            }

            match type_id.non_optional_concrete_type()?.as_type()? {
                Type::Boolean(_)
                | Type::Integer(_)
                | Type::Float(_)
                | Type::String(_)
                | Type::Array(_) => fields.push(k.to_string()),
                _ => {}
            }
        }

        t::arrayx(t::string().enum_(fields))?
            .named(self.name())
            .build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
        format!("_{}_GroupingFields", model_name)
    }
}

pub struct Having {
    model_id: TypeId,
}

impl Having {
    pub fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for Having {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        // TODO relations??
        let where_type = context.generate(&Where::new(self.model_id, false))?;
        let extended_type = context
            .generate(&WithFilters::new(where_type, self.model_id, true).with_aggregates())?;

        let name = self.name();
        let self_ref = t::proxy(&name).build()?;

        t::unionx![
            extended_type,
            t::struct_().propx("AND", t::array(self_ref))?,
            t::struct_().propx("OR", t::array(self_ref))?,
            t::struct_().prop("NOT", self_ref)
        ]
        .named(name)
        .build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
        format!("_{}_Having", model_name)
    }
}

pub struct GroupByResult {
    model_id: TypeId,
}

impl GroupByResult {
    pub fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for GroupByResult {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let model_id = self.model_id;
        t::array(
            t::struct_extends(model_id)?
                .prop(
                    "_count",
                    context.generate(&CountOutput::new(self.model_id))?, // TODO integer filter
                )
                .prop(
                    "_avg",
                    context.generate(&SelectNumbers::new(model_id, true))?,
                )
                .prop(
                    "_sum",
                    context.generate(&SelectNumbers::new(model_id, false))?,
                )
                .prop(
                    "_min",
                    context.generate(&SelectNumbers::new(model_id, false))?,
                )
                .prop(
                    "_max",
                    context.generate(&SelectNumbers::new(model_id, false))?,
                )
                .build()?,
        )
        .named(self.name())
        .build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
        format!("_{}_GroupByResult", model_name)
    }
}

struct SelectNumbers {
    model_id: TypeId,
    promote_to_float: bool,
}

impl SelectNumbers {
    pub fn new(model_id: TypeId, promote_to_float: bool) -> Self {
        Self {
            model_id,
            promote_to_float,
        }
    }
}

impl TypeGen for SelectNumbers {
    fn generate(&self, _context: &mut TypeGenContext) -> Result<TypeId> {
        let mut builder = t::struct_();
        let opt_float = t::optional(t::float().build()?).build()?;
        let for_int = if self.promote_to_float {
            opt_float
        } else {
            t::optional(t::integer().build()?).build()?
        };
        for (k, type_id) in self.model_id.as_struct()?.iter_props() {
            let type_id = type_id.non_optional_concrete_type()?;
            match type_id.as_type()? {
                Type::Integer(_) => {
                    builder.prop(k, for_int);
                }
                Type::Float(_) => {
                    builder.prop(k, opt_float);
                }
                _ => {}
            }
        }

        builder.named(self.name()).build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
        let suffix = if self.promote_to_float { "_1" } else { "" };
        format!("_{model_name}_SelectNumbers_{suffix}")
    }
}

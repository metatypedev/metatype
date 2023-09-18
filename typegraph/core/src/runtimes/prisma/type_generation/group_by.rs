// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    global_store::with_store,
    runtimes::prisma::type_generation::{
        where_::Where,
        with_filters::{NumberType, WithFilters},
    },
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
        let fields = with_store(|s| {
            self.model_id
                .as_struct(s)
                .unwrap()
                .data
                .props
                .iter()
                .filter_map(|(k, type_id)| {
                    if context
                        .registry
                        .find_relationship_on(self.model_id, k)
                        .is_some()
                    {
                        return None;
                    }

                    let typ = s.get_type(type_id.into()).unwrap();
                    let typ = match typ {
                        Type::Optional(inner) => s.get_type(inner.data.of.into()).unwrap(),
                        _ => typ,
                    };

                    match typ {
                        Type::Boolean(_)
                        | Type::Integer(_)
                        | Type::Float(_)
                        | Type::String(_)
                        | Type::Array(_) => Some(k.clone()),
                        _ => None,
                    }
                })
                .collect::<Vec<_>>()
        });

        t::array(t::string().enum_(fields).build()?)
            .named(self.name(context))
            .build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        let model_name = context.get_model_name(self.model_id);
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

        let name = self.name(context);
        let self_ref = t::proxy(&name).build()?;

        t::union([
            extended_type,
            t::struct_()
                .prop("AND", t::array(self_ref).build()?)
                .build()?,
            t::struct_()
                .prop("OR", t::array(self_ref).build()?)
                .build()?,
            t::struct_().prop("NOT", self_ref).build()?,
        ])
        .named(name)
        .build()

        // struct Prop {
        //     key: String,
        //     typ: NumberType,
        // }
        //
        // let props = with_store(|s| {
        //     self.model_id
        //         .as_struct(s)
        //         .unwrap()
        //         .data
        //         .props
        //         .iter()
        //         .filter_map(|(k, type_id)| {
        //             let typ = s.get_type(type_id.into()).unwrap();
        //             let typ = match typ {
        //                 Type::Optional(inner) => s.get_type(inner.data.of.into()).unwrap(),
        //                 _ => typ,
        //             };
        //
        //             match typ {
        //                 Type::Integer(_) => Some(Prop {
        //                     key: k.clone(),
        //                     typ: NumberType::Integer,
        //                 }),
        //                 Type::Float(_) => Some(Prop {
        //                     key: k.clone(),
        //                     typ: NumberType::Float,
        //                 }),
        //                 _ => None,
        //             }
        //         })
        //         .collect::<Vec<_>>()
        // });
        //
        // let mut builder = t::struct_();
        //
        // for prop in props.into_iter() {
        //     let base = context.generate(&NumberFilter(prop.typ))?;
        //
        //     builder.prop(
        //         prop.key,
        //         t::optional(
        //             t::union([
        //                 base,
        //                 t::struct_()
        //                     .prop(
        //                         "_count",
        //                         context.generate(&NumberFilter(NumberType::Integer))?,
        //                     )
        //                     .build()?,
        //                 t::struct_()
        //                     .prop("_avg", context.generate(&NumberFilter(NumberType::Float))?)
        //                     .build()?,
        //                 t::struct_().prop("_sum", base).build()?,
        //                 t::struct_().prop("_min", base).build()?,
        //                 t::struct_().prop("_max", base).build()?,
        //             ])
        //             .build()?,
        //         )
        //         .build()?,
        //     );
        // }
        //
        // let name = self.name(context);
        // let self_ref = t::proxy(&name).build()?;
        //
        // t::either([
        //     // builder.named(format!("{name}_intermediate")).build()?,
        //     builder.build()?,
        //     t::struct_()
        //         .prop("AND", t::array(self_ref).build()?)
        //         .build()?,
        //     t::struct_()
        //         .prop("OR", t::array(self_ref).build()?)
        //         .build()?,
        //     t::struct_().prop("NOT", self_ref).build()?,
        // ])
        // .named(name)
        // .build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        let model_name = context.get_model_name(self.model_id);
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
        .named(self.name(context))
        .build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        let model_name = context.get_model_name(self.model_id);
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
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let props = with_store(|s| {
            self.model_id.as_struct(s).map(|typ| {
                typ.data
                    .props
                    .iter()
                    .filter_map(|(k, type_id)| {
                        let typ = s.get_type(type_id.into()).unwrap();
                        let typ = match typ {
                            Type::Optional(inner) => s.get_type(inner.data.of.into()).unwrap(),
                            _ => typ,
                        };

                        match typ {
                            Type::Integer(_) => Some((k.clone(), NumberType::Integer)),
                            Type::Float(_) => Some((k.clone(), NumberType::Float)),
                            _ => None,
                        }
                    })
                    .collect::<Vec<_>>()
            })
        })?;

        let mut builder = t::struct_();
        let opt_int = t::optional(t::integer().build()?).build()?;
        let opt_float = t::optional(t::float().build()?).build()?;
        if self.promote_to_float {
            for (k, _) in props.into_iter() {
                builder.prop(k, opt_float);
            }
        } else {
            for (k, typ) in props.into_iter() {
                builder.prop(
                    k,
                    match typ {
                        NumberType::Integer => opt_int,
                        NumberType::Float => opt_float,
                    },
                );
            }
        }
        builder.named(self.name(context)).build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        let model_name = context.get_model_name(self.model_id);
        let suffix = if self.promote_to_float { "_1" } else { "" };
        format!("_{model_name}_SelectNumbers_{suffix}")
    }
}

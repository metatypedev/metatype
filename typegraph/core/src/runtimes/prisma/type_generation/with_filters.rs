// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    global_store::{with_store, Store},
    t::{self, ConcreteTypeBuilder, TypeBuilder},
    types::{Type, TypeFun, TypeId},
};

use super::{TypeGen, TypeGenContext};

pub struct WithFilters {
    type_id: TypeId,
    model_id: TypeId,
    skip_rel: bool, // TODO list??
    with_aggregates: bool,
}

impl WithFilters {
    pub fn new(type_id: TypeId, model_id: TypeId, skip_rel: bool) -> Self {
        Self {
            type_id,
            model_id,
            skip_rel,
            with_aggregates: false,
        }
    }

    pub fn with_aggregates(mut self) -> Self {
        self.with_aggregates = true;
        self
    }
}

impl TypeGen for WithFilters {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        enum PropType {
            Boolean,
            Number(NumberType),
            String,
            Model(TypeId),
            // TODO aggregates??
            // scalar list
            Array(TypeId),
            // TODO (mongo only): composite types
            // see: https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#composite-type-filters
        }
        struct Prop {
            key: String,
            prop_type: PropType,
        }

        let mut props = vec![];

        with_store(|s| -> Result<_> {
            for (k, id) in self.type_id.as_struct(s).unwrap().data.props.iter() {
                let mut id: TypeId = (*id).into();
                let mut ty = s.get_type(id)?;
                if let Type::Optional(opt) = ty {
                    id = opt.data.of.into();
                    ty = s.get_type(id)?;
                }

                // TODO relationship
                let rel = context.registry.find_relationship_on(self.model_id, k);
                if let Some(rel) = rel {
                    if self.skip_rel {
                        continue;
                    }

                    let target_model =
                        rel.get(rel.side_of_model(self.model_id).unwrap().opposite());
                    props.push(Prop {
                        key: k.to_string(),
                        prop_type: PropType::Model(target_model.model_type),
                    });
                    continue;
                }

                match ty {
                    Type::Optional(_) => return Err("optional of optional!?".to_string()),
                    Type::Boolean(_) => {
                        props.push(Prop {
                            key: k.to_string(),
                            prop_type: PropType::Boolean,
                        });
                    }
                    Type::Integer(_) => {
                        props.push(Prop {
                            key: k.to_string(),
                            prop_type: PropType::Number(NumberType::Integer),
                        });
                    }
                    Type::Float(_) => {
                        props.push(Prop {
                            key: k.to_string(),
                            prop_type: PropType::Number(NumberType::Float),
                        });
                    }
                    Type::String(_) => {
                        props.push(Prop {
                            key: k.to_string(),
                            prop_type: PropType::String,
                        });
                    }
                    Type::Array(inner) => {
                        props.push(Prop {
                            key: k.to_string(),
                            prop_type: PropType::Array(inner.data.of.into()),
                        });
                    }
                    _ => {
                        return Err(format!(
                            "type '{}' not supported by prisma",
                            ty.get_data().variant_name()
                        ));
                    }
                }
            }
            Ok(())
        })?;

        let mut builder = t::struct_();
        builder.named(self.name(context));
        for prop in props {
            let ty = match prop.prop_type {
                PropType::Boolean => context.generate(&CompleteFilter(BooleanFilter))?,
                PropType::Number(num) => context.generate(&CompleteFilter(NumberFilter::new(
                    num,
                    self.with_aggregates,
                )))?,
                PropType::String => context.generate(&CompleteFilter(StringFilter))?,
                PropType::Array(of) => context.generate(&CompleteFilter(ScalarListFilter(of)))?,
                PropType::Model(target_model_id) => context.generate(&WithFilters {
                    type_id: target_model_id,
                    model_id: target_model_id, // TODO ???
                    skip_rel: true,
                    with_aggregates: false,
                })?,
            };
            builder.prop(prop.key, t::optional(ty).build()?);
        }

        builder.build()
    }

    fn name(&self, _context: &TypeGenContext) -> String {
        let suffix = if self.skip_rel { "_norel" } else { "" };
        let suffix2 = if self.with_aggregates {
            "_with_aggregates"
        } else {
            ""
        };
        format!("_{}WithFilters{}{}", self.type_id.0, suffix, suffix2)
    }
}

struct CompleteFilter<T: TypeGen>(T);

impl<T: TypeGen> TypeGen for CompleteFilter<T> {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let inner = context.generate(&self.0)?;
        // TODO and, or ???
        t::optional(t::union([inner, t::struct_().prop("not", inner).build()?]).build()?)
            .named(self.name(context))
            .build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        format!("{}_c", self.0.name(context))
    }
}

struct BooleanFilter;

impl TypeGen for BooleanFilter {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        t::union([
            t::boolean().build()?,
            t::struct_().prop("equals", t::boolean().build()?).build()?,
            t::struct_().prop("not", t::boolean().build()?).build()?,
        ])
        .named(self.name(context))
        .build()
    }

    fn name(&self, _context: &TypeGenContext) -> String {
        "_boolean_filter".to_string()
    }
}

#[derive(Clone, Copy)]
pub enum NumberType {
    Integer,
    Float,
}

pub struct NumberFilter {
    pub number_type: NumberType,
    pub with_aggregates: bool,
}

impl NumberFilter {
    pub fn new(number_type: NumberType, with_aggregates: bool) -> Self {
        Self {
            number_type,
            with_aggregates,
        }
    }
}

impl TypeGen for NumberFilter {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        if self.with_aggregates {
            let base = context.generate(&NumberFilter::new(self.number_type, false))?;
            let float_base = context.generate(&NumberFilter::new(NumberType::Float, false))?;
            let int_base = context.generate(&NumberFilter::new(NumberType::Integer, false))?;
            t::union([
                base,
                t::struct_().prop("_count", int_base).build()?,
                t::struct_().prop("_sum", base).build()?,
                t::struct_().prop("_avg", float_base).build()?,
                t::struct_().prop("_min", base).build()?,
                t::struct_().prop("_max", base).build()?,
            ])
            .build()
        } else {
            let type_id = match self.number_type {
                NumberType::Integer => t::integer().build()?,
                NumberType::Float => t::float().build()?,
            };
            let opt_type_id = t::optional(type_id).build()?;
            let array_type_id = t::array(type_id).build()?;
            t::either([
                type_id,
                t::struct_().prop("equals", type_id).build()?,
                t::struct_().prop("not", type_id).build()?,
                t::struct_()
                    .prop("lt", opt_type_id)
                    .prop("gt", opt_type_id)
                    .prop("lte", opt_type_id)
                    .prop("gte", opt_type_id)
                    .min(1)
                    .build()?,
                t::struct_().prop("in", array_type_id).build()?,
                t::struct_().prop("notIn", array_type_id).build()?,
            ])
            .named(self.name(context))
            .build()
        }
    }

    fn name(&self, _context: &TypeGenContext) -> String {
        let suffix = if self.with_aggregates {
            "_with_aggregates"
        } else {
            ""
        };
        match self.number_type {
            NumberType::Integer => format!("_integer_filter{suffix}"),
            NumberType::Float => format!("_float_filter{suffix}"),
        }
    }
}

struct StringFilter;

impl TypeGen for StringFilter {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let type_id = t::string().build()?;
        let opt_type_id = t::optional(type_id).build()?;
        let array_type_id = t::array(type_id).build()?;

        t::union([
            type_id,
            t::struct_().prop("equals", type_id).build()?,
            t::struct_().prop("not", type_id).build()?,
            t::struct_().prop("in", array_type_id).build()?,
            t::struct_().prop("notIn", array_type_id).build()?,
            t::struct_()
                .prop("contains", type_id)
                .prop(
                    "mode",
                    t::optional(t::string().enum_(vec!["insensitive".to_string()]).build()?)
                        .build()?,
                )
                .build()?,
            // TODO optional feature -- previewFeatures = ["fullTextSearch"]
            t::struct_().prop("search", type_id).build()?,
            t::struct_()
                .prop("startsWith", opt_type_id)
                .prop("endsWith", opt_type_id)
                .min(1)
                .build()?,
        ])
        .named(self.name(context))
        .build()
    }

    fn name(&self, _context: &TypeGenContext) -> String {
        "_string_filter".to_string()
    }
}

struct ScalarListFilter(TypeId);

impl TypeGen for ScalarListFilter {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        with_store(|s| -> Result<()> {
            match self.0.as_type(s)? {
                Type::Optional(_) => Err("array of optional not supported".to_owned()), // TODO
                _ => Ok(()),
            }
        })?;

        // we can use union here instead of either since the structs do not have
        // overlapping fields.
        // Union validation is more efficient.
        t::union([
            t::struct_().prop("has", self.0).build()?,
            t::struct_()
                .prop("hasEvery", t::array(self.0).build()?)
                .build()?,
            t::struct_()
                .prop("hasSome", t::array(self.0).build()?)
                .build()?,
            t::struct_()
                .prop("isEmpty", t::boolean().build()?)
                .build()?,
            // TODO "isSet": mongo only
            t::struct_()
                .prop("equals", t::array(self.0).build()?)
                .build()?,
        ])
        .named(self.name(context))
        .build()
    }

    fn name(&self, _context: &TypeGenContext) -> String {
        format!("_list_filter_{}", self.0 .0)
    }
}

pub struct WithAggregateFilters {
    model_id: TypeId,
    type_id: TypeId,
}

impl TypeGen for WithAggregateFilters {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        t::struct_extends(self.type_id)?
            .prop(
                "_count",
                context.generate(&CountFilter::new(self.model_id))?,
            )
            .prop("_avg", context.generate(&AvgFilter::new(self.model_id))?)
            .prop("_sum", context.generate(&SumFilter::new(self.model_id))?)
            .prop("_min", context.generate(&SumFilter::new(self.model_id))?)
            .prop("_max", context.generate(&SumFilter::new(self.model_id))?)
            .build()
    }

    fn name(&self, _context: &TypeGenContext) -> String {
        // TODO model id??
        let name = with_store(|s| {
            self.model_id
                .as_type(s)
                .unwrap()
                .get_base()
                .unwrap()
                .name
                .clone()
                .unwrap()
        });
        format!("{name}_with_aggregate_filters")
    }
}

struct CountFilter {
    model_id: TypeId,
}

impl CountFilter {
    pub fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for CountFilter {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let keys = get_props(self.model_id, |_s, k, _type_id| Some(k.to_string()));

        gen_aggregate_filter(
            context,
            keys,
            |key| (key, NumberType::Integer),
            self.name(context),
        )
    }

    fn name(&self, context: &TypeGenContext) -> String {
        let model = context
            .registry
            .models
            .get(&self.model_id)
            .unwrap()
            .name
            .clone();
        format!("_{model}_CountFilter")
    }
}

struct AvgFilter {
    model_id: TypeId,
}

impl AvgFilter {
    pub fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for AvgFilter {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let keys = get_props(self.model_id, |s, k, type_id| {
            let typ = s.get_type(type_id).unwrap();
            let non_opt_type = match typ {
                Type::Optional(inner) => s.get_type(inner.data.of.into()).unwrap(),
                _ => typ,
            };
            match non_opt_type {
                Type::Integer(_) | Type::Float(_) => Some(k.to_string()),
                _ => None,
            }
        });

        gen_aggregate_filter(
            context,
            keys,
            |key| (key, NumberType::Float),
            self.name(context),
        )
    }

    fn name(&self, context: &TypeGenContext) -> String {
        let model = context
            .registry
            .models
            .get(&self.model_id)
            .unwrap()
            .name
            .clone();
        format!("_{model}_AvgFilter")
    }
}

struct SumFilter {
    model_id: TypeId,
}

impl SumFilter {
    pub fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for SumFilter {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let props = get_props(self.model_id, |s, k, type_id| {
            let typ = s.get_type(type_id).unwrap();
            let non_opt_type = match typ {
                Type::Optional(inner) => s.get_type(inner.data.of.into()).unwrap(),
                _ => typ,
            };
            match non_opt_type {
                Type::Integer(_) => Some((k.to_string(), NumberType::Integer)),
                Type::Float(_) => Some((k.to_string(), NumberType::Float)),
                _ => None,
            }
        });

        gen_aggregate_filter(context, props, |(key, typ)| (key, typ), self.name(context))
    }

    fn name(&self, context: &TypeGenContext) -> String {
        let model = context
            .registry
            .models
            .get(&self.model_id)
            .unwrap()
            .name
            .clone();
        format!("_{model}_SumFilter")
    }
}

fn get_props<P, F: Fn(&Store, &str, TypeId) -> Option<P>>(model_id: TypeId, filter: F) -> Vec<P> {
    with_store(|s| {
        model_id
            .as_struct(s)
            .unwrap()
            .data
            .props
            .iter()
            .filter_map(|(k, type_id)| filter(s, k, type_id.into()))
            .collect::<Vec<_>>()
    })
}

fn gen_aggregate_filter<P, F: Fn(P) -> (String, NumberType)>(
    context: &mut TypeGenContext,
    props: Vec<P>,
    map: F,
    name: String,
) -> Result<TypeId> {
    let mut builder = t::struct_();
    for prop in props.into_iter() {
        let (prop_name, number_type) = map(prop);
        builder.prop(
            prop_name,
            context.generate(&CompleteFilter(NumberFilter::new(number_type, false)))?,
        );
    }

    builder.named(name).build()
}

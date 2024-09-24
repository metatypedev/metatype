// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::context::PrismaContext;
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::{TypeDef, TypeId};

use super::TypeGen;

pub(super) struct CompleteFilter<T: TypeGen>(pub T);

impl<T: TypeGen> TypeGen for CompleteFilter<T> {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let inner = context.generate(&self.0)?;
        // TODO and, or ???
        t::optionalx(t::unionx![inner, t::struct_().prop("not", inner)])?
            .named(self.name())
            .build()
    }

    fn name(&self) -> String {
        format!("{}_ex", self.0.name())
    }
}

pub(super) struct BooleanFilter;

impl TypeGen for BooleanFilter {
    fn generate(&self, _context: &PrismaContext) -> Result<TypeId> {
        t::unionx![
            t::boolean().build()?,
            t::struct_().propx("equals", t::boolean())?,
            t::struct_().propx("not", t::boolean())?,
        ]
        .named(self.name())
        .build()
    }

    fn name(&self) -> String {
        "_prisma_boolean_filter".to_string()
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
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        if self.with_aggregates {
            let base = context.generate(&NumberFilter::new(self.number_type, false))?;
            let float_base = context.generate(&NumberFilter::new(NumberType::Float, false))?;
            let int_base = context.generate(&NumberFilter::new(NumberType::Integer, false))?;
            t::unionx![
                base,
                t::struct_().prop("_count", int_base),
                t::struct_().prop("_sum", base),
                t::struct_().prop("_avg", float_base),
                t::struct_().prop("_min", base),
                t::struct_().prop("_max", base),
            ]
            .named(self.name())
            .build()
        } else {
            let type_id = match self.number_type {
                NumberType::Integer => t::integer().build()?,
                NumberType::Float => t::float().build()?,
            };
            let opt_type_id = t::optional(type_id).build()?;
            let list_type_id = t::list(type_id).build()?;
            t::eitherx![
                type_id,
                t::struct_().prop("equals", type_id),
                t::struct_().prop("not", type_id),
                t::struct_()
                    .prop("lt", opt_type_id)
                    .prop("gt", opt_type_id)
                    .prop("lte", opt_type_id)
                    .prop("gte", opt_type_id)
                    .min(1),
                t::struct_().prop("in", list_type_id),
                t::struct_().prop("notIn", list_type_id),
            ]
            .named(self.name())
            .build()
        }
    }

    fn name(&self) -> String {
        let suffix = if self.with_aggregates {
            "_with_aggregates"
        } else {
            ""
        };
        match self.number_type {
            NumberType::Integer => format!("_prisma_integer_filter{suffix}"),
            NumberType::Float => format!("_prisma_float_filter{suffix}"),
        }
    }
}

pub(super) struct StringFilter;

impl TypeGen for StringFilter {
    fn generate(&self, _context: &PrismaContext) -> Result<TypeId> {
        let type_id = t::string().build()?;
        let opt_type_id = t::optional(type_id).build()?;
        let list_type_id = t::list(type_id).build()?;

        t::unionx![
            type_id,
            t::struct_().prop("equals", type_id),
            t::struct_().prop("not", type_id),
            t::struct_().prop("in", list_type_id),
            t::struct_().prop("notIn", list_type_id),
            t::struct_().prop("contains", type_id).prop(
                "mode",
                t::optional(t::string().enum_(vec!["insensitive".to_string()]).build()?).build()?,
            ),
            // TODO optional feature -- previewFeatures = ["fullTextSearch"]
            t::struct_().prop("search", type_id),
            t::struct_()
                .prop("startsWith", opt_type_id)
                .prop("endsWith", opt_type_id)
                .min(1),
        ]
        .named(self.name())
        .build()
    }

    fn name(&self) -> String {
        "_prisma_string_filter".to_string()
    }
}

pub(super) struct ScalarListFilter(pub TypeId);

impl TypeGen for ScalarListFilter {
    fn generate(&self, _context: &PrismaContext) -> Result<TypeId> {
        if let Some(TypeDef::Optional(_)) = self.0.as_type_def()? {
            return Err("array of optional not supported".into());
        }

        // we can use union here instead of either since the structs do not have
        // overlapping fields.
        // Union validation is more efficient.
        t::unionx![
            t::struct_().prop("has", self.0),
            t::struct_().propx("hasEvery", t::list(self.0))?,
            t::struct_().propx("hasSome", t::list(self.0))?,
            t::struct_().propx("isEmpty", t::boolean())?,
            // TODO "isSet": mongo only
            t::struct_().propx("equals", t::list(self.0))?,
        ]
        .named(self.name())
        .build()
    }

    fn name(&self) -> String {
        // TODO unnamed??
        let list_item_name = self
            .0
            .name()
            .ok()
            .flatten()
            .unwrap_or_else(|| format!("unnamed_list_item{}", self.0 .0));
        format!("_prisma_list_filter{list_item_name}")
    }
}

pub struct WithAggregateFilters {
    model_id: TypeId,
    type_id: TypeId,
}

impl TypeGen for WithAggregateFilters {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
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

    fn name(&self) -> String {
        let name = self.model_id.name().unwrap().unwrap();
        format!("{name}_with_aggregates")
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
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let keys = self
            .model_id
            .as_struct()?
            .iter_props()
            .map(|(k, _)| k.to_string())
            .collect();

        gen_aggregate_filter(context, keys, |key| (key, NumberType::Integer), self.name())
    }

    fn name(&self) -> String {
        let model_name = self.model_id.name().unwrap().unwrap();
        format!("{model_name}_count_in")
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
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let keys = self
            .model_id
            .as_struct()
            .unwrap()
            .iter_props()
            .filter_map(|(k, type_id)| {
                let (_, type_def) = type_id.resolve_ref().unwrap();
                let non_opt_type = match type_def {
                    TypeDef::Optional(inner) => inner.item().as_type_def().unwrap().unwrap(),
                    _ => type_def,
                };
                match non_opt_type {
                    TypeDef::Integer(_) | TypeDef::Float(_) => Some(k.to_string()),
                    _ => None,
                }
            })
            .collect();

        gen_aggregate_filter(context, keys, |key| (key, NumberType::Float), self.name())
    }

    fn name(&self) -> String {
        let model_name = self.model_id.name().unwrap().unwrap();
        format!("{model_name}_avg_in")
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
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let props = self
            .model_id
            .as_struct()
            .unwrap()
            .iter_props()
            .filter_map(|(k, type_id)| {
                let (_, type_def) = type_id.resolve_ref().unwrap();
                let non_opt_type = match type_def {
                    TypeDef::Optional(inner) => inner.item().resolve_ref().unwrap().1,
                    _ => type_def,
                };
                match non_opt_type {
                    TypeDef::Integer(_) => Some((k.to_string(), NumberType::Integer)),
                    TypeDef::Float(_) => Some((k.to_string(), NumberType::Float)),
                    _ => None,
                }
            })
            .collect();

        gen_aggregate_filter(context, props, |(key, typ)| (key, typ), self.name())
    }

    fn name(&self) -> String {
        let model_name = self.model_id.name().unwrap().unwrap();
        format!("{model_name}_sum_in")
    }
}

fn gen_aggregate_filter<P, F: Fn(P) -> (String, NumberType)>(
    context: &PrismaContext,
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

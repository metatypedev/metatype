// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::t::{self, TypeBuilder};

pub fn results_op_results_ty(out: u32) -> Result<crate::types::TypeId> {
    let count = t::integer().build()?;

    let result = t::struct_()
        .prop("status", t::string().build()?)
        .prop("value", t::optional(out.into()).build()?)
        .build()?;

    let ongoing_runs = t::list(
        t::struct_()
            .prop("run_id", t::string().build()?)
            .prop("started_at", t::string().build()?)
            .build()?,
    )
    .build()?;

    let completed_runs = t::list(
        t::struct_()
            .prop("run_id", t::string().build()?)
            .prop("started_at", t::string().build()?)
            .prop("ended_at", t::string().build()?)
            .prop("result", result)
            .build()?,
    )
    .build()?;

    t::struct_()
        .prop(
            "ongoing",
            t::struct_()
                .prop("count", count)
                .prop("runs", ongoing_runs)
                .build()?,
        )
        .prop(
            "completed",
            t::struct_()
                .prop("count", count)
                .prop("runs", completed_runs)
                .build()?,
        )
        .build()
}

/// Term `{ op: value } | { special: { op: value } }`
/// * op: "eq", "lt", "contains", ..
/// * special: "started_at", "status", ..
fn filter_term_variants() -> Result<Vec<crate::types::TypeId>> {
    // FIXME: a generic json would have been helpful here vs json string
    // let any = t::eitherx!(t::integer(), t::string(), t::boolean(), ...).build_named("AnyValue")?;
    let value_to_comp_against = t::json_str()?;
    let ops = ["eq", "lt", "lte", "gt", "gte", "in", "contains"]
        .into_iter()
        .map(|op| t::struct_().prop(op, value_to_comp_against).build())
        .collect::<Result<Vec<_>>>()?;

    let op_value = t::either(ops.clone().into_iter()).build()?;
    let special = ["started_at", "ended_at", "status"]
        .into_iter()
        .map(|sp| t::struct_().prop(sp, op_value).build())
        .collect::<Result<Vec<_>>>()?;

    let mut variants = vec![];
    variants.extend(ops.iter());
    variants.extend(special.iter());

    Ok(variants)
}

/// Expr `{ op: [...] }`
/// * op: "and" or "or"
/// * ...: may contain itself, or a term
pub fn filter_expr_ty() -> Result<crate::types::TypeId> {
    let mut and = t::struct_();
    let mut or = t::struct_();

    let op_term_variants = filter_term_variants()?;

    let mut expr = t::eitherx!(and, or);
    expr.data
        .variants
        .extend(op_term_variants.into_iter().map(|ty| {
            let id: u32 = ty.into();
            id
        }));

    let expr_id = expr.build()?;

    and.prop("and", t::listx(expr_id).build()?);
    or.prop("or", t::listx(expr_id).build()?);

    /*
         query {
      search(filter:{
          and: [
            { started_at: { eq: "a" } },
            { status: { contains: "STO" } },
            { in: "abc" }
            # { or: []} # FIXME: broken ref
          ]
      }) {
        started_at
        ended_at
        status
        value
      }
    }

    */
    t::struct_()
        .prop("filter", t::eitherx!(expr_id, and, or).build()?)
        .build()
}

pub fn search_results_ty() -> Result<crate::types::TypeId> {
    t::list(
        t::struct_()
            .prop("run_id", t::string().build()?)
            .prop("started_at", t::string().build()?)
            .prop("ended_at", t::string().build()?)
            .prop("status", t::string().build()?)
            .prop("value", t::json_str()?)
            .build()?,
    )
    .build()
}

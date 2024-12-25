// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::runtimes::prisma::context::PrismaContext;
use crate::t::{self, TypeBuilder};
use crate::{errors::Result, types::TypeId};

use super::{where_::Where, TypeGen};

pub struct QueryWhereExpr {
    model_id: TypeId,
    unique: bool,
}

impl QueryWhereExpr {
    pub fn new(model_id: TypeId) -> Self {
        Self {
            model_id,
            unique: false,
        }
    }

    pub fn unique(mut self) -> Self {
        self.unique = true;
        self
    }
}

// TODO require at least one unique field for unique queries
// Currently, this is not supported by `t.struct()`
//
// https://www.prisma.io/docs/orm/reference/prisma-client-reference#filter-on-non-unique-fields-with-userwhereuniqueinput
//
// ```
// if model.id_fields.contains(k) || prop.unique {
//   // ...
// }
// ```

impl TypeGen for QueryWhereExpr {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let where_type = context.generate(&Where::new(self.model_id))?;

        let props = where_type.as_struct().unwrap().data.props.to_vec();

        let name = self.name(context)?;
        let self_ref = t::ref_(&name, Default::default()).build()?;
        let and = t::optionalx(t::list(self_ref))?.build()?;

        let mut builder = t::struct_();
        for (k, ty) in props.into_iter() {
            builder.prop(k.clone(), ty.into());
        }
        builder.prop("AND", and);
        builder.prop("OR", and);
        builder.propx("NOT", t::optional(self_ref))?;

        builder.build_named(name)
    }

    fn name(&self, _context: &PrismaContext) -> Result<String> {
        let unique = if self.unique { "_unique" } else { "" };
        Ok(format!(
            "{}_query_where{unique}_input",
            self.model_id.name().unwrap().unwrap()
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::*;
    #[test]
    fn test_query_where_expr() -> Result<()> {
        setup(None)?;

        let mut ctx = PrismaContext::default();

        let (user, post) = models::simple_relationship()?;

        ctx.manage(user)?;
        let user_where_expr = ctx.generate(&QueryWhereExpr::new(user))?;
        insta::assert_snapshot!("User/QueryWhereExpr", tree::print(user_where_expr));

        let post_where_expr = ctx.generate(&QueryWhereExpr::new(post))?;
        insta::assert_snapshot!("Post/QueryWhereExpr", tree::print(post_where_expr));

        Ok(())
    }
}

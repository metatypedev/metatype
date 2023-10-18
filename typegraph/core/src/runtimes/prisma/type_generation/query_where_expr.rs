// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::runtimes::prisma::context::PrismaContext;
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::{errors::Result, types::TypeId};

use super::{where_::Where, TypeGen};

pub struct QueryWhereExpr {
    model_id: TypeId,
}

impl QueryWhereExpr {
    pub fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for QueryWhereExpr {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let where_type = context.generate(&Where::new(self.model_id))?;

        let props = where_type.as_struct().unwrap().data.props.to_vec();

        let name = self.name();
        let self_ref = t::proxy(&name).build()?;
        let and = t::optionalx(t::array(self_ref))?.build()?;

        let mut builder = t::struct_();
        builder.named(name);
        for (k, ty) in props.into_iter() {
            builder.prop(k.clone(), ty.into());
        }
        builder.prop("AND", and);
        builder.prop("OR", and);
        builder.propx("NOT", t::optional(self_ref))?;

        builder.build()
    }

    fn name(&self) -> String {
        format!(
            "Query{}WhereInput",
            self.model_id.type_name().unwrap().unwrap()
        )
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

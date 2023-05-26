// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::core::{FuncConstraints, IntegerConstraints, StructConstraints, Tpe};
use crate::{
    typegraph::{ActiveTypegraph, Typegraph},
    types::T,
};
use common::typegraph::types::{
    FunctionTypeData, IntegerTypeData, ObjectTypeData, TypeNode, TypeNodeBase,
};
use std::collections::HashMap;

pub(crate) fn serialize_typegraph(
    tg: &Typegraph,
    tg_meta: ActiveTypegraph,
    root: Tpe,
) -> Result<String, String> {
    let serializable_tg = Converter {
        m: Default::default(),
        types: Vec::new(),
    }
    .convert(tg, tg_meta, root)?;
    serde_json::to_string(&serializable_tg).map_err(|e| e.to_string())
}

// mapping from the id in the stored typegraph to the id in the target serializable typegraph
#[derive(Default)]
struct IdMapping {
    types: HashMap<u32, u32>,
}

struct Converter {
    m: IdMapping,
    types: Vec<Option<TypeNode>>,
}

impl Converter {
    fn convert(
        mut self,
        tg: &Typegraph,
        _tg_meta: ActiveTypegraph,
        root: Tpe,
    ) -> Result<common::typegraph::Typegraph, String> {
        self.register_type(tg, root.id);

        let mut types = Vec::new();
        types.reserve(self.types.len());

        for typ in self.types.into_iter() {
            types.push(typ.ok_or_else(|| "Unexpected: type id was not converted".to_string())?);
        }

        use common::typegraph::{Cors, TypeMeta};

        let version = "0.0.2".to_string();

        Ok(common::typegraph::Typegraph {
            id: format!("https://metatype.dev/specs/{version}.json"),
            path: None,
            types,
            materializers: Vec::new(),
            runtimes: Vec::new(),
            policies: Vec::new(),
            deps: Default::default(),
            meta: TypeMeta {
                auths: Default::default(),
                cors: Cors {
                    allow_credentials: false,
                    allow_headers: Vec::new(),
                    expose_headers: Vec::new(),
                    allow_methods: Vec::new(),
                    allow_origin: Vec::new(),
                    max_age_sec: None,
                },
                rate: Default::default(),
                secrets: Vec::new(),
                version,
            },
        })
    }

    fn register_type(&mut self, tg: &Typegraph, id: u32) -> u32 {
        let tpe = tg.get_type(id);
        match tpe {
            T::Struct(data) => self.register_struct(tg, id, &data),
            T::Integer(data) => self.register_integer(tg, id, &data),
            T::Func(data) => self.register_func(tg, id, &data),
        }
    }

    fn register_struct(&mut self, tg: &Typegraph, id: u32, data: &StructConstraints) -> u32 {
        self.tpe(id, |c| TypeNode::Object {
            base: gen_base(format!("object_{id}")),
            data: ObjectTypeData {
                properties: data
                    .props
                    .iter()
                    .map(|(name, id)| (name.clone(), c.register_type(tg, *id)))
                    .collect(),
                required: Vec::new(),
            },
        })
    }

    fn register_integer(&mut self, _tg: &Typegraph, id: u32, data: &IntegerConstraints) -> u32 {
        self.tpe(id, |_| TypeNode::Integer {
            base: gen_base(format!("integer_{id}")),
            data: IntegerTypeData {
                minimum: data.min,
                maximum: data.max,
                exclusive_minimum: None,
                exclusive_maximum: None,
                multiple_of: None,
            },
        })
    }

    fn register_func(&mut self, tg: &Typegraph, id: u32, data: &FuncConstraints) -> u32 {
        self.tpe(id, |c| TypeNode::Function {
            base: gen_base(format!("func_{id}")),
            data: FunctionTypeData {
                input: c.register_type(tg, data.inp),
                output: c.register_type(tg, data.out),
                materializer: 0,
                rate_calls: false,
                rate_weight: None,
            },
        })
    }

    fn tpe(&mut self, id: u32, gen: impl FnOnce(&mut Self) -> TypeNode) -> u32 {
        let idx = self.types.len();
        self.m.types.insert(id, idx as u32);
        self.types.push(None);
        self.types[idx] = Some(gen(self));
        idx as u32
    }
}

fn gen_base(name: String) -> TypeNodeBase {
    TypeNodeBase {
        config: Default::default(),
        description: None,
        enumeration: None,
        injection: None,
        policies: Vec::new(),
        runtime: 0,
        title: name,
    }
}

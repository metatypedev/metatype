// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{
    collections::{BTreeMap, HashMap},
    hash::{DefaultHasher, Hash as _, Hasher as _},
    sync::Arc,
};
use tg_schema::{
    runtimes::{prisma::Property, KnownRuntime, TGRuntime},
    TypeNode, Typegraph,
};

use crate::TypeIdx;

#[derive(Debug)]
pub struct DedupEngine {
    tg: Arc<Typegraph>,
    components: HashMap<TypeIdx, Vec<TypeIdx>>,
    component_roots: Vec<TypeIdx>,
    hashes: Vec<Option<u64>>,
    buckets: HashMap<u64, Vec<TypeIdx>>,
}

impl From<crate::Kosaraju> for DedupEngine {
    fn from(k: crate::Kosaraju) -> Self {
        let mut hashes = Vec::new();
        hashes.resize(k.one.tg.types.len(), None);
        let component_roots: Vec<_> = k.component_roots.iter().map(|idx| idx.unwrap()).collect();
        Self {
            tg: k.one.tg.clone(),
            components: k.components,
            component_roots,
            hashes,
            buckets: HashMap::new(),
        }
    }
}

impl DedupEngine {
    fn register_hash(&mut self, idx: TypeIdx, hash: u64) -> u64 {
        let prev = self.hashes[idx.size()].replace(hash);
        assert!(prev.is_none());
        self.buckets
            .entry(hash)
            .and_modify(|b| b.push(idx))
            .or_insert_with(|| vec![idx]);
        hash
    }

    fn hash_type(&mut self, idx: TypeIdx) -> u64 {
        let i = idx.size();
        if let Some(h) = self.hashes[i] {
            return h;
        }

        let root_idx = self.component_roots[i];
        let same_component = self.components.get(&root_idx).unwrap().len();
        if same_component > 1 {
            let mut hasher = DefaultHasher::new();
            "idx".hash(&mut hasher);
            idx.hash(&mut hasher);
            let res = hasher.finish();
            return self.register_hash(idx, res);
        }

        let tg = self.tg.clone();
        let type_node = &tg.types[idx.size()];

        use TypeNode as N;
        let mut hasher = DefaultHasher::new();
        match &type_node {
            N::Boolean { .. } => {
                "boolean".hash(&mut hasher);
            }
            N::Integer { data, base } => {
                "integer".hash(&mut hasher);
                data.hash(&mut hasher);
                let mut enumeration = base.enumeration.clone();
                if let Some(e) = enumeration.as_mut() {
                    e.sort()
                }
                enumeration.hash(&mut hasher);
            }
            N::Float { data, .. } => {
                "float".hash(&mut hasher);
                data.hash(&mut hasher);
            }
            N::String { data, base } => {
                "string".hash(&mut hasher);
                data.hash(&mut hasher);
                let mut enumeration = base.enumeration.clone();
                if let Some(e) = enumeration.as_mut() {
                    e.sort();
                }
                enumeration.hash(&mut hasher);
            }
            N::File { data, .. } => {
                "file".hash(&mut hasher);
                let mut data = data.clone();
                if let Some(m) = data.mime_types.as_mut() {
                    m.sort();
                }
                data.hash(&mut hasher);
            }

            N::Optional { data, .. } => {
                "optional".hash(&mut hasher);
                data.default_value.hash(&mut hasher);
                self.hash_type(data.item.into()).hash(&mut hasher);
            }

            N::List { data, .. } => {
                "list".hash(&mut hasher);
                data.max_items.hash(&mut hasher);
                data.min_items.hash(&mut hasher);
                data.unique_items.hash(&mut hasher);
                self.hash_type(data.items.into()).hash(&mut hasher);
            }

            N::Object { data, .. } => {
                "object".hash(&mut hasher);
                data.id.hash(&mut hasher);
                let mut required = data.required.clone();
                required.sort();
                let policies: BTreeMap<_, _> = data.policies.iter().collect(); // TODO
                policies.hash(&mut hasher);
                data.additional_props.hash(&mut hasher);
                for (k, ty) in &data.properties {
                    k.hash(&mut hasher);
                    self.hash_type(ty.into()).hash(&mut hasher);
                }
            }

            N::Union { data, .. } => {
                "union".hash(&mut hasher);
                let mut variants: Vec<_> = data
                    .any_of
                    .iter()
                    .map(|ty| self.hash_type((*ty).into()))
                    .collect();
                variants.sort();
                variants.hash(&mut hasher);
            }

            N::Either { data, .. } => {
                "either".hash(&mut hasher);
                let mut variants: Vec<_> = data
                    .one_of
                    .iter()
                    .map(|ty| self.hash_type((*ty).into()))
                    .collect();
                variants.sort();
                variants.hash(&mut hasher);
            }

            N::Function { .. } => {
                "function".hash(&mut hasher);
                // TODO do we need to deduplication functions??
                idx.hash(&mut hasher);
            }

            N::Any { .. } => unreachable!(),
        }

        let res = hasher.finish();
        self.register_hash(idx, res)
    }

    pub fn hash_types(&mut self) {
        for idx in 0..self.tg.types.len() {
            let idx = TypeIdx(idx as u32);
            self.hash_type(idx);
        }
    }

    pub fn get_converted_typegraph(&self) -> Typegraph {
        let map = self.generate_conversion_map();

        let types = map
            .rev
            .iter()
            .map(|hash| {
                let bucket = self.buckets.get(hash).unwrap();
                let sample_idx = bucket[0];
                // FIXME we have multiple names for the type, but only one is used
                // let names: Vec<_> = bucket.iter().map(|idx| {
                //     let type_node = &self.tg.types[idx.size()];
                //     type_node.base().title
                // }).collect();
                let type_node = &self.tg.types[sample_idx.size()];
                map.convert_type(type_node)
            })
            .collect();

        let mut runtimes = self.tg.runtimes.clone();
        for rt in &mut runtimes {
            if let TGRuntime::Known(KnownRuntime::Prisma(d)) = rt {
                for m in &mut d.models {
                    map.update(&mut m.type_idx);

                    for prop in &mut m.props {
                        match prop {
                            Property::Scalar(scalar_prop) => {
                                map.update(&mut scalar_prop.type_idx);
                            }
                            Property::Relationship(rel_prop) => {
                                map.update(&mut rel_prop.type_idx);
                            }
                        }
                    }
                }

                for rel in &mut d.relationships {
                    map.update(&mut rel.left.type_idx);
                    map.update(&mut rel.right.type_idx);
                }
            }
        }

        let mut auths = self.tg.meta.auths.clone();
        for auth in &mut auths {
            auth.auth_data
                .entry("profiler".to_string())
                .and_modify(|v| {
                    let mut idx: u32 = serde_json::from_value(v.clone()).unwrap();
                    map.update(&mut idx);
                    *v = serde_json::to_value(idx).unwrap();
                });
        }

        let mut namespaces = self.tg.meta.namespaces.clone();
        for ns in &mut namespaces {
            map.update(ns);
        }

        let mut meta = self.tg.meta.clone();
        meta.auths = auths;
        meta.namespaces = namespaces;

        Typegraph {
            types,
            materializers: self.tg.materializers.clone(),
            runtimes,
            policies: self.tg.policies.clone(),
            meta,
            path: self.tg.path.clone(),
            deps: self.tg.deps.clone(),
        }
    }

    pub fn generate_conversion_map(&self) -> ConversionMap {
        let mut rev = Vec::new();
        let mut hash_to_idx = HashMap::new();

        let direct: Vec<_> = self
            .hashes
            .iter()
            .map(|h| {
                let hash = h.unwrap();
                *hash_to_idx.entry(hash).or_insert_with(|| {
                    let idx = TypeIdx(rev.len() as u32);
                    rev.push(hash);
                    idx
                })
            })
            .collect();

        ConversionMap { direct, rev }
    }
}

pub struct ConversionMap {
    direct: Vec<TypeIdx>, // old index -> new index
    rev: Vec<u64>,        // new index -> hash
}

impl ConversionMap {
    fn convert_type(&self, ty: &TypeNode) -> TypeNode {
        let mut type_node = ty.clone();
        use TypeNode as N;
        match &mut type_node {
            N::Boolean { .. }
            | N::Integer { .. }
            | N::Float { .. }
            | N::String { .. }
            | N::File { .. } => (),

            N::Optional { data, .. } => {
                self.update(&mut data.item);
            }

            N::List { data, .. } => {
                self.update(&mut data.items);
            }

            N::Object { data, .. } => {
                for prop_ty in data.properties.values_mut() {
                    self.update(prop_ty);
                }
            }

            N::Union { data, .. } => {
                for ty in data.any_of.iter_mut() {
                    self.update(ty);
                }
            }

            N::Either { data, .. } => {
                for ty in data.one_of.iter_mut() {
                    self.update(ty);
                }
            }

            N::Function { data, .. } => {
                self.update(&mut data.input);
                self.update(&mut data.output);
                if let Some(pt) = data.parameter_transform.as_mut() {
                    self.update(&mut pt.resolver_input);
                }
            }

            N::Any { .. } => unreachable!(),
        }
        type_node
    }

    fn update(&self, idx: &mut u32) {
        *idx = self.direct[*idx as usize].0;
    }
}

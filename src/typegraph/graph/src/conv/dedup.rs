// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{injection::InjectionNode, interlude::*, Type, TypeNodeExt as _, Wrap};

use super::{key::TypeKeyEx, ConversionMap, MapItem, PathSegment, RelativePath, TypeKey};

// TODO rename to `DuplicationKey`
pub trait DupKey: std::hash::Hash + Eq + Clone {
    fn is_default(&self) -> bool;
}

pub trait DuplicationKeyGenerator: Clone {
    type Key: DupKey;

    fn gen_from_rpath(&self, rpath: &RelativePath) -> Self::Key;
    fn gen_from_type(&self, ty: &Type) -> Self::Key;

    fn apply_path_segment(&self, key: &Self::Key, path_seg: &PathSegment) -> Self::Key;

    fn find_type_in_rpath(
        &self,
        ty: &Type,
        rpath: &RelativePath,
        schema: &tg_schema::Typegraph,
    ) -> bool {
        use RelativePath as RP;
        match rpath {
            RP::Function(_) => false,
            RP::NsObject(_) => false,
            RP::Input(p) => {
                let owner = p.owner.upgrade().expect("no strong pointer for type");
                let input_type = match &schema.types[owner.base.key.0 as usize] {
                    tg_schema::TypeNode::Function { data, .. } => data.input,
                    _ => unreachable!("expected a function node"),
                };
                let xkey = TypeKeyEx(ty.idx(), self.gen_from_type(ty));
                let mut cursor = TypeKeyEx(
                    input_type,
                    self.gen_from_rpath(&RelativePath::input(Arc::downgrade(&owner), vec![])),
                );
                // let mut cursor = TypeKeyEx(input_type, DuplicationKey { injection });
                for seg in &p.path {
                    let next_dkey = self.apply_path_segment(&cursor.1, seg);
                    // FIXME why unwrap?
                    let idx = seg.apply_on_schema_node(&schema.types, cursor.0).unwrap();
                    let next = TypeKeyEx(idx, next_dkey);
                    if next == xkey {
                        return true;
                    }
                    cursor = next;
                }

                false
            }

            RP::Output(p) => {
                let owner = p.owner.upgrade().expect("no strong pointer for type");
                let out_ty = match &schema.types[owner.base.key.0 as usize] {
                    tg_schema::TypeNode::Function { data, .. } => data.output,
                    _ => unreachable!("expected a function node"),
                };

                let xkey = TypeKeyEx(ty.idx(), self.gen_from_type(ty));

                let mut cursor = TypeKeyEx(
                    out_ty,
                    self.gen_from_rpath(&RelativePath::output(Arc::downgrade(&owner), vec![])),
                );
                for seg in &p.path {
                    let next_dkey = self.apply_path_segment(&cursor.1, seg);
                    let idx = seg.apply_on_schema_node(&schema.types, cursor.0).unwrap();
                    let next = TypeKeyEx(idx, next_dkey);
                    if next == xkey {
                        return true;
                    }
                    cursor = next;
                }

                false
            }
        }
    }
}

#[derive(Default, Clone, Debug, PartialEq, Eq, Hash)]
pub struct DefaultDuplicationKey {
    pub injection: Option<Arc<InjectionNode>>,
}

#[derive(Clone, Debug)]
pub struct DefaultDuplicationKeyGenerator;

impl DuplicationKeyGenerator for DefaultDuplicationKeyGenerator {
    type Key = DefaultDuplicationKey;

    fn gen_from_rpath(&self, rpath: &RelativePath) -> Self::Key {
        Self::Key {
            injection: rpath.get_injection(),
        }
    }

    fn gen_from_type(&self, ty: &Type) -> Self::Key {
        Self::Key {
            injection: ty.injection(),
        }
    }

    fn apply_path_segment(&self, key: &Self::Key, path_seg: &PathSegment) -> Self::Key {
        let inj = key
            .injection
            .as_ref()
            .and_then(|inj| path_seg.apply_on_injection(inj));
        Self::Key { injection: inj }
    }
}
impl DupKey for DefaultDuplicationKey {
    fn is_default(&self) -> bool {
        self.injection
            .as_ref()
            .map(|inj| inj.is_empty())
            .unwrap_or(true)
    }
}

pub enum Deduplication {
    /// a previously registered type was found
    Reuse(Type),
    /// did not find a previously registered type matching the duplication key;
    /// need to register a new type
    Register(TypeKey),
}
impl Deduplication {
    fn reuse(ty: Type) -> Self {
        Self::Reuse(ty)
    }
    fn register(idx: u32, variant: u32) -> Self {
        Self::Register(TypeKey(idx, variant))
    }
}

impl<DKG: DuplicationKeyGenerator> ConversionMap<DKG> {
    pub fn deduplicate(&self, type_idx: u32, dkey: &DKG::Key) -> Result<Deduplication>
    where
        DKG: DuplicationKeyGenerator,
    {
        match self.direct.get(type_idx as usize) {
            Some(MapItem::Unset) => Ok(Deduplication::register(
                type_idx,
                match dkey.is_default() {
                    true => 0,
                    // Duplication key will always be empty for functions and namespaces;
                    // hence, this will always be valid.
                    false => 1,
                },
            )),
            Some(MapItem::Namespace(_, _)) => {
                bail!("unexpected duplicate namespace type: {:?}", type_idx)
            }
            Some(MapItem::Function(fn_ty)) => Ok(Deduplication::reuse(fn_ty.wrap())),
            Some(MapItem::Value(value_type)) => {
                if dkey.is_default() {
                    if let Some(item) = value_type.default.as_ref() {
                        Ok(Deduplication::reuse(item.ty.clone()))
                    } else {
                        Ok(Deduplication::register(type_idx, 0))
                    }
                } else {
                    let found = value_type.variants.get(dkey);
                    if let Some(variant) = found {
                        Ok(Deduplication::reuse(variant.ty.clone()))
                    } else {
                        Ok(Deduplication::register(
                            type_idx,
                            value_type.variants.len() as u32 + 1,
                        ))
                    }
                }
            }
            None => bail!("type index out of bounds: {:?}", type_idx),
        }
    }
}

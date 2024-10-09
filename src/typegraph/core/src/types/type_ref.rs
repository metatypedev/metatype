use std::hash::Hash as _;
use std::{collections::HashMap, rc::Rc};

use super::Type;
use crate::errors::Result;
use crate::global_store::Store;
use crate::typegraph::TypegraphContext;
use crate::types::{TypeDef, TypeDefExt as _, TypeId};
pub use as_id::{AsId, IdKind};
use common::typegraph::Injection;
pub use resolve_ref::ResolveRef;
use serde::{Deserialize, Serialize};
pub use with_injection::WithInjection;

mod as_id;
mod resolve_ref;
mod with_injection;

#[derive(Clone, Debug)]
pub enum RefTarget {
    Direct(TypeDef),
    Indirect(String),
}

type JsonValue = serde_json::Value;

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct RefAttrs {
    pub as_id: Option<IdKind>,
    pub injection: Option<Injection>,
    pub runtime: HashMap<String, HashMap<String, JsonValue>>,
}

thread_local! {
    static DEFAULT_ATTRS: Rc<RefAttrs> = Rc::new(RefAttrs::default());
}

// impl From<HashMap<String, String>> for RefAttrs {
//     fn from(attrs: HashMap<String, String>) -> Self {
//         if attrs.is_empty() {
//             RefAttrs::default()
//         } else {
//             Self(Some(Rc::new(attrs)))
//         }
//     }
// }

impl RefAttrs {
    pub fn default_rc() -> Rc<Self> {
        DEFAULT_ATTRS.with(|it| it.clone())
    }

    #[allow(clippy::wrong_self_convention)]
    pub fn as_id(mut self, id: IdKind) -> Self {
        self.as_id = Some(id);
        self
    }

    pub fn with_injection(mut self, injection: Injection) -> Self {
        self.injection = Some(injection);
        self
    }

    pub fn runtime(mut self, key: impl Into<String>, value: HashMap<String, JsonValue>) -> Self {
        self.runtime.insert(key.into(), value);
        self
    }

    pub fn merge(mut self, other: RefAttrs) -> Self {
        if let Some(id) = other.as_id {
            self.as_id = Some(id);
        }
        if let Some(injection) = other.injection {
            self.injection = Some(injection);
        }
        for (k, v) in other.runtime {
            let runtime_attrs = self.runtime.entry(k).or_default();
            for (k, v) in v {
                runtime_attrs.insert(k, v);
            }
        }
        self
    }

    pub fn with_target(self, target: Type) -> TypeRefBuilder {
        match target {
            Type::Def(type_def) => TypeRefBuilder {
                target: RefTarget::Direct(type_def),
                attributes: self,
            },
            Type::Ref(type_ref) => {
                let TypeRef {
                    id: _,
                    target,
                    attributes,
                } = type_ref;
                TypeRefBuilder {
                    target,
                    attributes: attributes
                        .map(|it| RefAttrs::clone(&it))
                        .unwrap_or_default()
                        .merge(self),
                }
            }
        }
    }

    pub fn direct(self, target: TypeDef) -> TypeRefBuilder {
        TypeRefBuilder {
            target: RefTarget::Direct(target),
            attributes: self,
        }
    }

    pub fn indirect(self, name: String) -> TypeRefBuilder {
        TypeRefBuilder {
            target: RefTarget::Indirect(name),
            attributes: self,
        }
    }

    pub fn wrap(self) -> Option<Rc<Self>> {
        Some(Rc::new(self))
    }
}

impl TypeRef {
    pub fn as_id(&self) -> Option<IdKind> {
        self.attributes.as_ref().and_then(|it| it.as_id)
    }

    pub fn runtime_attrs(&self, runtime_key: &str) -> Option<&HashMap<String, JsonValue>> {
        self.attributes
            .as_ref()
            .and_then(|it| it.runtime.get(runtime_key))
    }

    pub fn runtime_attr(&self, runtime_key: &str, key: &str) -> Option<&serde_json::Value> {
        self.runtime_attrs(runtime_key).and_then(|it| it.get(key))
    }
}

#[derive(Clone, Debug)]
pub struct TypeRef {
    pub id: TypeId,
    pub target: RefTarget,
    pub attributes: Option<Rc<RefAttrs>>,
}

pub struct TypeRefBuilder {
    target: RefTarget,
    attributes: RefAttrs,
}

impl TypeRefBuilder {
    pub fn with_id(self, id: TypeId) -> TypeRef {
        TypeRef {
            id,
            target: self.target,
            attributes: self.attributes.wrap(),
        }
    }
}

impl TypeRef {
    pub fn new(target: Type, attributes: RefAttrs) -> Result<TypeRef> {
        Store::register_type_ref(attributes.with_target(target))
    }

    pub fn direct(target: TypeDef, attributes: RefAttrs) -> Result<Self> {
        Store::register_type_ref(attributes.direct(target))
    }

    pub fn indirect(name: String, attributes: RefAttrs) -> Result<Self> {
        Store::register_type_ref(attributes.indirect(name))
    }

    pub fn repr(&self) -> String {
        let mut attrs = vec![];
        if let Some(as_id) = self.as_id() {
            attrs.push(format!("[as_id]: {:?}", as_id));
        }
        if let Some(injection) = self.get_injection() {
            attrs.push(format!("[injection]: {:?}", injection));
        }

        attrs.extend(
            self.attributes
                .iter()
                .flat_map(|a| a.runtime.iter())
                .map(|(k, v)| format!(", [rt/{}] => '{:?}'", k, v)),
        );
        let attrs = attrs.join("");
        match &self.target {
            RefTarget::Direct(type_def) => {
                format!("ref(#{}{attrs}) to {}", self.id.0, type_def.repr())
            }
            RefTarget::Indirect(name) => {
                format!("ref(#{} , target_name: '{}'{attrs})", self.id.0, name)
            }
        }
    }

    // pub fn attrs(&self) -> &RefAttrs {
    //     self.attributes.0.as_ref().unwrap()
    // }

    pub fn hash_type(
        &self,
        hasher: &mut crate::conversion::hash::Hasher,
        tg: &mut TypegraphContext,
        runtime_id: Option<u32>,
    ) -> Result<()> {
        "ref".hash(hasher);
        self.as_id().hash(hasher);
        self.get_injection().hash(hasher);
        let runtime_attrs = self
            .attributes
            .as_ref()
            .map(|it| serde_json::to_string(&it.runtime).unwrap());
        runtime_attrs.hash(hasher);
        match &self.target {
            RefTarget::Direct(target) => {
                target.hash_type(hasher, tg, runtime_id)?;
            }
            RefTarget::Indirect(ref name) => {
                "named".hash(hasher);
                name.hash(hasher);
                runtime_id.hash(hasher);
            }
        }
        Ok(())
    }
}


use crate::wit::core::TypeProxy;
pub(crate) use crate::wit::{
    core::{
        Core, MaterializerId, TypeArray, TypeBase, TypeFloat, TypeFunc, TypeId, TypeInteger,
        TypeOptional, TypeString, TypeStruct,
    },
    runtimes::{Effect, MaterializerDenoFunc, Runtimes},
};
pub(crate) use crate::Lib;
pub(crate) use crate::TypegraphInitParams;

impl TypeBase {
    pub fn named(name: impl Into<String>) -> Self {
        Self {
            name: Some(name.into()),
            ..Default::default()
        }

    }

    pub fn as_id(mut self) -> Self {
        self.as_id = true;
        self
    }
}

impl Default for TypeInteger {
    fn default() -> Self {
        Self {
            min: None,
            max: None,
            exclusive_minimum: None,
            exclusive_maximum: None,
            multiple_of: None,
            enumeration: None,
        }
    }
}

impl TypeInteger {
    pub fn min(mut self, min: i32) -> Self {
        self.min = Some(min);
        self
    }
    pub fn max(mut self, max: i32) -> Self {
        self.max = Some(max);
        self
    }
    pub fn x_min(mut self, x_min: i32) -> Self {
        self.exclusive_minimum = Some(x_min);
        self
    }
    pub fn x_max(mut self, x_max: i32) -> Self {
        self.exclusive_maximum = Some(x_max);
        self
    }
}

impl Default for TypeFloat {
    fn default() -> Self {
        Self {
            min: None,
            max: None,
            exclusive_minimum: None,
            exclusive_maximum: None,
            multiple_of: None,
            enumeration: None,
        }
    }
}

impl TypeFloat {
    pub fn min(mut self, min: f64) -> Self {
        self.min = Some(min);
        self
    }
    pub fn max(mut self, max: f64) -> Self {
        self.max = Some(max);
        self
    }
    pub fn x_min(mut self, x_min: f64) -> Self {
        self.exclusive_minimum = Some(x_min);
        self
    }
    pub fn x_max(mut self, x_max: f64) -> Self {
        self.exclusive_maximum = Some(x_max);
        self
    }
}

impl Default for TypeString {
    fn default() -> Self {
        Self {
            min: Default::default(),
            max: Default::default(),
            format: Default::default(),
            pattern: Default::default(),
            enumeration: Default::default(),
        }
    }
}

impl TypeString {
    pub fn min(mut self, min: u32) -> Self {
        self.min = Some(min);
        self
    }
    pub fn max(mut self, max: u32) -> Self {
        self.max = Some(max);
        self
    }
    pub fn format(mut self, format: String) -> Self {
        self.format = Some(format);
        self
    }
    pub fn pattern(mut self, pattern: String) -> Self {
        self.pattern = Some(pattern);
        self
    }
}

impl TypeArray {
    pub fn of(index: u32) -> Self {
        Self {
            of: index,
            min: None,
            max: None,
            unique_items: None,
        }
    }
}

impl TypeOptional {
    pub fn of(index: u32) -> Self {
        Self {
            of: index,
            default_item: None,
        }
    }
}

impl Default for TypeStruct {
    fn default() -> Self {
        Self { props: vec![] }
    }
}

impl TypeStruct {
    pub fn prop(mut self, key: impl Into<String>, type_id: TypeId) -> Self {
        self.props.push((key.into(), type_id));
        self
    }
}

impl TypeFunc {
    pub fn new(inp: TypeId, out: TypeId, mat: MaterializerId) -> Self {
        Self { inp, out, mat }
    }
}

impl TypeProxy {
    pub fn new(name: impl Into<String>) -> Self {
        Self { name: name.into(), extras: vec![] }
    }
}

impl MaterializerDenoFunc {
    pub fn with_code(code: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            secrets: vec![],
        }
    }

    // fn with_secrets(mut self, secrets: impl Into<Vec<String>>) -> Self {
    //     self.secrets = secrets.into();
    //     self
    // }
}

impl Default for Effect {
    fn default() -> Self {
        Self::None
    }
}

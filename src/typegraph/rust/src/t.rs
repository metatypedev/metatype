use crate::{
    error::Result,
    wasm::core::{
        ParameterTransform, TypeBase, TypeEither, TypeFloat, TypeFunc, TypeId, TypeInteger,
        TypeList, TypeOptional, TypeString, TypeStruct, TypeUnion,
    },
};

pub trait TypeBuilder: Sized {
    fn build(self) -> Result<TypeId>;

    fn optional(self) -> Result<OptionalBuilder> {
        optional(self)
    }
}

impl TypeBuilder for TypeId {
    fn build(self) -> Result<TypeId> {
        Ok(self)
    }
}

#[allow(clippy::derivable_impls)]
impl Default for TypeBase {
    fn default() -> Self {
        Self {
            name: None,
            runtime_config: None,
            as_id: false,
        }
    }
}

#[allow(clippy::derivable_impls)]
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

#[derive(Debug, Default)]
pub struct IntegerBuilder {
    data: TypeInteger,
    base: TypeBase,
}

impl IntegerBuilder {
    pub fn min(mut self, min: i32) -> Self {
        self.data.min = Some(min);
        self
    }

    pub fn max(mut self, max: i32) -> Self {
        self.data.max = Some(max);
        self
    }

    pub fn x_min(mut self, min: i32) -> Self {
        self.data.exclusive_minimum = Some(min);
        self
    }

    pub fn x_max(mut self, max: i32) -> Self {
        self.data.exclusive_maximum = Some(max);
        self
    }

    pub fn multiple(mut self, n: i32) -> Self {
        self.data.multiple_of = Some(n);
        self
    }

    pub fn enumerate(mut self, values: impl IntoIterator<Item = i32>) -> Self {
        self.data.enumeration = Some(values.into_iter().collect());
        self
    }
}

pub fn integer() -> IntegerBuilder {
    IntegerBuilder::default()
}

#[allow(clippy::derivable_impls)]
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

#[derive(Debug, Default)]
pub struct FloatBuilder {
    base: TypeBase,
    data: TypeFloat,
}

impl FloatBuilder {
    pub fn min(mut self, min: f64) -> Self {
        self.data.min = Some(min);
        self
    }

    pub fn max(mut self, max: f64) -> Self {
        self.data.max = Some(max);
        self
    }

    pub fn x_min(mut self, min: f64) -> Self {
        self.data.exclusive_minimum = Some(min);
        self
    }

    pub fn x_max(mut self, max: f64) -> Self {
        self.data.exclusive_maximum = Some(max);
        self
    }

    pub fn multiple(mut self, n: f64) -> Self {
        self.data.multiple_of = Some(n);
        self
    }

    pub fn enumerate(mut self, values: impl IntoIterator<Item = f64>) -> Self {
        self.data.enumeration = Some(values.into_iter().collect());
        self
    }
}

pub fn float() -> FloatBuilder {
    FloatBuilder::default()
}

#[allow(clippy::derivable_impls)]
impl Default for TypeString {
    fn default() -> Self {
        Self {
            min: None,
            max: None,
            format: None,
            pattern: None,
            enumeration: None,
        }
    }
}

#[derive(Debug, Default)]
pub struct StringBuilder {
    base: TypeBase,
    data: TypeString,
}

impl StringBuilder {
    pub fn min(mut self, min: u32) -> Self {
        self.data.min = Some(min);
        self
    }

    pub fn max(mut self, max: u32) -> Self {
        self.data.max = Some(max);
        self
    }

    pub fn format(&mut self, format: impl Into<String>) -> &mut Self {
        self.data.format = Some(format.into());
        self
    }

    pub fn enumerate(&mut self, values: impl IntoIterator<Item = String>) -> &mut Self {
        self.data.enumeration = Some(values.into_iter().collect());
        self
    }
}

pub fn string() -> StringBuilder {
    StringBuilder::default()
}

impl Default for TypeOptional {
    fn default() -> Self {
        Self {
            of: u32::MAX,
            default_item: None,
        }
    }
}

#[derive(Debug, Default)]
pub struct OptionalBuilder {
    base: TypeBase,
    data: TypeOptional,
}

pub fn optional(id: impl TypeBuilder) -> Result<OptionalBuilder> {
    Ok(OptionalBuilder {
        base: TypeBase::default(),
        data: TypeOptional {
            of: id.build()?,
            default_item: None,
        },
    })
}

impl Default for TypeList {
    fn default() -> Self {
        Self {
            of: u32::MAX,
            min: None,
            max: None,
            unique_items: None,
        }
    }
}

#[derive(Debug, Default)]
pub struct ListBuilder {
    base: TypeBase,
    data: TypeList,
}

impl ListBuilder {
    pub fn min(mut self, min: u32) -> Self {
        self.data.min = Some(min);
        self
    }

    pub fn max(mut self, max: u32) -> Self {
        self.data.max = Some(max);
        self
    }

    pub fn unique(mut self, value: bool) -> Self {
        self.data.unique_items = Some(value);
        self
    }
}

pub fn list(id: impl TypeBuilder) -> Result<ListBuilder> {
    Ok(ListBuilder {
        base: TypeBase::default(),
        data: TypeList {
            of: id.build()?,
            ..Default::default()
        },
    })
}

#[allow(clippy::derivable_impls)]
impl Default for TypeUnion {
    fn default() -> Self {
        Self {
            variants: Vec::default(),
        }
    }
}

#[derive(Debug, Default)]
pub struct UnionBuilder {
    base: TypeBase,
    data: TypeUnion,
}

impl UnionBuilder {
    pub fn add(mut self, id: impl TypeBuilder) -> Result<Self> {
        self.data.variants.push(id.build()?);
        Ok(self)
    }
}

pub fn union(variants: impl IntoIterator<Item = impl TypeBuilder>) -> Result<UnionBuilder> {
    Ok(UnionBuilder {
        data: TypeUnion {
            variants: variants
                .into_iter()
                .map(|id| id.build())
                .collect::<Result<_>>()?,
        },
        ..Default::default()
    })
}

#[allow(clippy::derivable_impls)]
impl Default for TypeEither {
    fn default() -> Self {
        Self {
            variants: Vec::default(),
        }
    }
}

#[derive(Debug, Default)]
pub struct EitherBuilder {
    base: TypeBase,
    data: TypeEither,
}

pub fn either(variants: impl IntoIterator<Item = impl TypeBuilder>) -> Result<EitherBuilder> {
    Ok(EitherBuilder {
        data: TypeEither {
            variants: variants
                .into_iter()
                .map(|id| id.build())
                .collect::<Result<_>>()?,
        },
        ..Default::default()
    })
}

#[allow(clippy::derivable_impls)]
impl Default for TypeStruct {
    fn default() -> Self {
        Self {
            props: Vec::new(),
            additional_props: false,
            min: None,
            max: None,
            enumeration: None,
        }
    }
}

#[derive(Debug, Default)]
pub struct StructBuilder {
    base: TypeBase,
    data: TypeStruct,
}

impl StructBuilder {
    pub fn prop(mut self, name: impl ToString, id: impl TypeBuilder) -> Result<Self> {
        self.data.props.push((name.to_string(), id.build()?));
        Ok(self)
    }

    pub fn props<S, T>(mut self, values: impl IntoIterator<Item = (S, T)>) -> Result<Self>
    where
        S: ToString,
        T: TypeBuilder,
    {
        self.data.props.extend(
            values
                .into_iter()
                .map(|(name, id)| id.build().map(|id| (name.to_string(), id)))
                .collect::<Result<Vec<_>>>()?,
        );
        Ok(self)
    }

    pub fn min(mut self, min: u32) -> Self {
        self.data.min = Some(min);
        self
    }

    pub fn max(mut self, max: u32) -> Self {
        self.data.max = Some(max);
        self
    }
}

pub fn r#struct() -> StructBuilder {
    StructBuilder::default()
}

impl Default for TypeFunc {
    fn default() -> Self {
        Self {
            inp: u32::MAX,
            out: u32::MAX,
            parameter_transform: None,
            mat: u32::MAX,
            rate_calls: false,
            rate_weight: None,
        }
    }
}

#[derive(Debug, Default)]
pub struct FuncBuilder {
    base: TypeBase,
    data: TypeFunc,
}

impl FuncBuilder {
    pub fn rate_call(mut self, value: bool) -> Self {
        self.data.rate_calls = value;
        self
    }

    pub fn rate_weight(mut self, value: u32) -> Self {
        self.data.rate_weight = Some(value);
        self
    }

    pub fn transform(mut self, transform: ParameterTransform) -> Self {
        self.data.parameter_transform = Some(transform);
        self
    }
}

pub fn func<T>(inp: T, out: T, mat: u32) -> Result<FuncBuilder>
where
    T: TypeBuilder,
{
    Ok(FuncBuilder {
        data: TypeFunc {
            inp: inp.build()?,
            out: out.build()?,
            mat,
            ..Default::default()
        },
        ..Default::default()
    })
}

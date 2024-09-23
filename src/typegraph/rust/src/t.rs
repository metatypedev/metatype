use crate::{
    error::Result,
    wasm::{
        self,
        core::{
            FuncParams, ParameterTransform, TypeBase, TypeEither, TypeFloat, TypeFunc, TypeId,
            TypeInteger, TypeList, TypeOptional, TypeString, TypeStruct, TypeUnion,
        },
    },
};

pub trait TypeBuilder: Sized {
    fn build(self) -> Result<TypeId>;

    fn optional(self) -> Result<OptionalBuilder> {
        optional(self)
    }
}

pub trait BaseBuilder: Sized {
    fn base_mut(&mut self) -> &mut TypeBase;

    fn named(mut self, name: String) -> Self {
        self.base_mut().name = Some(name);
        self
    }

    fn as_id(mut self) -> Self {
        self.base_mut().as_id = true;
        self
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

impl TypeBuilder for IntegerBuilder {
    fn build(self) -> Result<TypeId> {
        wasm::with_core(|c, s| c.call_integerb(s, &self.data, &self.base))
    }
}

impl BaseBuilder for IntegerBuilder {
    fn base_mut(&mut self) -> &mut TypeBase {
        &mut self.base
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

impl TypeBuilder for FloatBuilder {
    fn build(self) -> Result<TypeId> {
        wasm::with_core(|c, s| c.call_floatb(s, &self.data, &self.base))
    }
}

impl BaseBuilder for FloatBuilder {
    fn base_mut(&mut self) -> &mut TypeBase {
        &mut self.base
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

    pub fn format(mut self, format: impl Into<String>) -> Self {
        self.data.format = Some(format.into());
        self
    }

    pub fn enumerate(mut self, values: impl IntoIterator<Item = impl ToString>) -> Self {
        self.data.enumeration = Some(values.into_iter().map(|v| v.to_string()).collect());
        self
    }
}

impl TypeBuilder for StringBuilder {
    fn build(self) -> Result<TypeId> {
        wasm::with_core(|c, s| c.call_stringb(s, &self.data, &self.base))
    }
}

impl BaseBuilder for StringBuilder {
    fn base_mut(&mut self) -> &mut TypeBase {
        &mut self.base
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

impl TypeBuilder for OptionalBuilder {
    fn build(self) -> Result<TypeId> {
        wasm::with_core(|c, s| c.call_optionalb(s, &self.data, &self.base))
    }
}

impl BaseBuilder for OptionalBuilder {
    fn base_mut(&mut self) -> &mut TypeBase {
        &mut self.base
    }
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

impl TypeBuilder for ListBuilder {
    fn build(self) -> Result<TypeId> {
        wasm::with_core(|c, s| c.call_listb(s, self.data, &self.base))
    }
}

impl BaseBuilder for ListBuilder {
    fn base_mut(&mut self) -> &mut TypeBase {
        &mut self.base
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

impl TypeBuilder for UnionBuilder {
    fn build(self) -> Result<TypeId> {
        wasm::with_core(|c, s| c.call_unionb(s, &self.data, &self.base))
    }
}

impl BaseBuilder for UnionBuilder {
    fn base_mut(&mut self) -> &mut TypeBase {
        &mut self.base
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

impl TypeBuilder for EitherBuilder {
    fn build(self) -> Result<TypeId> {
        wasm::with_core(|c, s| c.call_eitherb(s, &self.data, &self.base))
    }
}

impl BaseBuilder for EitherBuilder {
    fn base_mut(&mut self) -> &mut TypeBase {
        &mut self.base
    }
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

impl TypeBuilder for StructBuilder {
    fn build(self) -> Result<TypeId> {
        wasm::with_core(|c, s| c.call_structb(s, &self.data, &self.base))
    }
}

impl BaseBuilder for StructBuilder {
    fn base_mut(&mut self) -> &mut TypeBase {
        &mut self.base
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

impl TypeBuilder for FuncBuilder {
    fn build(self) -> Result<TypeId> {
        wasm::with_core(|c, s| c.call_funcb(s, &self.data))
    }
}

pub fn func<I, O>(inp: I, out: O, mat: u32) -> Result<FuncBuilder>
where
    I: TypeBuilder,
    O: TypeBuilder,
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

impl TypeBuilder for FuncParams {
    fn build(self) -> Result<TypeId> {
        func(self.inp, self.out, self.mat)?.build()
    }
}

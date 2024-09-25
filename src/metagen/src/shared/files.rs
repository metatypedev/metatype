use crate::interlude::*;
use common::typegraph::visitor::{
    CurrentNode, DefaultLayer, Edge, PathSegment, TypeVisitor, TypeVisitorContext, VisitResult,
    VisitorResult,
};

#[derive(Debug)]
pub enum ObjectPathSegment {
    Optional,
    List,
    Field(String),
}

/// Access path into a nested value in an object, more or less like JsonPath
#[derive(Debug)]
pub struct ObjectPath(pub Vec<ObjectPathSegment>);

impl std::fmt::Display for ObjectPathSegment {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ObjectPathSegment::Optional => write!(f, "?"),
            ObjectPathSegment::List => write!(f, "[]"),
            ObjectPathSegment::Field(key) => write!(f, ".{}", key),
        }
    }
}

impl<'a> TryFrom<&'a PathSegment<'a>> for ObjectPathSegment {
    type Error = anyhow::Error;

    fn try_from(seg: &'a PathSegment<'a>) -> anyhow::Result<Self> {
        match seg.edge {
            Edge::ObjectProp(key) => Ok(Self::Field(key.to_string())),
            Edge::ArrayItem => Ok(Self::List),
            Edge::OptionalItem => Ok(Self::Optional),
            Edge::FunctionInput => bail!("unexpected path segment for file input"),
            Edge::FunctionOutput => bail!("unexpected path segment for file input"),
            Edge::UnionVariant(_) | Edge::EitherVariant(_) => {
                bail!("file input is not supported for polymorphic types (union/either)")
            }
        }
    }
}

impl<'a> TryFrom<&'a [PathSegment<'a>]> for ObjectPath {
    type Error = anyhow::Error;

    fn try_from(segs: &'a [PathSegment<'a>]) -> anyhow::Result<Self> {
        let mut path = Vec::with_capacity(segs.len());
        for seg in segs {
            path.push(ObjectPathSegment::try_from(seg)?);
        }
        Ok(Self(path))
    }
}

#[derive(Debug, Default)]
struct FileCollector {
    files: Vec<ObjectPath>,
}

struct Output(anyhow::Result<Vec<ObjectPath>>);

#[derive(Debug, Clone)]
struct FileCollectorContext<'a> {
    typegraph: &'a Typegraph,
}

impl<'a> TypeVisitorContext for FileCollectorContext<'a> {
    fn get_typegraph(&self) -> &Typegraph {
        self.typegraph
    }
}

impl VisitorResult for Output {
    fn from_error(_path: String, _msg: String) -> Self {
        Output(Err(anyhow::anyhow!("error"))) // TODO format error
    }
}

impl<'a> TypeVisitor<'a> for FileCollector {
    type Return = Output;
    type Context = FileCollectorContext<'a>;

    fn visit(
        &mut self,
        current_node: CurrentNode<'_>,
        _cx: &Self::Context,
    ) -> VisitResult<Self::Return> {
        match current_node.type_node {
            TypeNode::File { .. } => {
                let path = match current_node.path.try_into() {
                    Ok(path) => path,
                    Err(e) => return VisitResult::Return(Output(Err(e))),
                };
                self.files.push(path);
                VisitResult::Continue(false)
            }
            _ => VisitResult::Continue(true),
        }
    }

    fn take_result(&mut self) -> Option<Self::Return> {
        println!("> taking result: {:?}", self.files);
        Some(Output(Ok(std::mem::take(&mut self.files))))
    }
}

#[derive(Debug, Default)]
struct GlobalFileCollector {
    files: HashMap<u32, Vec<ObjectPath>>,
}

struct GlobalOutput(anyhow::Result<HashMap<u32, Vec<ObjectPath>>>);

impl VisitorResult for GlobalOutput {
    fn from_error(_path: String, _msg: String) -> Self {
        GlobalOutput(Err(anyhow::anyhow!("error"))) // TODO format error
    }
}

impl<'a> TypeVisitor<'a> for GlobalFileCollector {
    type Return = GlobalOutput;
    type Context = FileCollectorContext<'a>;

    fn visit(
        &mut self,
        current_node: CurrentNode<'_>,
        cx: &Self::Context,
    ) -> VisitResult<Self::Return> {
        match current_node.type_node {
            TypeNode::Function { data, base: _ } => {
                let files = cx
                    .get_typegraph()
                    .traverse_types(FileCollector::default(), cx, DefaultLayer, data.input)
                    .map(|x| x.0)
                    .transpose()
                    .map(|x| x.unwrap_or_default());
                match files {
                    Ok(files) => {
                        self.files.insert(current_node.type_idx, files);
                        VisitResult::Continue(false)
                    }
                    Err(e) => VisitResult::Return(GlobalOutput(Err(e))),
                }
            }
            _ => VisitResult::Continue(true),
        }
    }

    fn visit_input_type(
        &mut self,
        _current_node: CurrentNode<'_>,
        _cx: &Self::Context,
    ) -> VisitResult<Self::Return> {
        VisitResult::Continue(false)
    }

    fn take_result(&mut self) -> Option<Self::Return> {
        Some(GlobalOutput(Ok(std::mem::take(&mut self.files))))
    }
}

pub fn get_path_to_files(tg: &Typegraph, root: u32) -> Result<HashMap<u32, Vec<ObjectPath>>> {
    let cx = FileCollectorContext { typegraph: tg };
    let collector = GlobalFileCollector::default();
    let result = tg
        .traverse_types(collector, &cx, DefaultLayer, root)
        .map(|x| x.0)
        .transpose()?;
    Ok(result.unwrap_or_default())
}

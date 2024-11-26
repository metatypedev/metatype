// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;

#[derive(Debug, Clone)]
pub struct TypePath(pub &'static [&'static str]);

// fn path_segment_as_prop(segment: &str) -> Option<&str> {
//     segment.strip_prefix('.')
// }
//
#[derive(Debug, Clone)]
pub struct PathToInputFiles(pub &'static [&'static [&'static str]]);

#[derive(Debug)]
pub enum ValuePathSegment {
    Optional,
    Index(usize),
    Prop(&'static str),
}

#[derive(Default, Debug)]
pub struct ValuePath(Vec<ValuePathSegment>);

lazy_static::lazy_static! {
    static ref LATEST_FILE_ID: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
    static ref FILE_STORE: std::sync::Mutex<HashMap<FileId, File>> = Default::default();
}

enum FileData {
    Path(std::path::PathBuf),
    Bytes(Vec<u8>),
    Reader(Box<dyn std::io::Read + Send + 'static>),
    Async(reqwest::Body),
}

pub struct File {
    data: FileData,
    file_name: Option<String>,
    mime_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Hash, PartialEq, Eq, Clone, Copy)]
pub struct FileId(usize);

impl TryFrom<File> for FileId {
    type Error = BoxErr;

    fn try_from(file: File) -> Result<Self, Self::Error> {
        let file_id = LATEST_FILE_ID.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        let mut guard = FILE_STORE.lock().map_err(|_| "file store lock poisoned")?;
        guard.insert(FileId(file_id), file);
        Ok(FileId(file_id))
    }
}

impl TryFrom<FileId> for File {
    type Error = BoxErr;

    fn try_from(file_id: FileId) -> Result<Self, Self::Error> {
        let mut guard = FILE_STORE.lock().map_err(|_| "file store lock poisoned")?;
        let file = guard.remove(&file_id).ok_or("file not found")?;
        if file.file_name.is_none() {
            Ok(file.file_name(file_id.0.to_string()))
        } else {
            Ok(file)
        }
    }
}

impl File {
    pub fn from_path<P: Into<std::path::PathBuf>>(path: P) -> Self {
        Self {
            data: FileData::Path(path.into()),
            file_name: None,
            mime_type: None,
        }
    }

    pub fn from_bytes<B: Into<Vec<u8>>>(data: B) -> Self {
        Self {
            data: FileData::Bytes(data.into()),
            file_name: None,
            mime_type: None,
        }
    }

    pub fn from_reader<R: std::io::Read + Send + 'static>(reader: R) -> Self {
        Self {
            data: FileData::Reader(Box::new(reader)),
            file_name: None,
            mime_type: None,
        }
    }

    pub fn from_async_reader<R: futures::io::AsyncRead + Send + 'static>(reader: R) -> Self {
        use tokio_util::compat::FuturesAsyncReadCompatExt as _;
        let reader = reader.compat();
        Self {
            data: FileData::Async(reqwest::Body::wrap_stream(
                tokio_util::io::ReaderStream::new(reader),
            )),
            file_name: None,
            mime_type: None,
        }
    }
}

impl File {
    pub fn file_name(mut self, file_name: impl Into<String>) -> Self {
        self.file_name = Some(file_name.into());
        self
    }

    pub fn mime_type(mut self, mime_type: impl Into<String>) -> Self {
        self.mime_type = Some(mime_type.into());
        self
    }
}

impl TryFrom<File> for reqwest::blocking::multipart::Part {
    type Error = BoxErr;

    fn try_from(file: File) -> Result<Self, Self::Error> {
        let mut part = match file.data {
            FileData::Path(path) => {
                let file = std::fs::File::open(path.as_path())?;
                let file_size = file.metadata()?.len();
                let mut part =
                    reqwest::blocking::multipart::Part::reader_with_length(file, file_size);
                if let Some(name) = path.file_name() {
                    part = part.file_name(name.to_string_lossy().into_owned());
                }
                part = part.mime_str(
                    mime_guess::from_path(&path)
                        .first_or_octet_stream()
                        .as_ref(),
                )?;
                part
            }

            FileData::Bytes(data) => reqwest::blocking::multipart::Part::bytes(data),

            FileData::Reader(reader) => reqwest::blocking::multipart::Part::reader(reader),

            FileData::Async(_) => {
                return Err("async readers are not supported".into());
            }
        };

        if let Some(file_name) = file.file_name {
            part = part.file_name(file_name);
        }
        if let Some(mime_type) = file.mime_type {
            part = part.mime_str(&mime_type)?;
        }
        Ok(part)
    }
}

impl File {
    pub(crate) async fn into_reqwest_part(self) -> Result<reqwest::multipart::Part, BoxErr> {
        let mut part = match self.data {
            FileData::Path(path) => reqwest::multipart::Part::file(path).await?,
            FileData::Bytes(data) => reqwest::multipart::Part::bytes(data),
            FileData::Async(body) => reqwest::multipart::Part::stream(body),
            FileData::Reader(_) => {
                return Err("sync readers are not supported".into());
            }
        };

        if let Some(file_name) = self.file_name {
            part = part.file_name(file_name);
        }
        if let Some(mime_type) = self.mime_type {
            part = part.mime_str(&mime_type)?;
        }
        Ok(part)
    }
}

#[derive(Debug)]
pub(crate) struct FileExtractor {
    path: TypePath,
    prefix: String,
    current_path: ValuePath,
    output: HashMap<String, FileId>,
}

impl FileExtractor {
    pub fn extract_all_from(
        variables: &mut JsonObject,
        mut path_to_files: HashMap<String, Vec<TypePath>>,
    ) -> Result<HashMap<String, FileId>, BoxErr> {
        let mut output = HashMap::new();

        for (key, value) in variables.iter_mut() {
            let paths = path_to_files.remove(key).unwrap_or_default();
            for path in paths.into_iter() {
                let mut extractor = Self {
                    path,
                    prefix: key.clone(),
                    current_path: ValuePath::default(),
                    output: std::mem::take(&mut output),
                };
                extractor.extract_from_value(value)?;
                output = extractor.output;
            }
        }

        Ok(output)
    }

    fn extract_from_value(&mut self, value: &mut serde_json::Value) -> Result<(), BoxErr> {
        let cursor = self.current_path.0.len();
        if cursor == self.path.0.len() {
            // end of type_path; replace file_id with null
            let file_id: FileId = serde_json::from_value(value.take())?;
            self.output.insert(self.format_path(), file_id);
            return Ok(());
        }
        let segment = self.path.0[cursor];
        use ValuePathSegment as VPSeg;
        match segment {
            "?" => {
                if !value.is_null() {
                    self.current_path.0.push(VPSeg::Optional);
                    self.extract_from_value(value)?;
                    self.current_path.0.pop();
                }
            }
            "[]" => {
                let items = value
                    .as_array_mut()
                    .ok_or_else(|| format!("expected an array at {:?}", self.format_path()))?;
                for (idx, item) in items.iter_mut().enumerate() {
                    self.current_path.0.push(VPSeg::Index(idx));
                    self.extract_from_value(item)?;
                    self.current_path.0.pop();
                }
            }
            x if x.starts_with('.') => {
                let key = &x[1..];
                let object = value
                    .as_object_mut()
                    .ok_or_else(|| format!("expected an object at {:?}", self.format_path()))?;
                let mut null = serde_json::Value::Null;
                let value = object.get_mut(key).unwrap_or(&mut null);
                self.current_path.0.push(VPSeg::Prop(key));
                self.extract_from_value(value)?;
                self.current_path.0.pop();
            }
            _ => unreachable!(),
        }

        Ok(())
    }

    /// format the path following the GraphQL multipart request spec
    /// see: https://github.com/jaydenseric/graphql-multipart-request-spec
    fn format_path(&self) -> String {
        let mut res = self.prefix.clone();
        use ValuePathSegment as VPSeg;
        for seg in &self.current_path.0 {
            match seg {
                VPSeg::Optional => {}
                VPSeg::Index(idx) => res.push_str(&format!(".{}", idx)),
                VPSeg::Prop(key) => res.push_str(&format!(".{}", key)),
            }
        }
        res
    }
}

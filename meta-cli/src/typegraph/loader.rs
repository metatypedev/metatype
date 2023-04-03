// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use std::{
    collections::{HashMap, VecDeque},
    env,
    path::{Path, PathBuf},
    process::Stdio,
    sync::Arc,
    time::Duration,
};

use anyhow::{bail, Context, Error, Result};
use colored::Colorize;
use common::typegraph::Typegraph;
use notify::{
    event::ModifyKind, recommended_watcher, Event, EventKind, RecommendedWatcher, RecursiveMode,
    Watcher,
};
use pathdiff::diff_paths;
use tokio::{
    fs::DirEntry,
    process::Command,
    sync::mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender},
};

use crate::{config::Config, utils::ensure_venv};

use super::postprocess::{self, apply_all, PostProcessorWrapper};

#[derive(Debug)]
enum LoaderInput {
    File(PathBuf),
    Directory(PathBuf),
    Glob(String),
}

pub struct LoaderOptions {
    skip_deno_modules: bool,
    config: Config,
    watch: bool,
    codegen: bool, // TODO
    postprocessors: Vec<PostProcessorWrapper>,
    inputs: Vec<LoaderInput>,
    gitignore: bool, // TODO apply filters from .gitignore files
}

#[derive(Debug)]
pub enum LoaderError {
    UnknownFileType(PathBuf),
    PostProcessingError {
        path: PathBuf,
        typegraph_name: String,
        error: Error,
    },
    SerdeJson {
        path: PathBuf,
        error: serde_json::Error,
    },
    Unknown {
        path: PathBuf,
        error: Error,
    },
}

#[derive(Debug)]
pub enum LoaderOutput {
    Typegraph { path: PathBuf, typegraph: Typegraph },
    Error(LoaderError),
    Rewritten(PathBuf),
}

impl LoaderOptions {
    pub fn with_config(config: &Config) -> Self {
        Self {
            skip_deno_modules: false,
            config: config.clone(),
            watch: false,
            codegen: false,
            postprocessors: vec![postprocess::deno_rt::ReformatScripts.into()],
            inputs: vec![],
            gitignore: false,
        }
    }

    pub fn skip_deno_modules(&mut self, skip_deno: bool) -> &mut Self {
        self.skip_deno_modules = skip_deno;
        self
    }

    pub fn with_postprocessor(
        &mut self,
        postprocessor: impl Into<PostProcessorWrapper>,
    ) -> &mut Self {
        self.postprocessors.push(postprocessor.into());
        self
    }

    pub fn file(&mut self, path: impl AsRef<Path>) -> &mut Self {
        let path = self.config.base_dir.join(path);
        self.inputs.push(LoaderInput::File(path));
        self
    }

    pub fn dir(&mut self, path: impl AsRef<Path>) -> &mut Self {
        let path = self.config.base_dir.join(path);
        self.inputs.push(LoaderInput::Directory(path));
        self
    }

    pub fn glob(&mut self, glob: String) -> &mut Self {
        self.inputs.push(LoaderInput::Glob(glob));
        self
    }

    pub fn watch(&mut self, watch: bool) -> &mut Self {
        self.watch = watch;
        self
    }

    pub fn codegen(&mut self, codegen: bool) -> &mut Self {
        self.codegen = codegen;
        self
    }
}

#[derive(Clone)]
struct LoaderInternal {
    sender: UnboundedSender<LoaderOutput>,
    options: Arc<LoaderOptions>,
}

impl LoaderInternal {
    async fn start(&self) -> Result<()> {
        let watch_rx = if self.options.watch {
            let (tx, rx) = unbounded_channel();
            let mut watcher = self.create_watcher(tx)?;
            for input in self.options.inputs.iter() {
                match input {
                    LoaderInput::File(path) | LoaderInput::Directory(path) => {
                        watcher
                            .watch(path, RecursiveMode::Recursive)
                            .with_context(|| format!("Watching {path:?}"))
                            .unwrap();
                    }
                    LoaderInput::Glob(_) => bail!("watch is not supported for globs"),
                }
            }
            Some(rx)
        } else {
            None
        };

        let mut count = 0;
        for input in self.options.inputs.iter() {
            match input {
                LoaderInput::File(path) => {
                    self.load_file(path.clone(), None, false);
                    count += 1;
                }
                LoaderInput::Directory(path) => {
                    count += self.load_directory(path.clone()).await?;
                }
                LoaderInput::Glob(_glob) => {
                    todo!();
                }
            }
        }

        if count == 0 {
            println!("No typegraph definition module found.");
        }

        if let Some(mut rx) = watch_rx {
            println!("Entering watch mode...");
            let self_1 = self.clone();
            tokio::spawn(async move {
                while let Some(paths) = rx.recv().await {
                    for path in paths {
                        let metadata = path.metadata().unwrap();
                        if metadata.is_file() {
                            self_1.load_file(path, None, true);
                        }
                    }
                }
            });
        }

        Ok(())
    }

    fn create_watcher(&self, sender: UnboundedSender<Vec<PathBuf>>) -> Result<RecommendedWatcher> {
        let mut watcher = recommended_watcher(move |res: Result<Event, notify::Error>| {
            let event = res.unwrap();
            match event.kind {
                EventKind::Create(_)
                | EventKind::Remove(_)
                | EventKind::Modify(ModifyKind::Data(_))
                | EventKind::Modify(ModifyKind::Name(_)) => {
                    sender.send(event.paths).unwrap();
                }
                _ => {}
            }
        })?;

        watcher
            .configure(
                notify::Config::default()
                    .with_poll_interval(Duration::from_secs(1))
                    .with_compare_contents(true),
            )
            .unwrap();

        Ok(watcher)
    }

    fn load_file(&self, path: PathBuf, input_dir: Option<PathBuf>, watch: bool) {
        let tx = self.sender.clone();
        let options = Arc::clone(&self.options);
        tokio::spawn(async move {
            let ext = path.extension().and_then(|ext| ext.to_str());
            match ext {
                Some(ext) if ext == "py" => {
                    if watch {
                        println!("File changed modified: {path:?}");
                    } else if let Some(input_dir) = input_dir {
                        let rel_path = diff_paths(&path, &input_dir).unwrap();
                        println!("[input dir: {input_dir:?}] Found python typegraph definition module at {rel_path:?}");
                    }

                    let output = Self::load_python_module(&path, &options)
                        .await
                        .with_context(|| format!("Loading python module {:?}", path));
                    match output {
                        Ok(output) => {
                            if output.is_empty() {
                                // rewritten by an importer
                                tx.send(LoaderOutput::Rewritten(path)).unwrap();
                            } else {
                                match Self::load_string(&path, output, &options) {
                                    Err(err) => {
                                        tx.send(LoaderOutput::Error(err)).unwrap();
                                    }
                                    Ok(tgs) => {
                                        for tg in tgs.into_iter() {
                                            tx.send(LoaderOutput::Typegraph {
                                                path: path.clone(),
                                                typegraph: tg,
                                            })
                                            .unwrap();
                                        }
                                    }
                                }
                            }
                        }
                        Err(error) => {
                            tx.send(LoaderOutput::Error(LoaderError::Unknown { path, error }))
                                .unwrap();
                        }
                    }
                }
                _ => {
                    tx.send(LoaderOutput::Error(LoaderError::UnknownFileType(path)))
                        .unwrap();
                }
            }
        });
    }

    fn load_string(
        path: &Path,
        json: String,
        options: &LoaderOptions,
    ) -> Result<Vec<Typegraph>, LoaderError> {
        let mut tgs =
            serde_json::from_str::<Vec<Typegraph>>(&json).map_err(|e| LoaderError::SerdeJson {
                path: path.to_owned(),
                error: e,
            })?;
        for tg in tgs.iter_mut() {
            apply_all(options.postprocessors.iter(), tg, &options.config).map_err(|e| {
                LoaderError::PostProcessingError {
                    path: path.to_owned(),
                    typegraph_name: "".to_owned(),
                    error: e,
                }
            })?;
        }
        Ok(tgs)
    }

    pub async fn load_directory(&self, path: PathBuf) -> anyhow::Result<u32> {
        let mut queue: VecDeque<PathBuf> = VecDeque::new();
        queue.push_back(path.clone());

        let py_loader = self.options.config.loader("python").unwrap();
        let include_set = py_loader.get_include_set()?;
        let exclude_set = py_loader.get_exclude_set()?;

        let mut count = 0;

        while let Some(dir) = queue.pop_front() {
            let mut read_dir = tokio::fs::read_dir(&dir).await?;
            while let Some(entry) = read_dir.next_entry().await? {
                let file_name = dir.join(entry.file_name());
                let file_type = entry.file_type().await?;

                // follow symlink
                let (file_name, file_type) = if file_type.is_symlink() {
                    let file_name = tokio::fs::read_link(file_name).await?;
                    let file_name = dir.join(file_name);
                    let metadata = tokio::fs::metadata(&file_name).await?;
                    let file_type = metadata.file_type();
                    (file_name, file_type)
                } else {
                    (file_name, file_type)
                };

                if file_type.is_dir() {
                    queue.push_back(file_name);
                    continue;
                } else if !file_type.is_file() {
                    continue;
                }

                // filter
                if is_hidden(&entry) {
                    continue;
                }
                let relative = diff_paths(&file_name, &self.options.config.base_dir).unwrap();
                let included = include_set.is_empty() || include_set.is_match(&relative);
                let excluded = !exclude_set.is_empty() && exclude_set.is_match(&relative);
                if !included || excluded {
                    continue;
                }

                self.load_file(file_name, Some(path.clone()), false);
                count += 1;
            }
        }
        Ok(count)
    }

    // Language-specific steps.
    // Returning typegraphs in raw (before post-processing) JSON.

    pub async fn load_python_module(path: &Path, options: &LoaderOptions) -> Result<String> {
        ensure_venv(&options.config.base_dir)?;

        // Search in PATH does not work on Windows
        // See: https://doc.rust-lang.org/std/process/struct.Command.html#method.new
        #[cfg(target_os = "windows")]
        let program_name = Path::new(&env::var("VIRTUAL_ENV")?).join("Scripts/py-tg.exe");
        #[cfg(not(target_os = "windows"))]
        let program_name = Path::new("py-tg").to_path_buf();

        let vars: HashMap<_, _> = env::vars().collect();

        let p = Command::new(program_name.clone())
            .arg(path.to_str().unwrap())
            // .args(args)
            .current_dir(&options.config.base_dir)
            .envs(vars)
            .env("PYTHONUNBUFFERED", "1")
            .env("PYTHONDONTWRITEBYTECODE", "1")
            .env(
                "DONT_READ_EXTERNAL_TS_FILES",
                if options.skip_deno_modules { "1" } else { "" },
            )
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .with_context(|| format!("Running the command '{:?} {:?}'", program_name, path))?;

        if p.status.success() {
            Ok(String::from_utf8(p.stdout)?)
        } else {
            let stderr = String::from_utf8(p.stderr)?;
            bail!("Python error:\n{}", stderr.red())
        }
    }
}

impl From<LoaderOptions> for Loader {
    fn from(options: LoaderOptions) -> Self {
        let (tx, rx) = unbounded_channel();

        let internal = LoaderInternal {
            options: Arc::new(options),
            sender: tx,
        };

        tokio::spawn(async move {
            internal.start().await.unwrap();
        });

        Loader { receiver: rx }
    }
}

pub struct Loader {
    receiver: UnboundedReceiver<LoaderOutput>,
}

impl Loader {
    pub async fn next(&mut self) -> Option<LoaderOutput> {
        self.receiver.recv().await
    }
}

fn is_hidden(entry: &DirEntry) -> bool {
    entry
        .file_name()
        .to_str()
        .map(|s| s.starts_with('.'))
        .unwrap_or(false)
}

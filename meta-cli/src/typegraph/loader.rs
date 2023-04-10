// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use std::{
    collections::{HashMap, HashSet, VecDeque},
    env,
    path::{Path, PathBuf},
    process::Stdio,
    sync::{Arc, Mutex},
    time::Duration,
};

use anyhow::{bail, Context, Error, Result};
use colored::Colorize;
use common::typegraph::Typegraph;
use ignore::{gitignore::Gitignore, Match};
use notify_debouncer_mini::{
    new_debouncer,
    notify::{self, RecommendedWatcher, RecursiveMode},
    DebounceEventResult, Debouncer,
};
use pathdiff::diff_paths;
use tokio::{
    process::Command,
    sync::mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender},
};

use crate::{
    config::Config,
    utils::{ensure_venv, fs::is_hidden},
};

use super::postprocess::{self, apply_all, PostProcessorWrapper};

#[derive(Debug, Clone)]
enum FilterTypegraph {
    All,
    One(String),
}

#[derive(Debug)]
enum LoaderInput {
    File(PathBuf, FilterTypegraph),
    Directory(PathBuf),
    // Glob(String),
}

pub struct LoaderOptions {
    skip_deno_modules: bool,
    config: Config,
    watch: bool,
    postprocessors: Vec<PostProcessorWrapper>,
    inputs: Vec<LoaderInput>,
    exclude_gitignored: bool,
    exclude_hidden_files: bool,
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
    Typegraph(Typegraph),
    Error(LoaderError),
    Rewritten(PathBuf),
}

impl LoaderOptions {
    pub fn with_config(config: &Config) -> Self {
        Self {
            skip_deno_modules: false,
            config: config.clone(),
            watch: false,
            postprocessors: vec![postprocess::deno_rt::ReformatScripts.into()],
            inputs: vec![],
            exclude_gitignored: true,
            exclude_hidden_files: true,
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

    pub fn typegraph(&mut self, tdm: impl AsRef<Path>, tg_name: &str) -> &mut Self {
        let path = self.config.base_dir.join(tdm);
        self.inputs.push(LoaderInput::File(
            path,
            FilterTypegraph::One(tg_name.to_owned()),
        ));
        self
    }

    pub fn file(&mut self, path: impl AsRef<Path>) -> &mut Self {
        let path = self.config.base_dir.join(path);
        self.inputs
            .push(LoaderInput::File(path, FilterTypegraph::All));
        self
    }

    pub fn dir(&mut self, path: impl AsRef<Path>) -> &mut Self {
        let path = self.config.base_dir.join(path);
        self.inputs.push(LoaderInput::Directory(path));
        self
    }

    // pub fn glob(&mut self, glob: String) -> &mut Self {
    //     self.inputs.push(LoaderInput::Glob(glob));
    //     self
    // }

    pub fn watch(&mut self, watch: bool) -> &mut Self {
        self.watch = watch;
        self
    }

    #[allow(dead_code)]
    pub fn exclude_gitignored(&mut self, exclude: bool) -> &mut Self {
        self.exclude_gitignored = exclude;
        self
    }

    #[allow(dead_code)]
    pub fn exclude_hidden_files(&mut self, exclude: bool) -> &mut Self {
        self.exclude_hidden_files = exclude;
        self
    }

    pub fn codegen(&mut self) -> &mut Self {
        self.skip_deno_modules(true)
            .with_postprocessor(postprocess::DenoModules::default().codegen(true))
    }
}

#[derive(Debug, Clone)]
enum ReloadReason {
    Discovery,
    User,
    Modified,
    DependencyModified(PathBuf),
}

#[derive(Debug)]
enum LoaderEvent {
    ReloadAll(ReloadReason),
    ReloadFiles(Vec<PathBuf>, ReloadReason),
    Terminate,
}

// TODO use Rc<PathBuf>
#[derive(Default)]
struct DependencyGraph {
    deps: HashMap<PathBuf, HashSet<PathBuf>>, // typegraph -> deno modules
    reverse_deps: HashMap<PathBuf, HashSet<PathBuf>>, // deno module -> typegraphs
}

impl DependencyGraph {
    /// return the list of removed dependencies and added dependencies
    fn update_typegraph(&mut self, tg: &Typegraph) {
        let path = tg.path.clone().unwrap();
        if !self.deps.contains_key(&path) {
            self.deps.insert(path.clone(), HashSet::default());
        }

        let deps = self.deps.get_mut(&path).unwrap();
        let old_deps = std::mem::replace(deps, tg.deps.iter().cloned().collect());
        let removed_deps = old_deps.difference(deps);
        let added_deps = deps.difference(&old_deps);

        for removed in removed_deps {
            let rdeps = self.reverse_deps.get_mut(removed).unwrap();
            rdeps.take(&path).unwrap();
            if rdeps.is_empty() {
                self.reverse_deps.remove(removed);
            }
        }

        for added in added_deps {
            if let Some(set) = self.reverse_deps.get_mut(added) {
                set.insert(path.clone());
            } else {
                self.reverse_deps
                    .insert(added.clone(), HashSet::from_iter(Some(path.clone())));
            }
        }
    }

    fn remove_typegraph_at(&mut self, path: &Path) {
        let deps = self.deps.remove(path);
        if let Some(deps) = deps {
            for dep in deps.iter() {
                let rdeps = self.reverse_deps.get_mut(dep).unwrap();
                rdeps.take(path).unwrap();
                if rdeps.is_empty() {
                    self.reverse_deps.remove(dep);
                }
            }
        }
    }
}

#[derive(Clone)]
struct LoaderInternal {
    sender: UnboundedSender<LoaderOutput>,
    options: Arc<LoaderOptions>,
    gi: Gitignore,
    deps: Arc<Mutex<DependencyGraph>>,
}

impl LoaderInternal {
    async fn start(
        &self,
        tx: UnboundedSender<LoaderEvent>,
        mut rx: UnboundedReceiver<LoaderEvent>,
    ) -> Result<()> {
        tx.send(LoaderEvent::ReloadAll(ReloadReason::Discovery))
            .unwrap();

        let _watcher = if self.options.watch {
            // start watching early to catch all the modifications
            Some(self.create_watcher(&self.options.inputs, tx, Arc::clone(&self.deps))?)
        } else {
            tx.send(LoaderEvent::Terminate).unwrap();
            None
        };

        while let Some(event) = rx.recv().await {
            match event {
                LoaderEvent::ReloadAll(reason) => {
                    let mut count = 0;
                    for input in self.options.inputs.iter() {
                        match input {
                            LoaderInput::File(path, filter) => {
                                let res = self
                                    .load_file(path.clone(), filter.clone(), reason.clone())
                                    .await;
                                if res {
                                    count += 1;
                                }
                            }
                            LoaderInput::Directory(path) => {
                                count += self.load_directory(path.clone(), reason.clone()).await?;
                            } // LoaderInput::Glob(_glob) => {
                              //     todo!();
                              // }
                        }
                    }

                    if count == 0 {
                        println!("No typegraph definition module found.");
                    }
                }
                LoaderEvent::ReloadFiles(paths, reason) => {
                    for path in paths {
                        if let Ok(metadata) = path.metadata() {
                            if metadata.is_file() {
                                self.load_file(path, FilterTypegraph::All, reason.clone())
                                    .await;
                            }
                        } else {
                            // file removed??
                            self.deps.lock().unwrap().remove_typegraph_at(&path);
                        }
                    }
                }
                LoaderEvent::Terminate => {
                    break;
                }
            }
        }

        Ok(())
    }

    fn create_watcher(
        &self,
        inputs: &[LoaderInput],
        tx: UnboundedSender<LoaderEvent>,
        deps: Arc<Mutex<DependencyGraph>>,
    ) -> Result<Debouncer<RecommendedWatcher>> {
        let mut debouncer = new_debouncer(
            Duration::from_secs(1),
            None,
            move |res: DebounceEventResult| {
                let events = res.unwrap();
                for path in events.into_iter().map(|e| e.path) {
                    let rdeps = deps.lock().unwrap().reverse_deps.get(&path).cloned();
                    if let Some(rdeps) = rdeps {
                        tx.send(LoaderEvent::ReloadFiles(
                            rdeps.into_iter().collect(),
                            ReloadReason::DependencyModified(path),
                        ))
                        .unwrap();
                    } else {
                        tx.send(LoaderEvent::ReloadFiles(vec![path], ReloadReason::Modified))
                            .unwrap();
                    }
                }
            },
        )?;

        let watcher = debouncer.watcher();
        watcher
            .configure(
                notify::Config::default()
                    .with_poll_interval(Duration::from_secs(1))
                    .with_compare_contents(true),
            )
            .unwrap();

        for input in inputs {
            match input {
                LoaderInput::File(path, _) | LoaderInput::Directory(path) => {
                    println!("Watching {path:?}");
                    watcher
                        .watch(path, RecursiveMode::Recursive)
                        .with_context(|| format!("Watching {path:?}"))
                        .unwrap();
                } // LoaderInput::Glob(_) => bail!("watch is not supported for globs"),
            }
        }

        Ok(debouncer)
    }

    // return false if the file was skipped
    async fn load_file(
        &self,
        path: PathBuf,
        filter: FilterTypegraph,
        reason: ReloadReason,
    ) -> bool {
        let tx = self.sender.clone();

        if self.options.exclude_hidden_files && is_hidden(&path) {
            return false;
        }

        if let Match::Ignore(_) = self.gi.matched(&path, false) {
            return false;
        }

        let options = Arc::clone(&self.options);
        let ext = path.extension().and_then(|ext| ext.to_str());
        match ext {
            Some(ext) if ext == "py" => {
                let current_dir = std::env::current_dir().unwrap();
                let rel_path = diff_paths(&path, &current_dir);
                match reason {
                    ReloadReason::Modified => {
                        eprintln!("Reloading typegraph definition module (modified): {rel_path:?}");
                    }
                    ReloadReason::DependencyModified(dep_path) => {
                        let dep_rel_path = diff_paths(&dep_path, current_dir);
                        eprintln!("Reloading typegraph definition module (dependency modified {dep_rel_path:?}): {rel_path:?}");
                    }
                    ReloadReason::Discovery => {
                        eprintln!("Found python typegraph definition module at {rel_path:?}");
                    }
                    ReloadReason::User => {
                        eprintln!("Reloading typegraph definition module (manual): {rel_path:?}");
                    }
                }

                let output = Self::load_python_module(&path, &options)
                    .await
                    .with_context(|| format!("Loading python module {:?}", path));
                match output {
                    Ok(output) => {
                        if output.is_empty() {
                            // rewritten by an importer
                            tx.send(LoaderOutput::Rewritten(path)).unwrap();
                            false
                        } else {
                            match Self::load_string(&path, filter, output, &options) {
                                Err(err) => {
                                    eprintln!("Error loading python typegraph definition module: {path:?} {err:?}");
                                    tx.send(LoaderOutput::Error(err)).unwrap();
                                    false
                                }
                                Ok(tgs) => {
                                    for tg in tgs.into_iter() {
                                        self.deps.lock().unwrap().update_typegraph(&tg);
                                        tx.send(LoaderOutput::Typegraph(tg)).unwrap();
                                    }
                                    true
                                }
                            }
                        }
                    }
                    Err(error) => {
                        tx.send(LoaderOutput::Error(LoaderError::Unknown { path, error }))
                            .unwrap();
                        false
                    }
                }
            }
            _ => {
                tx.send(LoaderOutput::Error(LoaderError::UnknownFileType(path)))
                    .unwrap();
                false
            }
        }
    }

    fn load_string(
        path: &Path,
        filter: FilterTypegraph,
        json: String,
        options: &LoaderOptions,
    ) -> Result<Vec<Typegraph>, LoaderError> {
        let mut tgs =
            serde_json::from_str::<Vec<Typegraph>>(&json).map_err(|e| LoaderError::SerdeJson {
                path: path.to_owned(),
                error: e,
            })?;
        tgs = match filter {
            FilterTypegraph::All => tgs,
            FilterTypegraph::One(tg_name) => tgs
                .into_iter()
                .filter(|tg| tg.name().unwrap() == tg_name)
                .collect(),
        };
        for tg in tgs.iter_mut() {
            tg.path = Some(path.to_owned());
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

    pub async fn load_directory(&self, path: PathBuf, reason: ReloadReason) -> anyhow::Result<u32> {
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
                if is_hidden(entry.path()) {
                    continue;
                }
                let relative = diff_paths(&file_name, &self.options.config.base_dir).unwrap();
                let included = include_set.is_empty() || include_set.is_match(&relative);
                let excluded = !exclude_set.is_empty() && exclude_set.is_match(&relative);
                if !included || excluded {
                    continue;
                }

                let res = self
                    .load_file(file_name, FilterTypegraph::All, reason.clone())
                    .await;
                if res {
                    count += 1;
                }
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
        let gi = if options.exclude_gitignored {
            Gitignore::new(options.config.base_dir.join(".gitignore")).0
        } else {
            Gitignore::empty()
        };

        let internal = LoaderInternal {
            options: Arc::new(options),
            sender: tx,
            gi,
            deps: Arc::new(Mutex::new(DependencyGraph::default())),
        };

        let (event_tx, event_rx) = unbounded_channel();

        let event_tx_1 = event_tx.clone();
        tokio::spawn(async move {
            internal.start(event_tx_1, event_rx).await.unwrap();
        });

        Loader {
            receiver: rx,
            event_sender: event_tx,
        }
    }
}

pub struct Loader {
    receiver: UnboundedReceiver<LoaderOutput>,
    event_sender: UnboundedSender<LoaderEvent>,
}

impl Loader {
    pub async fn next(&mut self) -> Option<LoaderOutput> {
        self.receiver.recv().await
    }

    pub fn reload_all(&self) -> Result<()> {
        self.event_sender
            .send(LoaderEvent::ReloadAll(ReloadReason::User))?;
        Ok(())
    }
}

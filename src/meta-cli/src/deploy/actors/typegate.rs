// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::console::{Console, ConsoleActor};
use crate::config::NodeConfig;
use crate::interlude::*;
use base64::engine::{general_purpose::STANDARD as b64, Engine};
use colored::OwoColorize;
use futures::channel::oneshot;
use process_wrap::tokio::TokioChildWrapper;
use rand::RngCore;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{ChildStderr, ChildStdout, Command};
use tokio::sync::Mutex;

pub mod message {
    use super::*;

    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct StartProcess(pub Command, pub oneshot::Sender<u16>);

    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct Stop;
}

pub struct TypegateActor {
    console: Addr<ConsoleActor>,
    #[allow(unused)]
    temp_dir: Option<tempfile::TempDir>,
    child_process: Option<Arc<Mutex<tokio::process::Child>>>,
}

#[derive(Debug)]
pub struct TypegateInit {
    port: u16,
    admin_password: String,
    main_url: Option<String>,
    import_map_url: Option<String>,
}

impl TypegateInit {
    pub async fn new(
        node_config: &NodeConfig,
        working_dir: impl AsRef<Path> + std::fmt::Debug,
        main_url: Option<String>,
        import_map_url: Option<String>,
    ) -> Result<Self> {
        let host = node_config
            .url
            .host_str()
            .ok_or_else(|| ferr!("host required on target url"))?;
        if host != "localhost" {
            return Err(ferr!(
                "typegate can only be started if the target host is 'localhost', got '{host}'"
            ));
        }

        let port = node_config
            .url
            .port()
            .ok_or_else(|| ferr!("port required on target url"))?;

        let admin_password = node_config.get_admin_password(working_dir).await?;

        Ok(Self {
            port,
            admin_password,
            main_url,
            import_map_url,
        })
    }

    #[tracing::instrument]
    pub async fn start(self, console: Addr<ConsoleActor>) -> Result<(Addr<TypegateActor>, u16)> {
        let (ready_tx, ready_rx) = oneshot::channel();

        let (temp_dir, temp_dir_handle) = if let Ok(temp_dir) = std::env::var("TMP_DIR") {
            (Path::new(&temp_dir).to_path_buf(), None)
        } else {
            let temp_dir = tempfile::tempdir().context("could not create temporary directory")?;
            (temp_dir.path().to_path_buf(), Some(temp_dir))
        };

        let command = self.create_command(&temp_dir)?;

        let addr = TypegateActor::create(move |ctx| {
            trace!("typegate actor starting");
            ctx.address()
                .do_send(message::StartProcess(command, ready_tx));

            TypegateActor {
                temp_dir: temp_dir_handle,
                console,
                child_process: None,
            }
        });

        let port = ready_rx.await.context("typegate did not start")?;

        Ok((addr, port))
    }

    fn create_command(&self, temp_dir: &Path) -> Result<Command> {
        let exe = std::env::current_exe().context("could not get current executable")?;

        let tg_secret = get_tg_secret();

        let mut command = Command::new(exe);
        command
            .arg("typegate")
            .env("TG_PORT", self.port.to_string())
            .env("TG_SECRET", tg_secret)
            .env("TG_ADMIN_PASSWORD", &self.admin_password)
            .env("TMP_DIR", temp_dir.to_str().unwrap())
            .env("DEBUG", "true")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        if let Some(url) = &self.main_url {
            command.arg(format!("--main-url={url}"));
        }
        if let Some(url) = &self.import_map_url {
            command.arg(format!("--import-map-url={url}"));
        }

        Ok(command)
    }
}

/// read TG_SECRET from environment variable or create a random one
fn get_tg_secret() -> String {
    std::env::var("TG_SECRET").unwrap_or_else(|_| {
        let mut secret = vec![0; 64];
        rand::thread_rng().fill_bytes(&mut secret);
        b64.encode(&secret)
    })
}

impl Actor for TypegateActor {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {}
}

impl Handler<message::StartProcess> for TypegateActor {
    type Result = ();

    fn handle(&mut self, msg: message::StartProcess, ctx: &mut Self::Context) {
        let message::StartProcess(command, ready_tx) = msg;

        use process_wrap::tokio::*;

        let spawn_res = TokioCommandWrap::from(command)
            .wrap(KillOnDrop)
            .wrap(ProcessSession) // UNIX only
            .spawn()
            .context("failed to spawn typegate process");

        let console = self.console.clone();

        // to prevent nested error handling in the match statement
        let spawn_res = spawn_res.map(|mut child| {
            let res = TypegateActor::take_output_streams(&mut child);
            res.map(|(stdout, stderr)| (child, stdout, stderr))
        });

        match spawn_res {
            Ok(Ok((child, stdout, stderr))) => {
                self.child_process = Some(Mutex::new(child.into_inner()).into());

                {
                    let addr = ctx.address();
                    let console = console.clone();
                    let fut = async move {
                        TypegateActor::read_stdout(addr, stdout, console.clone(), ready_tx).await;
                    };
                    ctx.spawn(fut.in_current_span().into_actor(self));
                }

                {
                    let addr = ctx.address();
                    let console = console.clone();
                    let fut = async move {
                        TypegateActor::read_stderr(addr, stderr, console.clone()).await;
                    };
                    ctx.spawn(fut.in_current_span().into_actor(self));
                }

                if let Some(child_arc) = &self.child_process {
                    let addr = ctx.address();
                    let child_arc = Arc::clone(child_arc);
                    let fut = async move {
                        let mut child = child_arc.lock().await;
                        child
                            .wait()
                            .await
                            .expect("failed to wait for typegate process");
                        addr.do_send(message::Stop);
                    };
                    ctx.spawn(fut.in_current_span().into_actor(self));
                }
            }

            Err(e) | Ok(Err(e)) => {
                console.error(format!("failed to start typegate: {e}"));
                ctx.stop();
            }
        }
    }
}

impl Handler<message::Stop> for TypegateActor {
    type Result = ();

    fn handle(&mut self, _msg: message::Stop, ctx: &mut Self::Context) {
        if let Some(child_arc) = self.child_process.take() {
            let fut = async move {
                let mut child = child_arc.lock().await;
                let _ = child.kill().await;
            };
            ctx.spawn(fut.into_actor(self));
        }

        ctx.stop();
    }
}

enum LogLevel {
    Debug,
    Info,
    Warning,
    Error,
}

impl LogLevel {
    fn from_str(s: &str) -> Option<Self> {
        match s {
            "DEBUG" => Some(Self::Debug),
            "INFO" => Some(Self::Info),
            "WARN" => Some(Self::Warning),
            "ERROR" => Some(Self::Error),
            "CRITICAL" => Some(Self::Error),
            _ => None,
        }
    }
}

struct LogRecord<'a> {
    level: LogLevel,
    #[allow(unused)]
    scope: &'a str,
    message: &'a str,
}

// TODO unit test
impl<'a> LogRecord<'a> {
    fn from_line(line: &'a str) -> Option<Self> {
        let (first, tail) = line.split_once(' ')?;
        let _ = chrono::DateTime::parse_from_rfc3339(first).ok()?;
        if tail.chars().next()? != '[' {
            return None;
        }
        let (level_scope, message) = tail[1..].split_once("] ")?;
        let (level, scope) = level_scope.split_once(' ')?;
        let level = LogLevel::from_str(level)?;
        Some(Self {
            level,
            scope,
            message,
        })
    }

    // Log records from Rust have different format, and are sent to stderr
    fn from_line_native(line: &'a str) -> Option<Self> {
        let (level, message) = line.split_once(' ')?;
        let level = LogLevel::from_str(level)?;
        Some(Self {
            level,
            scope: "",
            message,
        })
    }

    fn log(&self, console: &Addr<ConsoleActor>) {
        // let prefix = format!("typegate ({})>", self.scope);
        let prefix = "typegate>";
        let prefix = prefix.dimmed();
        match self.level {
            LogLevel::Debug => console.debug(format!("{} {}", prefix, self.message)),
            LogLevel::Info => console.info(format!("{} {}", prefix, self.message)),
            LogLevel::Warning => console.warning(format!("{} {}", prefix, self.message)),
            LogLevel::Error => console.error(format!("{} {}", prefix, self.message)),
        }
    }
}

impl TypegateActor {
    fn take_output_streams(
        process: &mut Box<dyn TokioChildWrapper>,
    ) -> Result<(ChildStdout, ChildStderr)> {
        let stdout = process
            .stdout()
            .take()
            .ok_or_else(|| ferr!("could not take stdout handle from the process"))?;
        let stderr = process
            .stderr()
            .take()
            .ok_or_else(|| ferr!("could not take stderr handle from the process"))?;
        Ok((stdout, stderr))
    }

    async fn read_stdout(
        addr: Addr<Self>,
        stdout: ChildStdout,
        console: Addr<ConsoleActor>,
        ready_tx: oneshot::Sender<u16>,
    ) {
        let mut reader = BufReader::new(stdout).lines();
        let prefix = "typegate>".dimmed();

        let error_handler = ReadErrorHandler {
            source: "stdout",
            console: console.clone(),
        };

        let ready_message_prefix = "typegate ready on :";

        while let Some(line) = error_handler.handle(reader.next_line().await) {
            let naked_line = strip_ansi_escapes::strip_str(&line);
            if let Some(log_record) = LogRecord::from_line(&naked_line) {
                log_record.log(&console);
            } else {
                console.info(format!("{prefix} {line}"));
            }
            if naked_line.contains(ready_message_prefix) {
                let (_, port) = naked_line.split_once(ready_message_prefix).unwrap();
                let port = port.trim().parse::<u16>().unwrap();
                ready_tx.send(port).unwrap();
                break;
            }
        }

        while let Some(line) = error_handler.handle(reader.next_line().await) {
            let naked_line = strip_ansi_escapes::strip_str(&line);
            if let Some(log_record) = LogRecord::from_line(&naked_line) {
                log_record.log(&console);
            } else {
                console.info(format!("{prefix} {line}"));
            }
        }

        addr.do_send(message::Stop);
    }

    async fn read_stderr(addr: Addr<Self>, stderr: ChildStderr, console: Addr<ConsoleActor>) {
        let mut reader = BufReader::new(stderr).lines();
        let prefix = "typegate]".dimmed();

        let error_handler = ReadErrorHandler {
            source: "stderr",
            console: console.clone(),
        };

        while let Some(line) = error_handler.handle(reader.next_line().await) {
            let naked_line = strip_ansi_escapes::strip_str(&line);
            if let Some(log_record) = LogRecord::from_line_native(&naked_line) {
                log_record.log(&console);
            } else {
                console.error(format!("{prefix} {line}"));
            }
        }

        addr.do_send(message::Stop);
    }
}

struct ReadErrorHandler {
    source: &'static str,
    console: Addr<ConsoleActor>,
}

impl ReadErrorHandler {
    fn handle(&self, result: Result<Option<String>, std::io::Error>) -> Option<String> {
        match result {
            Ok(maybe) => maybe,
            Err(err) => {
                self.console.error(format!(
                    "{scope} failed to read from {source}: {err}",
                    scope = "(typegate)".bold(),
                    source = self.source
                ));
                None
            }
        }
    }
}

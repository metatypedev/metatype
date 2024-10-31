use serde_json::Value;
use std::{collections::HashMap, fmt};

use anyhow::{bail, Context, Result};
use chrono::{DateTime, TimeZone, Utc};

use protobuf::{
    well_known_types::{
        struct_::{self, Struct},
        timestamp::Timestamp,
    },
    MessageField,
};
use serde::{Deserialize, Serialize};

use crate::{
    backends::Backend,
    protocol::{
        events::{Event, Records, SaveFailed, SaveResolved, SaveRetry},
        metadata::{metadata::Of, Error, Info, Metadata},
    },
};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum RunResult {
    Ok(serde_json::Value),
    Err(serde_json::Value),
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type")]
pub enum SavedValue {
    Retry {
        counter: i32,
        wait_until: DateTime<Utc>,
    },
    Resolved {
        payload: serde_json::Value,
    },
    Failed {
        err: serde_json::Value,
    },
}

/// Bridge between protobuf types to Typescript
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type")]
pub enum OperationEvent {
    Sleep {
        id: u32,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
    },
    Save {
        id: u32,
        value: SavedValue,
    },
    Send {
        event_name: String,
        value: serde_json::Value,
    },
    Stop {
        result: Option<RunResult>,
    },
    Start {
        kwargs: HashMap<String, serde_json::Value>,
    },
    Compensate,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Operation {
    pub at: DateTime<Utc>,
    pub event: OperationEvent,
}

/// A Run is a set of operations
///
/// Each operation is produced from the workflow execution
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Run {
    pub run_id: String,
    pub operations: Vec<Operation>,
}

#[derive(Debug)]
pub enum Interupt {
    Sleep,
    Saveretry,
    WaitReceiveEvent,
    WaitHandleEvent,
    WaitEnsureValue,
}

impl Interupt {
    const PREFIX: &'static str = "SUBSTANTIAL_INTERRUPT_";
}

impl fmt::Display for Interupt {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let variant = match self {
            Self::Sleep => "SLEEP",
            Self::Saveretry => "SAVE_RETRY",
            Self::WaitReceiveEvent => "WAIT_RECEIVE_EVENT",
            Self::WaitHandleEvent => "WAIT_HANDLE_EVENT",
            Self::WaitEnsureValue => "WAIT_ENSURE_VALUE",
        };
        write!(f, "{}{:?}", Self::PREFIX, variant)
    }
}

impl std::error::Error for Interupt {}

pub enum Strategy {
    Linear,
}

pub struct Retry {
    pub strategy: Option<String>,
    pub min_backoff_ms: i32,
    pub max_backoff_ms: i32,
    pub max_retries: i32,
}

pub struct RetryStrategy {
    min_backoff_ms: Option<i32>,
    max_backoff_ms: Option<i32>,
    max_retries: i32,
}

impl RetryStrategy {
    pub fn new(
        max_retries: i32,
        min_backoff_ms: Option<i32>,
        max_backoff_ms: Option<i32>,
    ) -> anyhow::Result<Self> {
        if max_retries < 1 {
            anyhow::bail!("maxRetries < 1");
        }

        let mut min_ms = min_backoff_ms;
        let mut max_ms = max_backoff_ms;

        match (min_ms, max_ms) {
            (Some(low), Some(high)) => {
                if low >= high {
                    anyhow::bail!("minBackoffMs >= maxBackoffMs");
                }
                if low < 0 {
                    anyhow::bail!("minBackoffMs < 0");
                }
            }
            (Some(low), None) => {
                max_ms = Some(low + 10);
            }
            (None, Some(high)) => {
                min_ms = Some(0.max(high - 10));
            }
            (None, None) => {}
        }

        Ok(Self {
            min_backoff_ms: min_ms,
            max_backoff_ms: max_ms,
            max_retries,
        })
    }

    pub fn eval(&self, strategy: Strategy, retries_left: i32) -> anyhow::Result<i32> {
        match strategy {
            Strategy::Linear => self.linear(retries_left),
            // Add more strategy matches here
        }
    }

    fn linear(&self, retries_left: i32) -> anyhow::Result<i32> {
        if retries_left <= 0 {
            anyhow::bail!("retries left <= 0");
        }

        let dt = self.max_backoff_ms.unwrap_or(0) - self.min_backoff_ms.unwrap_or(0);
        Ok(((self.max_retries - retries_left) * dt) / self.max_retries)
    }
}

pub struct Save {
    pub timeout_ms: Option<i32>,
    pub retry: Option<Retry>,
}

impl Run {
    pub fn new(run_id: String) -> Self {
        Self {
            run_id,
            operations: vec![],
        }
    }

    pub fn recover_from(&mut self, backend: &dyn Backend) -> Result<()> {
        if let Some(records) = backend.read_events(self.run_id.clone())? {
            let operations = records
                .events
                .into_iter()
                .map(|event| event.try_into())
                .collect::<Result<Vec<Operation>>>()
                .with_context(|| {
                    format!("Recovering operations from backend for {}", self.run_id)
                })?;
            self.operations = operations;
        }

        Ok(())
    }

    pub fn persist_into(&self, backend: &dyn Backend) -> Result<()> {
        let mut records = Records::new();
        records.events = self
            .operations
            .clone()
            .into_iter()
            .map(|op| op.try_into())
            .collect::<Result<_>>()?;
        backend.write_events(self.run_id.clone(), records)?;
        Ok(())
    }

    pub fn clear(&mut self) {
        self.operations.clear()
    }

    pub fn reset(&mut self) {
        self.operations = vec![];
    }

    fn _save<F>(&mut self, func: F, option: Option<Save>) -> Result<Value>
    where
        F: Fn() -> Result<Value>,
    {
        let next_id = 1;
        let mut current_retry_count: i32 = 1;

        for Operation { event, .. } in self.operations.iter() {
            if let OperationEvent::Save { id, value } = event {
                if *id == next_id {
                    if let SavedValue::Resolved { payload } = value {
                        return Ok(payload.clone());
                    } else if let SavedValue::Retry {
                        counter,
                        wait_until,
                    } = value
                    {
                        let now = Utc::now();
                        if wait_until > &now {
                            bail!(Interupt::Saveretry);
                        } else {
                            current_retry_count = *counter;
                        }
                    }
                }
            }
        }

        current_retry_count += 1;

        let option = option.unwrap();

        match func() {
            Ok(result) => {
                self.operations.push(Operation {
                    at: Utc::now(),
                    event: OperationEvent::Save {
                        id: next_id,
                        value: SavedValue::Resolved {
                            payload: result.clone(),
                        },
                    },
                });
                Ok(result)
            }
            Err(err) => {
                let retry = option.retry.unwrap();
                if retry.max_retries != 0 && current_retry_count < retry.max_retries {
                    let strategy = RetryStrategy {
                        min_backoff_ms: Some(retry.max_backoff_ms),
                        max_backoff_ms: Some(retry.max_backoff_ms),
                        max_retries: retry.max_retries,
                    };

                    let retries_left = (retry.max_retries - current_retry_count).max(0);
                    let delay_ms = strategy.eval(Strategy::Linear, retries_left)? as i64;
                    let wait_until_as_ms = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as i64
                        + delay_ms;

                    self.operations.push(Operation {
                        at: Utc::now(), // TODO verify if it's good
                        event: OperationEvent::Save {
                            id: next_id,
                            value: SavedValue::Retry {
                                counter: current_retry_count,
                                wait_until: Utc.timestamp_millis_opt(wait_until_as_ms).unwrap(),
                            },
                        },
                    });
                    bail!(Interupt::Saveretry);
                } else {
                    self.operations.push(Operation {
                        at: Utc::now(), // TODO verify if it's good
                        event: OperationEvent::Save {
                            id: next_id,
                            value: SavedValue::Failed {
                                err: serde_json::json!({
                                    "retries": current_retry_count,
                                    "message": err.to_string()
                                }),
                            },
                        },
                    });
                }
                bail!(err)
            }
        }
    }
}

impl TryFrom<Event> for Operation {
    type Error = anyhow::Error;
    fn try_from(event: Event) -> Result<Self> {
        use crate::protocol::events::event::Of;
        use crate::protocol::events::save::Of::{Failed, Resolved, Retry};
        use crate::protocol::events::stop;

        let at = to_datetime_utc(event.at.get_or_default())?;
        if let Some(of) = event.of.clone() {
            match of {
                Of::Start(start) => {
                    let kwargs = start
                        .kwargs
                        .fields
                        .clone()
                        .into_iter()
                        .map(|(k, v)| {
                            let v = serde_json::from_str(v.string_value())
                                .with_context(|| format!("Get value from kwargs {:?}", k))?;
                            Ok((k, v))
                        })
                        .collect::<Result<_>>()?;

                    return Ok(Operation {
                        at,
                        event: OperationEvent::Start { kwargs },
                    });
                }
                Of::Stop(stop) => {
                    if let Some(result) = stop.result {
                        let result = match result {
                            stop::Result::Ok(value) => RunResult::Ok(serde_json::from_str(&value)?),
                            stop::Result::Err(e) => RunResult::Err(serde_json::from_str(&e)?),
                        };
                        return Ok(Operation {
                            at,
                            event: OperationEvent::Stop {
                                result: Some(result),
                            },
                        });
                    }
                    return Ok(Operation {
                        at,
                        event: OperationEvent::Stop { result: None },
                    });
                }
                Of::Save(save) => {
                    let value = save
                        .clone()
                        .of
                        .with_context(|| format!("variant is empty {:?}", save))?;

                    return Ok(Operation {
                        at,
                        event: OperationEvent::Save {
                            id: save.id,
                            value: match value {
                                Resolved(resolved) => SavedValue::Resolved {
                                    payload: serde_json::from_str(&resolved.json_result)?,
                                },
                                Retry(retry) => SavedValue::Retry {
                                    counter: retry.counter,
                                    wait_until: to_datetime_utc(&retry.wait_until)?,
                                },
                                Failed(failed) => SavedValue::Failed {
                                    err: serde_json::from_str(&failed.err)?,
                                },
                            },
                        },
                    });
                }
                Of::Send(send) => {
                    let raw_value = send.clone().value;
                    let value = serde_json::from_str(&raw_value)?;
                    let event_name = send.name.clone();

                    return Ok(Operation {
                        at,
                        event: OperationEvent::Send { event_name, value },
                    });
                }
                Of::Sleep(sleep) => {
                    let start = sleep.start.clone();
                    let end = sleep.end.clone();

                    return Ok(Operation {
                        at,
                        event: OperationEvent::Sleep {
                            id: sleep.id,
                            start: to_datetime_utc(start.get_or_default())?,
                            end: to_datetime_utc(end.get_or_default())?,
                        },
                    });
                }
            }
        }

        bail!("cannot convert from event {:?}", event)
    }
}

impl TryFrom<Operation> for Event {
    type Error = anyhow::Error;
    fn try_from(operation: Operation) -> Result<Event> {
        use crate::protocol::events::event::Of;
        use crate::protocol::events::save::Of::{Failed, Resolved, Retry};
        use crate::protocol::events::{stop, Event, Save, Send, Sleep, Start, Stop};

        let at = to_timestamp(&operation.at);

        match operation.event {
            OperationEvent::Start { kwargs } => {
                let mut struct_ = Struct {
                    fields: HashMap::new(),
                    ..Default::default()
                };

                for (k, v) in kwargs {
                    let json_str = serde_json::to_string(&v)?;
                    let mut proto_value = struct_::Value::new();
                    proto_value.set_string_value(json_str);

                    struct_.fields.insert(k, proto_value);
                }

                let start = Start {
                    kwargs: MessageField::from_option(Some(struct_)),
                    ..Default::default()
                };

                Ok(Event {
                    at: MessageField::some(at),
                    of: Some(Of::Start(start)),
                    ..Default::default()
                })
            }
            OperationEvent::Stop { result } => {
                let stop_result = match result {
                    Some(res) => Some(match res {
                        RunResult::Ok(value) => stop::Result::Ok(serde_json::to_string(&value)?),
                        RunResult::Err(err) => stop::Result::Err(serde_json::to_string(&err)?),
                    }),
                    None => None,
                };

                let stop = Stop {
                    result: stop_result,
                    ..Default::default()
                };

                Ok(Event {
                    at: MessageField::some(at),
                    of: Some(Of::Stop(stop)),
                    ..Default::default()
                })
            }
            OperationEvent::Save { id, value } => {
                let save = Save {
                    id,
                    of: Some(match value {
                        SavedValue::Resolved { payload } => Resolved(SaveResolved {
                            json_result: serde_json::to_string(&payload)?,
                            ..Default::default()
                        }),
                        SavedValue::Retry {
                            counter,
                            wait_until,
                        } => Retry(SaveRetry {
                            wait_until: MessageField::some(to_timestamp(&wait_until)),
                            counter,
                            ..Default::default()
                        }),
                        SavedValue::Failed { err } => Failed(SaveFailed {
                            err: serde_json::to_string(&err)?,
                            ..Default::default()
                        }),
                    }),

                    ..Default::default()
                };

                Ok(Event {
                    at: MessageField::some(at),
                    of: Some(Of::Save(save)),
                    ..Default::default()
                })
            }
            OperationEvent::Sleep { id, start, end } => {
                let sleep = Sleep {
                    id,
                    start: MessageField::some(to_timestamp(&start)),
                    end: MessageField::some(to_timestamp(&end)),
                    ..Default::default()
                };

                Ok(Event {
                    at: MessageField::some(at),
                    of: Some(Of::Sleep(sleep)),
                    ..Default::default()
                })
            }
            OperationEvent::Send { event_name, value } => {
                let send = Send {
                    name: event_name,
                    value: serde_json::to_string(&value)?,
                    ..Default::default()
                };

                Ok(Event {
                    at: MessageField::some(at),
                    of: Some(Of::Send(send)),
                    ..Default::default()
                })
            }
            OperationEvent::Compensate => {
                unimplemented!()
            }
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type")]
pub enum MetadataPayload {
    Info(serde_json::Value),
    Error(serde_json::Value),
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MetadataEvent {
    pub at: DateTime<Utc>,
    pub metadata: Option<MetadataPayload>,
}

impl TryFrom<Metadata> for MetadataEvent {
    type Error = anyhow::Error;

    fn try_from(value: Metadata) -> anyhow::Result<Self> {
        use crate::protocol::metadata::metadata::Of::{Error, Info};
        let at = to_datetime_utc(&value.at)?;
        let to_value = |s: &str| -> serde_json::Value {
            serde_json::from_str(s).unwrap_or_else(|_| serde_json::to_value(s).unwrap())
        };

        match value.of {
            Some(of) => {
                let payload = match of {
                    Info(info) => MetadataPayload::Info(to_value(&info.message)),
                    Error(error) => MetadataPayload::Error(to_value(&error.message)),
                };

                Ok(MetadataEvent {
                    at,
                    metadata: Some(payload),
                })
            }
            None => Ok(MetadataEvent { at, metadata: None }),
        }
    }
}

impl TryFrom<MetadataEvent> for Metadata {
    type Error = anyhow::Error;
    fn try_from(value: MetadataEvent) -> anyhow::Result<Self> {
        Ok(Metadata {
            at: MessageField::some(to_timestamp(&value.at)),
            of: value.metadata.map(|payload| match payload {
                MetadataPayload::Info(info) => Of::Info(Info {
                    message: serde_json::to_string(&info).unwrap(),
                    ..Default::default()
                }),
                MetadataPayload::Error(error) => Of::Error(Error {
                    message: serde_json::to_string(&error).unwrap(),
                    ..Default::default()
                }),
            }),
            ..Default::default()
        })
    }
}

fn to_timestamp(datetime: &DateTime<Utc>) -> Timestamp {
    let mut timestamp = Timestamp::new();
    timestamp.seconds = datetime.timestamp();
    timestamp.nanos = datetime.timestamp_subsec_nanos() as i32;

    timestamp
}

fn to_datetime_utc(time: &Timestamp) -> Result<DateTime<Utc>> {
    if let Some(converted) = DateTime::from_timestamp(time.seconds, time.nanos as u32) {
        return Ok(converted);
    }

    bail!("Cannot convert timestamp: {:?}", time);
}

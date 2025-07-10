// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::{bail, Context, Ok, Result};
use chrono::{DateTime, Utc};
use protobuf::{
    well_known_types::{
        struct_::{self, Struct},
        timestamp::Timestamp,
    },
    MessageField,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::{
    protocol::{
        events::{Event, SaveFailed, SaveResolved, SaveRetry},
        metadata::{metadata::Of, Error, Info, Metadata},
    },
    run::{LogLevel, Operation, OperationEvent, RunResult, SavedValue},
};

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
                Of::Log(log) => {
                    return Ok(Operation {
                        at,
                        event: OperationEvent::Log {
                            id: log.id,
                            payload: serde_json::from_str(&log.json_payload)?,
                            level: log.level.try_into()?,
                        },
                    })
                }
            }
        }

        bail!("Fatal: cannot convert from event {:?}", event)
    }
}

impl TryFrom<Operation> for Event {
    type Error = anyhow::Error;
    fn try_from(operation: Operation) -> Result<Event> {
        use crate::protocol::events::event::Of;
        use crate::protocol::events::save::Of::{Failed, Resolved, Retry};
        use crate::protocol::events::{stop, Event, Log, Save, Send, Sleep, Start, Stop};

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
            OperationEvent::Log { id, payload, level } => {
                let log = Log {
                    id,
                    json_payload: serde_json::to_string(&payload)?,
                    level: level.into(),
                    ..Default::default()
                };

                Ok(Event {
                    at: MessageField::some(at),
                    of: Some(Of::Log(log)),
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

impl From<LogLevel> for u32 {
    fn from(value: LogLevel) -> Self {
        match value {
            LogLevel::Info => 0,
            LogLevel::Warn => 5,
            LogLevel::Error => 10,
        }
    }
}

impl TryFrom<u32> for LogLevel {
    type Error = anyhow::Error;
    fn try_from(value: u32) -> anyhow::Result<Self> {
        Ok(match value {
            0 => LogLevel::Info,
            5 => LogLevel::Warn,
            10 => LogLevel::Error,
            _ => anyhow::bail!("Unknown log level {value:?}"),
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

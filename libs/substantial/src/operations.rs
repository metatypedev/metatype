use std::collections::HashMap;

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

use crate::{
    backends::Backend,
    protocol::events::{Event, Records},
};

#[derive(Serialize, Deserialize, Clone)]
pub enum RunResult {
    Ok(serde_json::Value),
    Err(serde_json::Value),
}

/// Each Operation will be recovered from typescript
#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum OperationEvent {
    Sleep {
        id: u32,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
    },
    Save {
        id: u32,
        value: serde_json::Value,
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

#[derive(Serialize, Deserialize, Clone)]
pub struct Operation {
    at: DateTime<Utc>,
    event: OperationEvent,
}

/// A Run is a set of operations
///
/// Each operation is produced from the workflow execution
#[derive(Serialize, Deserialize, Clone)]
pub struct Run {
    pub run_id: String,
    operations: Vec<Operation>,
}

impl Run {
    pub fn new(run_id: String) -> Self {
        Self {
            run_id,
            operations: vec![],
        }
    }

    pub fn init_from(&mut self, backend: &dyn Backend) -> Result<()> {
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

    pub fn materialize_into(&self, backend: &dyn Backend) -> Result<()> {
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

    pub fn push_op(&mut self, operation: Operation) {
        self.operations.push(operation);
    }

    pub fn reset(&mut self) {
        self.operations = vec![];
    }
}

impl TryFrom<Event> for Operation {
    type Error = anyhow::Error;
    fn try_from(event: Event) -> Result<Self> {
        use crate::protocol::events::event::Of;
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
                                .with_context(|| format!("Get value from kwargs {k:?}"))?;
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
                    let raw_value = save.clone().value;
                    let value = serde_json::from_str(&raw_value)?;
                    return Ok(Operation {
                        at,
                        event: OperationEvent::Save { id: save.id, value },
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

        bail!("cannot convert from event {event:?}")
    }
}

impl TryFrom<Operation> for Event {
    type Error = anyhow::Error;
    fn try_from(operation: Operation) -> Result<Event> {
        use crate::protocol::events::event::Of;
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
                    value: serde_json::to_string(&value)?,
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
    bail!("Cannot convert timestamp: {time:?}");
}

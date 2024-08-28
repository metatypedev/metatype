use std::collections::HashMap;

use anyhow::{bail, Context, Ok, Result};
use chrono::{DateTime, Utc};
use protobuf::{
    well_known_types::struct_::{self, Struct},
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
pub enum Operation {
    Sleep {
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

    pub fn init_from(&mut self, backend: Box<dyn Backend>) -> Result<()> {
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

    pub fn materialize_into(&self, backend: Box<dyn Backend>) -> Result<()> {
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

                    return Ok(Operation::Start { kwargs });
                }
                Of::Stop(stop) => {
                    if let Some(result) = stop.result {
                        let result = match result {
                            stop::Result::Ok(value) => RunResult::Ok(serde_json::from_str(&value)?),
                            stop::Result::Err(e) => RunResult::Err(serde_json::from_str(&e)?),
                        };
                        return Ok(Operation::Stop {
                            result: Some(result),
                        });
                    }
                    return Ok(Operation::Stop { result: None });
                }
                Of::Save(save) => {
                    let raw_value = save.clone().value;
                    let value = serde_json::from_str(&raw_value)?;
                    return Ok(Operation::Save { id: save.id, value });
                }
                Of::Send(send) => {
                    let raw_value = send.clone().value;
                    let value = serde_json::from_str(&raw_value)?;
                    let event_name = send.name.clone();

                    return Ok(Operation::Send { event_name, value });
                }
                Of::Sleep(sleep) => {
                    let start = sleep.start.clone();
                    let end = sleep.end.clone();

                    return Ok(Operation::Sleep {
                        start: DateTime::from_timestamp_nanos(start.nanos.into()),
                        end: DateTime::from_timestamp_nanos(end.nanos.into()),
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
        use crate::protocol::events::{stop, Event, Save, Start, Stop};

        match operation {
            Operation::Start { kwargs } => {
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
                    of: Some(Of::Start(start)),
                    ..Default::default()
                })
            }
            Operation::Stop { result } => {
                let stop_result = match result {
                    Some(res) => Some(match res {
                        RunResult::Ok(value) => stop::Result::Ok(serde_json::from_value(value)?),
                        RunResult::Err(err) => stop::Result::Err(serde_json::from_value(err)?),
                    }),
                    None => None,
                };

                let stop = Stop {
                    result: stop_result,
                    ..Default::default()
                };

                Ok(Event {
                    of: Some(Of::Stop(stop)),
                    ..Default::default()
                })
            }
            Operation::Save { id, value } => {
                let save = Save {
                    id,
                    value: serde_json::to_string(&value)?,
                    ..Default::default()
                };

                Ok(Event {
                    of: Some(Of::Save(save)),
                    ..Default::default()
                })
            }
            // Operation::Sleep { start, end } => {
            //     // TODO: normalize
            //     // Timestamp::from(..);
            //     let sleep = Sleep {
            //         id,
            //         start: start.timestamp_nanos(),
            //         end: end.timestamp_nanos(),
            //         ..Default::default()
            //     };

            //     Ok(Event {
            //         of: Some(Of::Sleep(sleep)),
            //         ..Default::default()
            //     })
            // }
            // Operation::Send { event_name, value } => {
            //     let send = Send {
            //         name: event_name,
            //         value: serde_json::to_string(&value)?,
            //         ..Default::default()
            //     };

            //     Ok(Event {
            //         of: Some(Of::Send(send)),
            //         ..Default::default()
            //     })
            // }
            // Operation::Compensate => {
            //     unimplemented!()
            // }
            _ => unimplemented!(),
        }
    }
}

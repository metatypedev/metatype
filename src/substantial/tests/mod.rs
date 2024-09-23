#[cfg(test)]
mod tests {
    use substantial::{
        backends::{memory::MemoryBackend, Backend},
        protocol::events::Records,
    };

    #[test]
    fn test_write_and_read_events() {
        let backend = MemoryBackend::new();
        let run_id = "test_run".to_string();

        let records = Records::new();

        backend
            .write_events(run_id.clone(), records.clone())
            .unwrap();

        let read_records = backend.read_events(run_id).unwrap().unwrap();

        assert_eq!(read_records, records);
    }

    // #[test]
    // fn test_append_and_read_metadata() {
    //     let backend = MemoryBackend::new();
    //     let run_id = "test_run".to_string();
    //     let schedule = Utc.ymd(2024, 8, 20).and_hms(12, 0, 0);
    //     let content = "test metadata".to_string();

    //     backend
    //         .append_metadata(run_id.clone(), schedule, content.clone())
    //         .unwrap();

    //     let metadata = backend.read_all_metadata(run_id).unwrap();

    //     assert_eq!(metadata.len(), 1);
    // }
}

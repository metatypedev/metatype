use std::{borrow::Cow, collections::HashMap, path::Path};

pub struct MdkTemplate {
    pub entries: HashMap<&'static str, Cow<'static, str>>,
}

impl MdkTemplate {
    pub fn new(
        default_template: &[(&'static str, &'static str)],
        override_path: Option<&Path>,
    ) -> Self {
        let entries = default_template
            .iter()
            .map(
                |(file_name, content)| -> (&'static str, Cow<'static, str>) {
                    (file_name, {
                        if let Some(override_path) = override_path {
                            let path = override_path.join(file_name);
                            if path.exists() {
                                // async or sync?
                                std::fs::read_to_string(path).unwrap().into()
                            } else {
                                Cow::Borrowed(content)
                            }
                        } else {
                            Cow::Borrowed(content)
                        }
                    })
                },
            )
            .collect();
        Self { entries }
    }

    #[allow(unused)]
    pub fn dump_default_template(dir: &Path, default_template: &[(&'static str, &'static str)]) {
        for (file_name, content) in default_template {
            let path = dir.join(file_name);
            std::fs::write(path, content).unwrap();
        }
    }
}

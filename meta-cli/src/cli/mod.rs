use anyhow::Result;

pub mod deploy;
pub mod dev;
pub mod prisma;
pub mod serialize;

pub trait Action {
    fn run(&self, dir: String) -> Result<()>;
}

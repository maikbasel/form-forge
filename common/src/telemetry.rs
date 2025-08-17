use anyhow::{Context, Result};
use tracing::Level;
use tracing_subscriber::FmtSubscriber;

pub fn initialize() -> Result<()> {
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::DEBUG) // TODO: Make configurable
        .with_test_writer()
        .finish();

    tracing::subscriber::set_global_default(subscriber)
        .context("failed to setup global tracing subscriber")?;

    Ok(())
}

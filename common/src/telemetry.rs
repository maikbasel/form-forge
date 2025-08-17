use std::sync::OnceLock;
use anyhow::{Context, Result};
use tracing::Level;
use tracing_subscriber::FmtSubscriber;

static TELEMETRY: OnceLock<()> = OnceLock::new();

pub fn initialize() -> Result<()> {
    TELEMETRY.get_or_init(|| {
        let subscriber = FmtSubscriber::builder()
            .with_max_level(Level::DEBUG) // TODO: Make configurable
            .with_test_writer()
            .finish();

        tracing::subscriber::set_global_default(subscriber)
            .context("failed to setup global tracing subscriber")
            .expect("telemetry initialization failed");
    });

    Ok(())

}

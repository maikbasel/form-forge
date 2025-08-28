use anyhow::{Context, Result};
use std::sync::OnceLock;
use tracing::Level;
use tracing_subscriber::{EnvFilter, FmtSubscriber};

static TELEMETRY: OnceLock<()> = OnceLock::new();

pub fn initialize() -> Result<()> {
    TELEMETRY.get_or_init(|| {
        let env_filter =
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("debug"));

        let subscriber = FmtSubscriber::builder()
            .with_max_level(Level::DEBUG) // TODO: Make configurable
            .with_test_writer()
            .with_env_filter(env_filter)
            .finish();

        tracing::subscriber::set_global_default(subscriber)
            .context("failed to setup global tracing subscriber")
            .expect("telemetry initialization failed");
    });

    Ok(())
}

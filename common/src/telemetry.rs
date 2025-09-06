use anyhow::{Context, Result};
use std::sync::OnceLock;
use tracing::Level;
use tracing_subscriber::{EnvFilter, FmtSubscriber, fmt::time::UtcTime};

static TELEMETRY: OnceLock<()> = OnceLock::new();

pub fn initialize() -> Result<()> {
    TELEMETRY.get_or_init(|| {
        let env_filter =
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

        let subscriber = FmtSubscriber::builder()
            .with_max_level(Level::INFO)
            .with_env_filter(env_filter)
            .with_test_writer()
            .json()
            .with_current_span(true)
            .with_span_list(true)
            .with_file(false)
            .with_line_number(false)
            .with_target(true)
            .with_ansi(false)
            .with_timer(UtcTime::rfc_3339())
            .finish();

        tracing::subscriber::set_global_default(subscriber)
            .context("failed to setup global tracing subscriber")
            .expect("telemetry initialization failed");
    });

    Ok(())
}

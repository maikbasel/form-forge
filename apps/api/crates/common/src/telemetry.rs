use anyhow::Result;
use std::sync::OnceLock;
use tracing::Level;
use tracing_subscriber::{
    EnvFilter, fmt::time::UtcTime, layer::SubscriberExt, util::SubscriberInitExt,
};

static TELEMETRY: OnceLock<()> = OnceLock::new();

#[cfg(feature = "otel")]
mod otel {
    use anyhow::{Context, Result};
    use opentelemetry::{KeyValue, trace::TracerProvider as _};
    use opentelemetry_otlp::{LogExporter, MetricExporter, SpanExporter};
    use opentelemetry_sdk::{
        Resource,
        logs::LoggerProvider,
        metrics::{PeriodicReader, SdkMeterProvider},
        runtime,
        trace::TracerProvider,
    };
    use std::{env, sync::OnceLock, time::Duration};
    use tracing::info;

    static TRACER_PROVIDER: OnceLock<TracerProvider> = OnceLock::new();
    static METER_PROVIDER: OnceLock<SdkMeterProvider> = OnceLock::new();
    static LOGGER_PROVIDER: OnceLock<LoggerProvider> = OnceLock::new();

    pub struct OtelConfig {
        pub endpoint: String,
        pub service_name: String,
    }

    impl OtelConfig {
        pub fn from_env() -> Option<Self> {
            let endpoint = env::var("OTEL_EXPORTER_OTLP_ENDPOINT").ok()?;
            if endpoint.is_empty() {
                return None;
            }
            let service_name =
                env::var("OTEL_SERVICE_NAME").unwrap_or_else(|_| "form-forge-api".to_string());
            Some(Self {
                endpoint,
                service_name,
            })
        }
    }

    fn build_resource(service_name: &str) -> Resource {
        Resource::new([KeyValue::new("service.name", service_name.to_string())])
    }

    fn init_tracer_provider(resource: Resource) -> Result<TracerProvider> {
        let exporter = SpanExporter::builder()
            .with_http()
            .build()
            .context("failed to create OTLP span exporter")?;

        let provider = TracerProvider::builder()
            .with_batch_exporter(exporter, runtime::Tokio)
            .with_resource(resource)
            .build();

        Ok(provider)
    }

    fn init_meter_provider(resource: Resource) -> Result<SdkMeterProvider> {
        let exporter = MetricExporter::builder()
            .with_http()
            .build()
            .context("failed to create OTLP metric exporter")?;

        let reader = PeriodicReader::builder(exporter, runtime::Tokio)
            .with_interval(Duration::from_secs(60))
            .build();

        let provider = SdkMeterProvider::builder()
            .with_reader(reader)
            .with_resource(resource)
            .build();

        Ok(provider)
    }

    fn init_logger_provider(resource: Resource) -> Result<LoggerProvider> {
        let exporter = LogExporter::builder()
            .with_http()
            .build()
            .context("failed to create OTLP log exporter")?;

        let provider = LoggerProvider::builder()
            .with_batch_exporter(exporter, runtime::Tokio)
            .with_resource(resource)
            .build();

        Ok(provider)
    }

    pub fn create_otel_layers<S>(
        config: &OtelConfig,
    ) -> Result<(
        tracing_opentelemetry::OpenTelemetryLayer<S, opentelemetry_sdk::trace::Tracer>,
        opentelemetry_appender_tracing::layer::OpenTelemetryTracingBridge<
            opentelemetry_sdk::logs::LoggerProvider,
            opentelemetry_sdk::logs::Logger,
        >,
    )>
    where
        S: tracing::Subscriber + for<'span> tracing_subscriber::registry::LookupSpan<'span>,
    {
        let resource = build_resource(&config.service_name);

        let tracer_provider = init_tracer_provider(resource.clone())?;
        let tracer = tracer_provider.tracer("form-forge-api");

        let meter_provider = init_meter_provider(resource.clone())?;
        opentelemetry::global::set_meter_provider(meter_provider.clone());

        let logger_provider = init_logger_provider(resource)?;
        let logs_layer = opentelemetry_appender_tracing::layer::OpenTelemetryTracingBridge::new(
            &logger_provider,
        );

        TRACER_PROVIDER
            .set(tracer_provider)
            .expect("tracer provider already set");
        METER_PROVIDER
            .set(meter_provider)
            .expect("meter provider already set");
        LOGGER_PROVIDER
            .set(logger_provider)
            .expect("logger provider already set");

        info!(
            endpoint = %config.endpoint,
            service = %config.service_name,
            "OpenTelemetry tracing and log export enabled"
        );

        Ok((
            tracing_opentelemetry::layer().with_tracer(tracer),
            logs_layer,
        ))
    }

    pub fn shutdown() {
        if let Some(tracer_provider) = TRACER_PROVIDER.get()
            && let Err(e) = tracer_provider.shutdown()
        {
            tracing::error!(error = %e, "failed to shutdown tracer provider");
        }
        if let Some(meter_provider) = METER_PROVIDER.get()
            && let Err(e) = meter_provider.shutdown()
        {
            tracing::error!(error = %e, "failed to shutdown meter provider");
        }
        if let Some(logger_provider) = LOGGER_PROVIDER.get()
            && let Err(e) = logger_provider.shutdown()
        {
            tracing::error!(error = %e, "failed to shutdown logger provider");
        }
    }
}

pub fn initialize() -> Result<()> {
    TELEMETRY.get_or_init(|| {
        let env_filter =
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

        // Build the base formatting layer
        let fmt_layer = tracing_subscriber::fmt::layer()
            .with_target(true)
            .with_timer(UtcTime::rfc_3339());

        #[cfg(test)]
        let fmt_layer = fmt_layer.with_test_writer();

        // json-logs takes priority if both features are enabled
        #[cfg(feature = "json-logs")]
        let fmt_layer = fmt_layer
            .json()
            .with_current_span(true)
            .with_span_list(true)
            .with_file(false)
            .with_line_number(false)
            .with_ansi(false);

        #[cfg(all(feature = "pretty-logs", not(feature = "json-logs")))]
        let fmt_layer = fmt_layer
            .with_file(true)
            .with_line_number(true)
            .with_ansi(true)
            .pretty();

        // Build and initialize the subscriber based on enabled features
        #[cfg(feature = "otel")]
        {
            if let Some(config) = otel::OtelConfig::from_env() {
                match otel::create_otel_layers(&config) {
                    Ok((trace_layer, logs_layer)) => {
                        tracing_subscriber::registry()
                            .with(env_filter.add_directive(Level::INFO.into()))
                            .with(fmt_layer)
                            .with(trace_layer)
                            .with(logs_layer)
                            .init();
                    }
                    Err(e) => {
                        eprintln!("Failed to initialize OpenTelemetry: {e}");
                        tracing_subscriber::registry()
                            .with(env_filter.add_directive(Level::INFO.into()))
                            .with(fmt_layer)
                            .init();
                    }
                }
            } else {
                eprintln!("OpenTelemetry disabled: OTEL_EXPORTER_OTLP_ENDPOINT not set");
                tracing_subscriber::registry()
                    .with(env_filter.add_directive(Level::INFO.into()))
                    .with(fmt_layer)
                    .init();
            }
        }

        #[cfg(not(feature = "otel"))]
        {
            tracing_subscriber::registry()
                .with(env_filter.add_directive(Level::INFO.into()))
                .with(fmt_layer)
                .init();
        }
    });
    Ok(())
}

/// Gracefully shutdown telemetry providers.
/// Call this before application exit to flush pending traces and metrics.
pub fn shutdown() {
    #[cfg(feature = "otel")]
    otel::shutdown();
}

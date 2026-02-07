use anyhow::{Context, Result};
use form_forge_api::openapi::ApiDoc;
use std::fs;
use std::path::PathBuf;
use utoipa::OpenApi;

fn main() -> Result<()> {
    // Generate OpenAPI spec
    let openapi = ApiDoc::openapi();

    // Convert to YAML (more human-readable than JSON)
    let yaml =
        serde_yaml::to_string(&openapi).context("Failed to serialize OpenAPI spec to YAML")?;

    // Determine output path
    // Default: workspace_root/packages/api-spec/openapi.yaml
    let output_path = std::env::args()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/api-spec/openapi.yaml")
        });

    // Ensure parent directory exists
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create directory: {}", parent.display()))?;
    }

    // Write to file
    fs::write(&output_path, yaml)
        .with_context(|| format!("Failed to write OpenAPI spec to: {}", output_path.display()))?;

    println!("✅ OpenAPI spec written to: {}", output_path.display());

    Ok(())
}

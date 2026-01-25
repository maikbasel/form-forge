use anyhow::Result;
use std::env;

#[derive(Debug, Clone)]
pub struct S3Config {
    pub endpoint: String,
    /// Public endpoint for pre-signed URLs (defaults to internal endpoint for dev).
    pub public_endpoint: String,
    pub bucket: String,
    pub access_key: String,
    pub secret_key: String,
    pub region: String,
}

impl S3Config {
    pub fn initialize() -> Result<Self> {
        let endpoint =
            env::var("S3_ENDPOINT").unwrap_or_else(|_| "http://localhost:9000".to_string());
        // Public endpoint for pre-signed URLs (defaults to internal endpoint for dev)
        let public_endpoint = env::var("S3_PUBLIC_ENDPOINT").unwrap_or_else(|_| endpoint.clone());
        let bucket = env::var("S3_BUCKET").unwrap_or_else(|_| "form-forge".to_string());
        // Default to RustFS development credentials
        let access_key = env::var("S3_ACCESS_KEY").unwrap_or_else(|_| "rustfsadmin".to_string());
        let secret_key = env::var("S3_SECRET_KEY").unwrap_or_else(|_| "rustfsadmin".to_string());
        let region = env::var("S3_REGION").unwrap_or_else(|_| "us-east-1".to_string());

        Ok(Self {
            endpoint,
            public_endpoint,
            bucket,
            access_key,
            secret_key,
            region,
        })
    }
}

use anyhow::Result;
use std::env;
use url::Url;

#[derive(Debug, Clone)]
pub struct S3Config {
    pub endpoint: String,
    /// Public endpoint for pre-signed URLs (scheme + authority only, no path prefix).
    pub public_endpoint: String,
    /// Path prefix extracted from `S3_PUBLIC_ENDPOINT` (e.g. `/s3`), empty when
    /// the public URL has no path component beyond `/`.
    pub public_path_prefix: String,
    pub bucket: String,
    pub access_key: String,
    pub secret_key: String,
    pub region: String,
}

impl S3Config {
    pub fn initialize() -> Result<Self> {
        let endpoint =
            env::var("S3_ENDPOINT").unwrap_or_else(|_| "http://localhost:9000".to_string());
        let raw_public = env::var("S3_PUBLIC_ENDPOINT").unwrap_or_else(|_| endpoint.clone());
        let (public_endpoint, public_path_prefix) = Self::parse_public_endpoint(&raw_public)?;
        let bucket = env::var("S3_BUCKET").unwrap_or_else(|_| "form-forge".to_string());
        // Default to RustFS development credentials
        let access_key = env::var("S3_ACCESS_KEY").unwrap_or_else(|_| "rustfsadmin".to_string());
        let secret_key = env::var("S3_SECRET_KEY").unwrap_or_else(|_| "rustfsadmin".to_string());
        let region = env::var("S3_REGION").unwrap_or_else(|_| "us-east-1".to_string());

        Ok(Self {
            endpoint,
            public_endpoint,
            public_path_prefix,
            bucket,
            access_key,
            secret_key,
            region,
        })
    }

    /// Split a URL into its base (scheme + authority + trailing slash) and any
    /// path prefix (without trailing slash). The base is suitable for the AWS
    /// SDK `endpoint_url` while the prefix must be re-inserted into presigned
    /// URLs after signing.
    pub fn parse_public_endpoint(raw: &str) -> Result<(String, String)> {
        let parsed = Url::parse(raw)?;
        let base = format!("{}://{}/", parsed.scheme(), parsed.authority());
        let prefix = parsed.path().trim_end_matches('/').to_string();
        Ok((base, prefix))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn should_parse_public_endpoint_no_path() {
        let (base, prefix) = S3Config::parse_public_endpoint("http://localhost:9000").unwrap();
        assert_eq!(base, "http://localhost:9000/");
        assert_eq!(prefix, "");
    }

    #[test]
    fn should_parse_public_endpoint_trailing_slash_only() {
        let (base, prefix) = S3Config::parse_public_endpoint("http://localhost:9000/").unwrap();
        assert_eq!(base, "http://localhost:9000/");
        assert_eq!(prefix, "");
    }

    #[test]
    fn should_parse_public_endpoint_with_path_prefix_trailing_slash() {
        let (base, prefix) = S3Config::parse_public_endpoint("https://domain.com/s3/").unwrap();
        assert_eq!(base, "https://domain.com/");
        assert_eq!(prefix, "/s3");
    }

    #[test]
    fn should_parse_public_endpoint_with_path_prefix_no_trailing_slash() {
        let (base, prefix) = S3Config::parse_public_endpoint("https://domain.com/s3").unwrap();
        assert_eq!(base, "https://domain.com/");
        assert_eq!(prefix, "/s3");
    }

    #[test]
    fn should_parse_public_endpoint_subdomain_no_path() {
        let (base, prefix) = S3Config::parse_public_endpoint("https://s3.domain.com/").unwrap();
        assert_eq!(base, "https://s3.domain.com/");
        assert_eq!(prefix, "");
    }

    #[test]
    fn should_parse_public_endpoint_port_and_path() {
        let (base, prefix) =
            S3Config::parse_public_endpoint("https://domain.com:8443/minio/").unwrap();
        assert_eq!(base, "https://domain.com:8443/");
        assert_eq!(prefix, "/minio");
    }
}

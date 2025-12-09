use anyhow::Result;

#[derive(Clone, Debug)]
pub struct DatabaseConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: String,
    pub database: String,
    pub max_connections: u32,
}

impl DatabaseConfig {
    pub fn new(
        host: impl Into<String>,
        port: u16,
        user: impl Into<String>,
        password: impl Into<String>,
        database: impl Into<String>,
        max_connections: u32,
    ) -> Self {
        let host = host.into();
        let user = user.into();
        let password = password.into();
        let database = database.into();
        Self {
            host,
            port,
            user,
            password,
            database,
            max_connections,
        }
    }

    pub fn initialize() -> Result<Self> {
        let host = std::env::var("DB_HOST").unwrap_or_else(|_| "localhost".to_string());
        let port = std::env::var("DB_PORT")
            .unwrap_or_else(|_| "5434".to_string())
            .parse::<u16>()?;
        let user = std::env::var("DB_USER").unwrap_or_else(|_| "postgres".to_string());
        let password = std::env::var("DB_PASSWORD").unwrap_or_else(|_| "postgres".to_string());
        let database = std::env::var("DB_NAME").unwrap_or_else(|_| "form-forge".to_string());
        let max_connections = std::env::var("DB_MAX_CONNECTIONS")
            .unwrap_or_else(|_| "5".to_string())
            .parse::<u32>()?;

        Ok(Self::new(
            host,
            port,
            user,
            password,
            database,
            max_connections,
        ))
    }
}

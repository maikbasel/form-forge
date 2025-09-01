use anyhow::Result;

#[derive(Clone, Debug)]
pub struct DatabaseConfig {
    pub host: String,
    pub user: String,
    pub password: String,
    pub database: String,
    pub max_connections: u32,
}

impl DatabaseConfig {
    pub fn new(
        host: impl Into<String>,
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
            user,
            password,
            database,
            max_connections,
        }
    }

    pub fn initialize() -> Result<Self> {
        let host = "localhost";
        let user = "postgres";
        let password = "postgres";
        let database = "form-forge";
        let max_connections = 5;

        Ok(Self::new(host, user, password, database, max_connections))
    }
}

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use libsql::{Connection, Database, params};
use sheets_core::error::SheetError;
use sheets_core::ports::driven::{FailedSheetDeletionPort, SheetReferencePort};
use sheets_core::sheet::{FailedSheetDeletion, SheetReference};
use std::path::PathBuf;
use tracing::{info, instrument};
use uuid::Uuid;

const CREATE_TABLES_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS sheet_reference (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    name TEXT NOT NULL,
    extension TEXT,
    path TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS failed_sheet_deletions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    sheet_id TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_retry_at TEXT
);
"#;

pub struct SheetReferenceLibSql {
    db: Database,
}

impl SheetReferenceLibSql {
    pub async fn new(db_path: PathBuf) -> anyhow::Result<Self> {
        if let Some(parent) = db_path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        let db = libsql::Builder::new_local(db_path).build().await?;
        let conn = db.connect()?;

        conn.execute_batch(CREATE_TABLES_SQL).await?;

        Ok(Self { db })
    }

    fn conn(&self) -> Result<Connection, SheetError> {
        self.db
            .connect()
            .map_err(|e| SheetError::DatabaseError(e.into()))
    }
}

#[async_trait]
impl SheetReferencePort for SheetReferenceLibSql {
    #[instrument(name = "libsql.create_reference", skip(self, sheet_reference), level = "info", fields(sheet_id = %sheet_reference.id))]
    async fn create(&self, sheet_reference: &SheetReference) -> Result<(), SheetError> {
        let conn = self.conn()?;
        let path = sheet_reference
            .path
            .to_str()
            .ok_or(SheetError::InvalidFilePath)?;

        conn.execute(
            "INSERT INTO sheet_reference (id, original_name, name, extension, path) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                sheet_reference.id.to_string(),
                sheet_reference.original_name.clone(),
                sheet_reference.name.clone(),
                sheet_reference.extension.clone(),
                path.to_string(),
            ],
        )
        .await
        .map_err(|e| SheetError::DatabaseError(e.into()))?;

        Ok(())
    }

    #[instrument(name = "libsql.find_by_id", skip(self, sheet_id), level = "info", fields(%sheet_id))]
    async fn find_by_id(&self, sheet_id: &Uuid) -> Result<SheetReference, SheetError> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "SELECT id, original_name, name, extension, path FROM sheet_reference WHERE id = ?1",
                params![sheet_id.to_string()],
            )
            .await
            .map_err(|e| SheetError::DatabaseError(e.into()))?;

        let row = rows
            .next()
            .await
            .map_err(|e| SheetError::DatabaseError(e.into()))?
            .ok_or(SheetError::NotFound(sheet_id.to_string()))?;

        let id: String = row.get(0).map_err(|e| SheetError::DatabaseError(e.into()))?;
        let original_name: String = row.get(1).map_err(|e| SheetError::DatabaseError(e.into()))?;
        let name: String = row.get(2).map_err(|e| SheetError::DatabaseError(e.into()))?;
        let extension: Option<String> = row.get(3).ok();
        let path: String = row.get(4).map_err(|e| SheetError::DatabaseError(e.into()))?;

        let uuid = Uuid::parse_str(&id)
            .map_err(|e| SheetError::DatabaseError(anyhow::anyhow!("invalid UUID: {}", e)))?;

        Ok(SheetReference::new(
            uuid,
            original_name,
            name,
            extension,
            PathBuf::from(path),
        ))
    }

    #[instrument(name = "libsql.delete_reference", skip(self), level = "info", fields(%sheet_id))]
    async fn delete(&self, sheet_id: &Uuid) -> Result<(), SheetError> {
        let conn = self.conn()?;

        conn.execute(
            "DELETE FROM sheet_reference WHERE id = ?1",
            params![sheet_id.to_string()],
        )
        .await
        .map_err(|e| SheetError::DatabaseError(e.into()))?;

        info!(%sheet_id, "deleted sheet reference");
        Ok(())
    }

    #[instrument(name = "libsql.find_older_than", skip(self), level = "info")]
    async fn find_older_than(
        &self,
        before: DateTime<Utc>,
    ) -> Result<Vec<SheetReference>, SheetError> {
        let conn = self.conn()?;
        let before_str = before.format("%Y-%m-%dT%H:%M:%S").to_string();

        let mut rows = conn
            .query(
                "SELECT id, original_name, name, extension, path FROM sheet_reference WHERE created_at < ?1 ORDER BY created_at ASC",
                params![before_str],
            )
            .await
            .map_err(|e| SheetError::DatabaseError(e.into()))?;

        let mut refs = Vec::new();
        while let Some(row) = rows
            .next()
            .await
            .map_err(|e| SheetError::DatabaseError(e.into()))?
        {
            let id: String = row.get(0).map_err(|e| SheetError::DatabaseError(e.into()))?;
            let original_name: String =
                row.get(1).map_err(|e| SheetError::DatabaseError(e.into()))?;
            let name: String = row.get(2).map_err(|e| SheetError::DatabaseError(e.into()))?;
            let extension: Option<String> = row.get(3).ok();
            let path: String = row.get(4).map_err(|e| SheetError::DatabaseError(e.into()))?;

            let uuid = Uuid::parse_str(&id)
                .map_err(|e| SheetError::DatabaseError(anyhow::anyhow!("invalid UUID: {}", e)))?;

            refs.push(SheetReference::new(
                uuid,
                original_name,
                name,
                extension,
                PathBuf::from(path),
            ));
        }

        Ok(refs)
    }
}

#[async_trait]
impl actions_core::ports::driven::SheetReferencePort for SheetReferenceLibSql {
    #[instrument(name = "libsql.find_by_id.action_port", skip(self, id), level = "info", err, fields(%id))]
    async fn find_by_id(
        &self,
        id: &Uuid,
    ) -> Result<actions_core::ports::driven::SheetReference, actions_core::error::ActionError> {
        <SheetReferenceLibSql as SheetReferencePort>::find_by_id(self, id)
            .await
            .map(|s| actions_core::ports::driven::SheetReference::new(s.id, s.path))
            .map_err(|_| actions_core::error::ActionError::NotFound(*id))
    }
}

/// No-op implementation for desktop — no S3 lifecycle to reconcile.
#[async_trait]
impl FailedSheetDeletionPort for SheetReferenceLibSql {
    async fn record_failure(
        &self,
        _sheet_id: &Uuid,
        _s3_key: &str,
        _error_message: &str,
    ) -> Result<(), SheetError> {
        Ok(())
    }

    async fn get_pending_failures(
        &self,
        _max_retry_count: i32,
        _limit: i64,
    ) -> Result<Vec<FailedSheetDeletion>, SheetError> {
        Ok(Vec::new())
    }

    async fn increment_retry(&self, _id: &Uuid) -> Result<(), SheetError> {
        Ok(())
    }

    async fn remove(&self, _id: &Uuid) -> Result<(), SheetError> {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sheets_core::ports::driven::SheetReferencePort;

    async fn setup_db() -> SheetReferenceLibSql {
        let tmp = tempfile::tempdir().unwrap();
        let db_path = tmp.path().join("test.db");
        // Leak the tempdir so it survives the test
        std::mem::forget(tmp);
        SheetReferenceLibSql::new(db_path).await.unwrap()
    }

    #[tokio::test]
    async fn test_create_and_find_by_id() {
        let db = setup_db().await;
        let id = Uuid::new_v4();
        let sheet_ref = SheetReference::new(id, "test", "abc123", Some("pdf"), PathBuf::from("/tmp/test.pdf"));

        db.create(&sheet_ref).await.unwrap();
        let found = db.find_by_id(&id).await.unwrap();

        assert_eq!(found.id, id);
        assert_eq!(found.original_name, "test");
        assert_eq!(found.name, "abc123");
        assert_eq!(found.extension, Some("pdf".to_string()));
        assert_eq!(found.path, PathBuf::from("/tmp/test.pdf"));
    }

    #[tokio::test]
    async fn test_find_by_id_not_found() {
        let db = setup_db().await;
        let result = db.find_by_id(&Uuid::new_v4()).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_delete() {
        let db = setup_db().await;
        let id = Uuid::new_v4();
        let sheet_ref = SheetReference::new(id, "test", "abc123", Some("pdf"), PathBuf::from("/tmp/test.pdf"));

        db.create(&sheet_ref).await.unwrap();
        db.delete(&id).await.unwrap();

        let result = db.find_by_id(&id).await;
        assert!(result.is_err());
    }
}

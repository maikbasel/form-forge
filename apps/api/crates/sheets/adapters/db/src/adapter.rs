use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sheets_core::error::SheetError;
use sheets_core::ports::driven::{FailedSheetDeletionPort, SheetReferencePort};
use sheets_core::sheet::{FailedSheetDeletion, SheetReference};
use sqlx::types::Uuid;
use sqlx::{FromRow, Pool, Postgres};
use std::path::PathBuf;
use tracing::{info, instrument};

#[derive(FromRow)]
struct SheetReferenceRow {
    id: Uuid,
    original_name: String,
    name: String,
    extension: Option<String>,
    path: String,
}

impl From<SheetReferenceRow> for SheetReference {
    fn from(row: SheetReferenceRow) -> Self {
        SheetReference::new(
            row.id,
            row.original_name,
            row.name,
            row.extension,
            PathBuf::from(row.path),
        )
    }
}

pub struct SheetReferenceDb {
    pool: Pool<Postgres>,
}

impl SheetReferenceDb {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl SheetReferencePort for SheetReferenceDb {
    #[instrument(name = "db.create_reference", skip(self, sheet_reference), level = "info", fields(sheet_id = %sheet_reference.id))]
    async fn create(&self, sheet_reference: &SheetReference) -> Result<(), SheetError> {
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| SheetError::DatabaseError(e.into()))?;

        let path = sheet_reference
            .path
            .to_str()
            .ok_or(SheetError::InvalidFilePath)?;
        sqlx::query(
            r#"INSERT INTO sheet_reference (id, original_name, name, extension, path)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(sheet_reference.id)
        .bind(sheet_reference.original_name.clone())
        .bind(sheet_reference.name.clone())
        .bind(sheet_reference.extension.clone())
        .bind(path)
        .execute(&mut *tx)
        .await
        .map_err(|e| SheetError::DatabaseError(e.into()))?;

        tx.commit()
            .await
            .map_err(|e| SheetError::DatabaseError(e.into()))?;

        Ok(())
    }

    #[instrument(name = "db.find_by_id", skip(self, sheet_id), level = "info", fields(%sheet_id))]
    async fn find_by_id(&self, sheet_id: &Uuid) -> Result<SheetReference, SheetError> {
        let row: Option<SheetReferenceRow> = sqlx::query_as(
            r#"SELECT id, original_name, name, extension, path
           FROM sheet_reference WHERE id = $1"#,
        )
        .bind(sheet_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| SheetError::DatabaseError(e.into()))?;

        match row {
            Some(row) => Ok(row.into()),
            None => Err(SheetError::NotFound(sheet_id.to_string())),
        }
    }

    #[instrument(name = "db.delete_reference", skip(self), level = "info", fields(%sheet_id))]
    async fn delete(&self, sheet_id: &Uuid) -> Result<(), SheetError> {
        sqlx::query("DELETE FROM sheet_reference WHERE id = $1")
            .bind(sheet_id)
            .execute(&self.pool)
            .await
            .map_err(|e| SheetError::DatabaseError(e.into()))?;

        info!(%sheet_id, "deleted sheet reference");
        Ok(())
    }

    #[instrument(name = "db.find_older_than", skip(self), level = "info")]
    async fn find_older_than(
        &self,
        before: DateTime<Utc>,
    ) -> Result<Vec<SheetReference>, SheetError> {
        let rows: Vec<SheetReferenceRow> = sqlx::query_as(
            r#"SELECT id, original_name, name, extension, path
               FROM sheet_reference
               WHERE created_at < $1
               ORDER BY created_at ASC"#,
        )
        .bind(before)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| SheetError::DatabaseError(e.into()))?;

        Ok(rows.into_iter().map(SheetReference::from).collect())
    }
}

#[async_trait]
impl actions_core::ports::driven::SheetReferencePort for SheetReferenceDb {
    #[instrument(name = "db.find_by_id.action_port", skip(self, id), level = "info", err, fields(%id))]
    async fn find_by_id(
        &self,
        id: &Uuid,
    ) -> Result<actions_core::ports::driven::SheetReference, actions_core::error::SheetError> {
        <SheetReferenceDb as SheetReferencePort>::find_by_id(self, id)
            .await
            .map(|s| actions_core::ports::driven::SheetReference::new(s.id, s.path))
            .map_err(|_| actions_core::error::ActionError::NotFound(*id))
    }
}

/// Database adapter for failed sheet deletion tracking (dead letter table).
pub struct FailedSheetDeletionDb {
    pool: Pool<Postgres>,
}

impl FailedSheetDeletionDb {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }
}

#[derive(FromRow)]
struct FailedSheetDeletionRow {
    id: Uuid,
    sheet_id: Uuid,
    s3_key: String,
    error_message: Option<String>,
    retry_count: i32,
    created_at: DateTime<Utc>,
    last_retry_at: Option<DateTime<Utc>>,
}

impl From<FailedSheetDeletionRow> for FailedSheetDeletion {
    fn from(row: FailedSheetDeletionRow) -> Self {
        FailedSheetDeletion::new(
            row.id,
            row.sheet_id,
            row.s3_key,
            row.error_message,
            row.retry_count,
            row.created_at,
            row.last_retry_at,
        )
    }
}

#[async_trait]
impl FailedSheetDeletionPort for FailedSheetDeletionDb {
    #[instrument(name = "db.record_failed_deletion", skip(self), level = "info", fields(%sheet_id))]
    async fn record_failure(
        &self,
        sheet_id: &Uuid,
        s3_key: &str,
        error_message: &str,
    ) -> Result<(), SheetError> {
        sqlx::query(
            r#"INSERT INTO failed_sheet_deletions (sheet_id, s3_key, error_message)
               VALUES ($1, $2, $3)
               ON CONFLICT DO NOTHING"#,
        )
        .bind(sheet_id)
        .bind(s3_key)
        .bind(error_message)
        .execute(&self.pool)
        .await
        .map_err(|e| SheetError::DatabaseError(e.into()))?;

        Ok(())
    }

    #[instrument(name = "db.get_pending_failures", skip(self), level = "info")]
    async fn get_pending_failures(
        &self,
        max_retry_count: i32,
        limit: i64,
    ) -> Result<Vec<FailedSheetDeletion>, SheetError> {
        let rows: Vec<FailedSheetDeletionRow> = sqlx::query_as(
            r#"SELECT id, sheet_id, s3_key, error_message, retry_count, created_at, last_retry_at
               FROM failed_sheet_deletions
               WHERE retry_count < $1
               ORDER BY retry_count ASC, created_at ASC
               LIMIT $2"#,
        )
        .bind(max_retry_count)
        .bind(limit)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| SheetError::DatabaseError(e.into()))?;

        Ok(rows.into_iter().map(FailedSheetDeletion::from).collect())
    }

    #[instrument(name = "db.increment_retry", skip(self), level = "info", fields(%id))]
    async fn increment_retry(&self, id: &Uuid) -> Result<(), SheetError> {
        sqlx::query(
            r#"UPDATE failed_sheet_deletions
               SET retry_count = retry_count + 1, last_retry_at = now()
               WHERE id = $1"#,
        )
        .bind(id)
        .execute(&self.pool)
        .await
        .map_err(|e| SheetError::DatabaseError(e.into()))?;

        Ok(())
    }

    #[instrument(name = "db.remove_failure", skip(self), level = "info", fields(%id))]
    async fn remove(&self, id: &Uuid) -> Result<(), SheetError> {
        sqlx::query("DELETE FROM failed_sheet_deletions WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| SheetError::DatabaseError(e.into()))?;

        Ok(())
    }
}

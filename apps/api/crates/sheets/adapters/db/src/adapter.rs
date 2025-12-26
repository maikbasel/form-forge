use async_trait::async_trait;
use sheets_core::error::SheetError;
use sheets_core::ports::driven::SheetReferencePort;
use sheets_core::sheet::SheetReference;
use sqlx::types::Uuid;
use sqlx::{FromRow, Pool, Postgres};
use std::path::PathBuf;
use tracing::instrument;

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

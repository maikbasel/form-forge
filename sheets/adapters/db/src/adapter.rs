use async_trait::async_trait;
use sheets_core::error::SheetError;
use sheets_core::ports::driven::SheetReferencePort;
use sheets_core::sheet::SheetReference;
use sqlx::{Pool, Postgres};

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
}

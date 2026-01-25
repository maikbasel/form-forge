use crate::error::ApiError;
use actix_multipart::form::MultipartForm;
use actix_multipart::form::tempfile::TempFile;
use actix_web::http::header::{CACHE_CONTROL, LOCATION};
use actix_web::{HttpResponse, get, post, web};
use common::error::ApiErrorResponse;
use serde::{Deserialize, Serialize};
use sheets_core::ports::driving::{SheetCleanupPort, SheetService};
use sheets_core::sheet::{Sheet, SheetField, SheetReference};
use std::sync::Arc;
use tracing::{error, info, warn};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, MultipartForm, ToSchema)]
pub struct UploadSheetRequest {
    /// The PDF file to upload. Max size: 5MB.
    #[multipart(limit = "5MB")]
    #[schema(value_type = String, format = Binary, content_media_type = "application/pdf")]
    pub sheet: TempFile,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UploadSheetResponse {
    #[schema(value_type = String, format = "uuid", example = "123e4567-e89b-12d3-a456-426614174000"
    )]
    pub id: Uuid,
}

impl UploadSheetResponse {
    pub fn new(id: Uuid) -> Self {
        Self { id }
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SheetFieldDto {
    /// Name of the AcroForm field.
    name: String,
}

impl SheetFieldDto {
    pub fn new(name: impl Into<String>) -> Self {
        let name = name.into();
        Self { name }
    }
}

impl From<SheetField> for SheetFieldDto {
    fn from(value: SheetField) -> Self {
        SheetFieldDto::new(value.name)
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ListSheetFieldsResponse {
    /// List of interactive PDF AcroForm fields.
    pub fields: Vec<SheetFieldDto>,
}

impl ListSheetFieldsResponse {
    pub fn new(fields: Vec<SheetFieldDto>) -> Self {
        Self { fields }
    }
}

impl From<Vec<SheetField>> for ListSheetFieldsResponse {
    fn from(value: Vec<SheetField>) -> Self {
        let fields = value.into_iter().map(SheetFieldDto::from).collect();
        Self::new(fields)
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct DownloadSheetResponse {
    /// Pre-signed URL for direct S3 download (valid for 5 minutes).
    pub url: String,
    /// Original filename of the PDF.
    pub filename: String,
}

impl DownloadSheetResponse {
    pub fn new(url: String, filename: String) -> Self {
        Self { url, filename }
    }
}

fn build_filename(sheet_reference: &SheetReference) -> String {
    match &sheet_reference.extension {
        Some(ext) => format!("{}.{}", sheet_reference.original_name, ext),
        None => sheet_reference.original_name.clone(),
    }
}

#[utoipa::path(
    post,
    path = "/sheets",
    tag = "Sheets",
    operation_id = "uploadSheet",
    summary = "Upload a form-fillable PDF",
    description = "Uploads a form-fillable PDF file. The PDF must satisfy these compatibility rules: \n\n- It must NOT be encrypted.\n- It must contain a Catalog dictionary.\n- It must contain an AcroForm dictionary.\n- It must NOT be an XFA form.\n- The AcroForm must provide a Fields array (interactive form fields).\n- It must NOT be locked via DocMDP permissions.\n\nIf validation passes, returns 201 Created with a Location header pointing to the download URL.",
    request_body(
        content = UploadSheetRequest,
        content_type = "multipart/form-data",
        description = "Multipart form with a single 'sheet' field containing the PDF file."
    ),
    responses(
        (status = CREATED, description = "Sheet uploaded successfully", body = UploadSheetResponse, content_type = "application/json"),
        (status = BAD_REQUEST, description = "Invalid PDF or request", body = ApiErrorResponse, content_type = "application/json",
            examples(
                ("invalid_pdf_header" = (summary = "Invalid PDF file", value = json!({"message": "invalid PDF header - file is not a PDF"}))),
                ("not_supported" = (summary = "PDF sheet is not supported", value = json!({"message": "PDF sheet is encrypted"}))),
                ("file_too_large" = (summary = "File size exceeded", value = json!({"message": "file size exceeds 5MB limit"}))),
                ("invalid_filename" = (summary = "Invalid filename", value = json!({"message": "invalid sheet name"})))
            )
        ),
        (status = INTERNAL_SERVER_ERROR, description = "Unexpected server error", body = ApiErrorResponse, content_type = "application/json",
            examples(
                ("storage_error" = (summary = "Storage failure", value = json!({"message": "failed to save sheet"}))),
                ("database_error" = (summary = "Database failure", value = json!({"message": "failed to save sheet reference"})))
            )
        )
    )
)]
#[post("/sheets")]
pub async fn upload_sheet(
    sheet_service: web::Data<SheetService>,
    MultipartForm(payload): MultipartForm<UploadSheetRequest>,
) -> Result<HttpResponse, ApiError> {
    let path = payload.sheet.file.path().to_path_buf();

    let sheet_reference = sheet_service
        .import_sheet(Sheet::new(path, payload.sheet.file_name))
        .await?;

    let location = format!("/sheets/{}", sheet_reference.id);
    Ok(HttpResponse::Created()
        .insert_header((LOCATION, location))
        .json(UploadSheetResponse::new(sheet_reference.id)))
}

#[utoipa::path(
    get,
    path = "/sheets/{sheet_id}",
    tag = "Sheets",
    operation_id = "downloadSheet",
    summary = "Get download URL for PDF sheet",
    description = "Returns a pre-signed URL for downloading a previously uploaded PDF sheet. The sheet may have been enhanced with calculation scripts attached to its AcroForm fields, making it dynamic and self-calculating. The URL is valid for 5 minutes and includes response headers for content disposition and type.",
    params(
        ("sheet_id" = String, Path, description = "ID of the sheet to download", example = "123e4567-e89b-12d3-a456-426614174000")
    ),
    responses(
        (status = OK, description = "Download URL returned", body = DownloadSheetResponse, content_type = "application/json"),
        (status = NOT_FOUND, description = "Sheet not found", body = ApiErrorResponse, content_type = "application/json",
            examples(
                ("sheet_not_found" = (summary = "Sheet does not exist", value = json!({"message": "sheet not found: 123e4567-e89b-12d3-a456-426614174000"})))
            )
        )
    )
)]
#[get("/sheets/{sheet_id}")]
pub async fn download_sheet(
    sheet_service: web::Data<SheetService>,
    sheet_id: web::Path<Uuid>,
) -> Result<HttpResponse, ApiError> {
    let sheet_id = sheet_id.into_inner();
    let sheet_reference = sheet_service.find_sheet(sheet_id).await?;

    let filename = build_filename(&sheet_reference);

    // Generate pre-signed URL with response headers (valid for 5 minutes)
    const URL_EXPIRY_SECS: u64 = 300;
    let download_url = sheet_service
        .get_download_url(&sheet_reference.path, &filename, URL_EXPIRY_SECS)
        .await?;

    Ok(HttpResponse::Ok().json(DownloadSheetResponse::new(download_url, filename)))
}

#[utoipa::path(
    get,
    path = "/sheets/{sheet_id}/fields",
    tag = "Sheets",
    operation_id = "getSheetFormFields",
    summary = "Lists sheet form fields",
    description = "Lists interactive PDF AcroForm fields that support calculation actions. Only text (`/Tx`), choice (`/Ch`) fields with widget annotations are returned.",
    params(
        ("sheet_id" = String, Path, description = "ID of the uploaded sheet", example = "123e4567-e89b-12d3-a456-426614174000")
    ),
    responses(
        (status = 200, description = "List of interactive PDF AcroForm fields", body = ListSheetFieldsResponse),
        (status = NOT_FOUND, description = "Sheet not found", body = ApiErrorResponse, content_type = "application/json",
            examples(
                ("sheet_not_found" = (summary = "Sheet does not exist", value = json!({"message": "sheet not found: 123e4567-e89b-12d3-a456-426614174000"})))
            )
        )
    )
)]
#[get("/sheets/{sheet_id}/fields")]
pub async fn get_sheet_form_fields(
    sheet_service: web::Data<SheetService>,
    sheet_id: web::Path<Uuid>,
) -> Result<HttpResponse, ApiError> {
    let sheet_id = sheet_id.into_inner();

    let fields = sheet_service.list_sheet_form_fields(sheet_id).await?;
    let response = ListSheetFieldsResponse::from(fields);

    Ok(HttpResponse::Ok()
        .insert_header((CACHE_CONTROL, "no-cache, no-store, must-revalidate"))
        .json(response))
}

// --- S3 Event Notification Types ---

/// S3-compatible event notification payload from RustFS.
#[derive(Debug, Deserialize)]
pub struct S3EventNotification {
    #[serde(rename = "Records", default)]
    pub records: Vec<S3EventRecord>,
}

#[derive(Debug, Deserialize)]
pub struct S3EventRecord {
    #[serde(rename = "eventName")]
    pub event_name: String,
    pub s3: S3EventData,
}

#[derive(Debug, Deserialize)]
pub struct S3EventData {
    pub bucket: S3Bucket,
    pub object: S3Object,
}

#[derive(Debug, Deserialize)]
pub struct S3Bucket {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct S3Object {
    /// Object key, e.g., "sheets/{uuid}/{name}.pdf"
    pub key: String,
}

/// Extract sheet ID from S3 object key.
/// Key format: "sheets/{uuid}/{name}.pdf"
fn extract_sheet_id(key: &str) -> Option<Uuid> {
    key.strip_prefix("sheets/")
        .and_then(|s| s.split('/').next())
        .and_then(|id| Uuid::parse_str(id).ok())
}

/// Maximum retry attempts for database deletion.
const MAX_RETRY_ATTEMPTS: u32 = 3;
/// Base delay for exponential backoff (milliseconds).
const RETRY_BASE_DELAY_MS: u64 = 100;

/// Internal webhook endpoint for RustFS S3 event notifications.
/// Processes object deletion events and cleans up database references.
#[post("/internal/s3-events")]
pub async fn handle_s3_event(
    cleanup_service: web::Data<Arc<dyn SheetCleanupPort>>,
    payload: web::Json<S3EventNotification>,
) -> HttpResponse {
    for record in &payload.records {
        // Only process object removal events
        if !record.event_name.starts_with("s3:ObjectRemoved:") {
            continue;
        }

        let Some(sheet_id) = extract_sheet_id(&record.s3.object.key) else {
            warn!(
                key = %record.s3.object.key,
                "could not extract sheet ID from S3 object key"
            );
            continue;
        };

        info!(
            %sheet_id,
            key = %record.s3.object.key,
            event = %record.event_name,
            "processing S3 deletion event"
        );

        // Retry with exponential backoff
        let mut last_error = None;
        for attempt in 0..MAX_RETRY_ATTEMPTS {
            if attempt > 0 {
                let delay_ms = RETRY_BASE_DELAY_MS * 2u64.pow(attempt - 1);
                tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
            }

            match cleanup_service.delete_reference(&sheet_id).await {
                Ok(()) => {
                    info!(%sheet_id, "successfully deleted sheet reference");
                    last_error = None;
                    break;
                }
                Err(e) => {
                    warn!(
                        %sheet_id,
                        attempt = attempt + 1,
                        max_attempts = MAX_RETRY_ATTEMPTS,
                        error = %e,
                        "failed to delete sheet reference, retrying"
                    );
                    last_error = Some(e);
                }
            }
        }

        // If all retries failed, record in dead letter table
        if let Some(e) = last_error {
            error!(
                %sheet_id,
                key = %record.s3.object.key,
                error = %e,
                "all retry attempts exhausted, recording failed deletion"
            );
            if let Err(record_err) = cleanup_service
                .record_failed_deletion(&sheet_id, &record.s3.object.key, &e.to_string())
                .await
            {
                error!(
                    %sheet_id,
                    error = %record_err,
                    "failed to record deletion failure"
                );
            }
        }
    }

    // Always return 200 to prevent RustFS retry storms
    HttpResponse::Ok().finish()
}

use actix_web::http::StatusCode;
use actix_web::{HttpResponse, ResponseError};
use common::error::ProblemDetails;
use sheets_core::error::SheetError;
use std::fmt;

#[derive(Debug)]
pub struct ApiError {
    status: StatusCode,
    body: ProblemDetails,
}

impl ApiError {
    pub fn new(status: StatusCode, body: ProblemDetails) -> Self {
        Self { status, body }
    }
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.status, self.body.title)
    }
}

impl From<SheetError> for ApiError {
    fn from(value: SheetError) -> Self {
        match value {
            SheetError::InvalidFileName => ApiError::new(
                StatusCode::BAD_REQUEST,
                ProblemDetails::new("/problems/invalid-file-name", "Invalid File Name", 400)
                    .with_detail(value.to_string()),
            ),
            SheetError::InvalidFilePath => ApiError::new(
                StatusCode::BAD_REQUEST,
                ProblemDetails::new("/problems/invalid-file-path", "Invalid File Path", 400)
                    .with_detail(value.to_string()),
            ),
            SheetError::InvalidPdfFile(_) => ApiError::new(
                StatusCode::BAD_REQUEST,
                ProblemDetails::new("/problems/invalid-pdf-file", "Invalid PDF File", 400)
                    .with_detail(value.to_string()),
            ),
            SheetError::NotFound(_) => ApiError::new(
                StatusCode::NOT_FOUND,
                ProblemDetails::new("/problems/sheet-not-found", "Sheet Not Found", 404)
                    .with_detail(value.to_string()),
            ),
            SheetError::StorageError(_) => ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                ProblemDetails::internal(),
            ),
            SheetError::DatabaseError(_) => ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                ProblemDetails::internal(),
            ),
        }
    }
}

impl ResponseError for ApiError {
    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status)
            .content_type("application/problem+json")
            .json(&self.body)
    }
}

use actix_web::http::StatusCode;
use actix_web::{HttpResponse, ResponseError};
use common::error::ApiErrorResponse;
use sheets_core::error::SheetError;
use std::fmt;

#[derive(Debug)]
pub struct ApiError {
    status: StatusCode,
    body: ApiErrorResponse,
}

impl ApiError {
    pub fn new(status: StatusCode, body: ApiErrorResponse) -> Self {
        Self { status, body }
    }
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.status, self.body.message)
    }
}

impl From<SheetError> for ApiError {
    fn from(value: SheetError) -> Self {
        match value {
            SheetError::InvalidFileName => ApiError::new(
                StatusCode::BAD_REQUEST,
                ApiErrorResponse {
                    message: value.to_string(),
                },
            ),
            SheetError::InvalidFilePath => ApiError::new(
                StatusCode::BAD_REQUEST,
                ApiErrorResponse {
                    message: value.to_string(),
                },
            ),
            SheetError::InvalidPdfFile(_) => ApiError::new(
                StatusCode::BAD_REQUEST,
                ApiErrorResponse {
                    message: value.to_string(),
                },
            ),
            SheetError::NotFound(_) => ApiError::new(
                StatusCode::NOT_FOUND,
                ApiErrorResponse {
                    message: value.to_string(),
                },
            ),
            SheetError::StorageError(_) => ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiErrorResponse {
                    message: value.to_string(),
                },
            ),
            SheetError::DatabaseError(_) => ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiErrorResponse {
                    message: value.to_string(),
                },
            ),
        }
    }
}

impl ResponseError for ApiError {
    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status).json(&self.body)
    }
}

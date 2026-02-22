use actions_core::error::ActionError;
use actix_web::body::BoxBody;
use actix_web::http::StatusCode;
use actix_web::{HttpResponse, ResponseError};
use common::error::ProblemDetails;
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

impl From<ActionError> for ApiError {
    fn from(value: ActionError) -> Self {
        match value {
            ActionError::NotFound(_) => ApiError::new(
                StatusCode::NOT_FOUND,
                ProblemDetails::new("/problems/sheet-not-found", "Sheet Not Found", 404)
                    .with_detail(value.to_string()),
            ),
            ActionError::FileNotFound => ApiError::new(
                StatusCode::NOT_FOUND,
                ProblemDetails::new("/problems/file-not-found", "File Not Found", 404)
                    .with_detail(value.to_string()),
            ),
            ActionError::InvalidPdfSheet(_) => ApiError::new(
                StatusCode::BAD_REQUEST,
                ProblemDetails::new("/problems/invalid-pdf-sheet", "Invalid PDF Sheet", 400)
                    .with_detail(value.to_string()),
            ),
            ActionError::FieldNotFound(_) => ApiError::new(
                StatusCode::BAD_REQUEST,
                ProblemDetails::new("/problems/field-not-found", "Field Not Found", 400)
                    .with_detail(value.to_string()),
            ),
            ActionError::InvalidAction(_) => ApiError::new(
                StatusCode::BAD_REQUEST,
                ProblemDetails::new("/problems/invalid-action", "Invalid Action", 400)
                    .with_detail(value.to_string()),
            ),
            ActionError::LoadPdfError => ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                ProblemDetails::internal(),
            ),
            ActionError::SavePdfError => ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                ProblemDetails::internal(),
            ),
        }
    }
}

impl ResponseError for ApiError {
    fn error_response(&self) -> HttpResponse<BoxBody> {
        HttpResponse::build(self.status)
            .content_type("application/problem+json")
            .json(&self.body)
    }
}

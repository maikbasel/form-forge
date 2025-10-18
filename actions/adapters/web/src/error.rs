use actions_core::error::ActionError;
use actix_web::body::BoxBody;
use actix_web::http::StatusCode;
use actix_web::{HttpResponse, ResponseError};
use common::error::ApiErrorResponse;
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

impl From<ActionError> for ApiError {
    fn from(value: ActionError) -> Self {
        match value {
            ActionError::NotFound(_) => ApiError::new(
                StatusCode::NOT_FOUND,
                ApiErrorResponse {
                    message: value.to_string(),
                },
            ),
            ActionError::FileNotFound => ApiError::new(
                StatusCode::NOT_FOUND,
                ApiErrorResponse {
                    message: value.to_string(),
                },
            ),
            ActionError::LoadPdfError => ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiErrorResponse {
                    message: value.to_string(),
                },
            ),
            ActionError::InvalidPdfSheet(_) => ApiError::new(
                StatusCode::BAD_REQUEST,
                ApiErrorResponse {
                    message: value.to_string(),
                },
            ),
            ActionError::SavePdfError => ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiErrorResponse {
                    message: value.to_string(),
                },
            ),
            ActionError::FieldNotFound(_) => ApiError::new(
                StatusCode::BAD_REQUEST,
                ApiErrorResponse {
                    message: value.to_string(),
                },
            ),
            ActionError::InvalidAction(_) => ApiError::new(
                StatusCode::BAD_REQUEST,
                ApiErrorResponse {
                    message: value.to_string(),
                },
            ),
        }
    }
}

impl ResponseError for ApiError {
    fn error_response(&self) -> HttpResponse<BoxBody> {
        HttpResponse::build(self.status).json(&self.body)
    }
}

use serde::Serialize;
use utoipa::ToSchema;

#[derive(Debug, Serialize, ToSchema)]
pub struct ApiErrorResponse {
    /// Human-readable error message describing what went wrong.
    pub message: String,
}

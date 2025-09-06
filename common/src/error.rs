use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ApiErrorResponse {
    pub message: String,
}

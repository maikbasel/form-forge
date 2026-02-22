use serde::Serialize;
use utoipa::ToSchema;

/// RFC 9457 Problem Details response body.
#[derive(Debug, Serialize, ToSchema)]
pub struct ProblemDetails {
    /// A URI reference that identifies the problem type.
    #[serde(rename = "type")]
    pub problem_type: String,
    /// A short, human-readable summary of the problem type.
    pub title: String,
    /// The HTTP status code.
    pub status: u16,
    /// A human-readable explanation specific to this occurrence.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
    /// A URI reference that identifies the specific occurrence.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instance: Option<String>,
}

impl ProblemDetails {
    pub fn new(problem_type: impl Into<String>, title: impl Into<String>, status: u16) -> Self {
        Self {
            problem_type: problem_type.into(),
            title: title.into(),
            status,
            detail: None,
            instance: None,
        }
    }

    pub fn internal() -> Self {
        Self::new("about:blank", "Internal Server Error", 500)
    }

    pub fn with_detail(mut self, detail: impl Into<String>) -> Self {
        self.detail = Some(detail.into());
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn serializes_minimal_problem_details() {
        let problem = ProblemDetails::new("/problems/not-found", "Not Found", 404);
        let json = serde_json::to_value(&problem).unwrap();

        assert_eq!(json["type"], "/problems/not-found");
        assert_eq!(json["title"], "Not Found");
        assert_eq!(json["status"], 404);
        assert!(json.get("detail").is_none());
        assert!(json.get("instance").is_none());
    }

    #[test]
    fn serializes_with_detail() {
        let problem = ProblemDetails::new("/problems/not-found", "Not Found", 404)
            .with_detail("Sheet abc not found");
        let json = serde_json::to_value(&problem).unwrap();

        assert_eq!(json["detail"], "Sheet abc not found");
    }

    #[test]
    fn internal_helper_produces_500() {
        let problem = ProblemDetails::internal();

        assert_eq!(problem.problem_type, "about:blank");
        assert_eq!(problem.title, "Internal Server Error");
        assert_eq!(problem.status, 500);
    }
}

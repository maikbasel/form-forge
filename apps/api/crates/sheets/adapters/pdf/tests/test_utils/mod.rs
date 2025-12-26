use common::telemetry;

pub struct TestContext;

impl TestContext {
    pub fn setup() -> Self {
        telemetry::initialize().expect("initialize telemetry");

        Self {}
    }
}

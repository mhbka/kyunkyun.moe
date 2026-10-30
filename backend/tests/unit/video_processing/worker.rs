use super::*;

#[test]
fn retries_twice_before_marking_a_job_failed() {
    assert_eq!(failure_status(1), "pending");
    assert_eq!(failure_status(2), "pending");
    assert_eq!(failure_status(3), "failed");
}

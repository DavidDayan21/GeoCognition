use serde::{Deserialize, Serialize};

/// The two quiz modes. SM-2 state is tracked per (country, mode) pair.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum QuestionMode {
    Capital,
    Flag,
}

impl QuestionMode {
    /// Database representation, matching the `mode` CHECK constraint.
    pub fn as_str(self) -> &'static str {
        match self {
            QuestionMode::Capital => "capital",
            QuestionMode::Flag => "flag",
        }
    }

    /// Parses the database / IPC representation. Returns `None` for
    /// anything other than `"capital"` or `"flag"`.
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "capital" => Some(QuestionMode::Capital),
            "flag" => Some(QuestionMode::Flag),
            _ => None,
        }
    }
}

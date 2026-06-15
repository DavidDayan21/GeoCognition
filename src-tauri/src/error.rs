use serde::Serialize;

/// Application-level error type shared by the infra layer and Tauri commands.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    /// SQLite / pool failure.
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),

    /// JSON (de)serialization failure, e.g. corrupt bundled dataset.
    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    /// Stored timestamp that is not valid RFC 3339.
    #[error("timestamp parse error: {0}")]
    DateParse(#[from] chrono::ParseError),

    /// Filesystem failure (e.g. creating the app data directory).
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    /// Command argument rejected by validation.
    #[error("invalid input: {0}")]
    InvalidInput(String),

    /// Requested entity does not exist.
    #[error("not found: {0}")]
    NotFound(String),
}

impl Serialize for AppError {
    /// Errors cross the Tauri IPC boundary as their display string.
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

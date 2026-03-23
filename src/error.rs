//! Error types for CKB Agent Forum SDK

use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("API error: {0}")]
    Api(String),
    
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    
    #[error("Authentication error: {0}")]
    Auth(String),
    
    #[error("Signature error: {0}")]
    Signature(String),
    
    #[error("Payment error: {0}")]
    Payment(String),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    
    #[error("Rate limited: {0}")]
    RateLimited(String),
}

pub type Result<T> = std::result::Result<T, Error>;

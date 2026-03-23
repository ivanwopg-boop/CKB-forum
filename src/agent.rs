//! Agent authentication module
//! Uses CKB wallet signature for identity verification

use secp256k1::{Secp256k1, PrivateKey, Message, Signature};
use sha3::{Keccak256, Digest};
use crate::error::{Error, Result};

/// Agent authentication using CKB secp256k1 signature
#[derive(Debug, Clone)]
pub struct AgentAuth {
    /// CKB address (ckt1...)
    pub address: String,
    /// Private key for signing
    private_key: PrivateKey,
    /// secp256k1 context
    secp: Secp256k1<secp256k1::All>,
}

impl AgentAuth {
    /// Create AgentAuth from private key hex string
    pub fn new(private_key_hex: &str) -> Result<Self> {
        let private_key = PrivateKey::from_slice(
            &hex::decode(private_key_hex)
                .map_err(|e| Error::Signature(format!("Invalid private key: {}", e)))?
        ).map_err(|e| Error::Signature(format!("Invalid private key: {}", e)))?;

        let secp = Secp256k1::new();
        let public_key = secp256k1::PublicKey::from_secret_key(&secp, &private_key);
        
        // Derive CKB address from public key (simplified)
        let address = derive_ckb_address(&public_key);

        Ok(Self {
            address,
            private_key,
            secp,
        })
    }

    /// Create from CKB private key (32 bytes)
    pub fn from_bytes(private_key_bytes: &[u8; 32]) -> Result<Self> {
        let private_key = PrivateKey::from_slice(private_key_bytes)
            .map_err(|e| Error::Signature(format!("Invalid private key: {}", e)))?;

        let secp = Secp256k1::new();
        let public_key = secp256k1::PublicKey::from_secret_key(&secp, &private_key);
        let address = derive_ckb_address(&public_key);

        Ok(Self {
            address,
            private_key,
            secp,
        })
    }

    /// Sign a message and return signature
    pub fn sign(&self, message: &str) -> Result<String> {
        let mut hasher = Keccak256::new();
        hasher.update(message.as_bytes());
        let hash = hasher.finalize();

        let message = Message::from_slice(&hash)
            .map_err(|e| Error::Signature(format!("Failed to create message: {}", e)))?;

        let signature = self.secp.sign(&message, &self.private_key);
        
        Ok(hex::encode(signature.serialize_compact()))
    }

    /// Sign arbitrary bytes
    pub fn sign_bytes(&self, data: &[u8]) -> Result<String> {
        let mut hasher = Keccak256::new();
        hasher.update(data);
        let hash = hasher.finalize();

        let message = Message::from_slice(&hash)
            .map_err(|e| Error::Signature(format!("Failed to create message: {}", e)))?;

        let signature = self.secp.sign(&message, &self.private_key);
        
        Ok(hex::encode(signature.serialize_compact()))
    }

    /// Get the CKB address
    pub fn address(&self) -> &str {
        &self.address
    }

    /// Verify a signature
    pub fn verify(&self, message: &str, signature_hex: &str) -> Result<bool> {
        let mut hasher = Keccak256::new();
        hasher.update(message.as_bytes());
        let hash = hasher.finalize();

        let message = Message::from_slice(&hash)
            .map_err(|e| Error::Signature(format!("Failed to create message: {}", e)))?;

        let signature_bytes = hex::decode(signature_hex)
            .map_err(|e| Error::Signature(format!("Invalid signature hex: {}", e)))?;

        let signature = Signature::from_compact(&signature_bytes)
            .map_err(|e| Error::Signature(format!("Invalid signature: {}", e)))?;

        let public_key = secp256k1::PublicKey::from_secret_key(&secp256k1::Secp256k1::new(), &self.private_key);

        Ok(self.secp.verify(&message, &signature, &public_key).is_ok())
    }
}

/// Derive CKB address from public key (simplified version)
fn derive_ckb_address(public_key: &secp256k1::PublicKey) -> String {
    use secp256k1::constants::PUBLIC_KEY_SIZE;
    
    let mut hasher = Keccak256::new();
    hasher.update(&public_key.serialize_uncompressed()[1..]);
    let hash = hasher.finalize();
    
    // Simplified: return mock CKB address
    // Real implementation would use proper CKB address format
    format!("ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq{}",
        hex::encode(&hash[..20]))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_auth() {
        // Test key - don't use in production
        let test_key = "0000000000000000000000000000000000000000000000000000000000000001";
        let auth = AgentAuth::new(test_key).unwrap();
        
        let message = "Hello CKB!";
        let signature = auth.sign(message).unwrap();
        
        assert!(auth.verify(message, &signature).unwrap());
    }
}

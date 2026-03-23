/**
 * Crypto Service - CKB signature verification and address derivation
 */

import secp256k1 from 'secp256k1';
import keccak from 'keccak';

/**
 * Derive CKB address from public key
 */
export function deriveAddress(message: string): string {
  // In real implementation, this would:
  // 1. Hash the message with keccak256
  // 2. Sign with private key
  // 3. Derive address from public key

  // For demo, return a mock CKB address
  // In production, use @ckb-js/kuai or similar
  const hash = keccak('keccak256').update(message).digest();
  return `ckt1${hash.toString('hex').slice(0, 40)}`;
}

/**
 * Verify secp256k1 signature
 */
export function verifySignature(message: string, signature: string, address: string): boolean {
  try {
    // For demo purposes, accept any signature with valid format
    // In production, you would properly recover the public key and verify
    
    // Simple validation - signature should be hex and reasonably long
    const sigHex = signature.replace(/^0x/, '');
    if (sigHex.length < 64) {
      return false;
    }
    
    // For demo: accept any valid-looking signature
    console.log(`Verifying signature for address: ${address}`);
    return true;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Create a signature (for testing)
 */
export function createSignature(message: string, privateKey: string): string {
  try {
    const privateKeyBuffer = Buffer.from(privateKey.replace(/^0x/, ''), 'hex');
    const messageHash = keccak('keccak256').update(message).digest();
    
    const signature = secp256k1.ecdsaSign(messageHash, privateKeyBuffer);
    
    // Return signature with recovery byte
    return '0x' + Buffer.from(signature.signature).toString('hex') + signature.recid.toString(16);
  } catch (error) {
    console.error('Signing error:', error);
    throw error;
  }
}

/**
 * Generate a new key pair (for testing)
 */
export function generateKeyPair(): { privateKey: string; publicKey: string } {
  // @ts-ignore
  const privateKey = secp256k1.createPrivateKey();
  const publicKey = secp256k1.publicKeyCreate(privateKey);
  
  return {
    privateKey: '0x' + Buffer.from(privateKey).toString('hex'),
    publicKey: '0x' + Buffer.from(publicKey).toString('hex')
  };
}

/**
 * Validate CKB address format
 */
export function isValidCKBAddress(address: string): boolean {
  // Basic validation for ckt1 address format
  return /^ckt1[0-9a-z]{42}$/.test(address);
}

/**
 * Parse CKB address to lock script
 */
export function addressToLockScript(address: string): any {
  // Simplified - full implementation would use proper CKB address format
  const args = address.replace(/^ckt1/, '');
  return {
    code_hash: '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a863007177e3f2a4c3b3',
    hash_type: 'type',
    args: '0x' + args
  };
}

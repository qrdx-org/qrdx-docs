---
title: Post-Quantum Cryptography in QRDX
description: Understanding QRDX's implementation of post-quantum cryptography
---

# Post-Quantum Cryptography in QRDX

QRDX implements NIST-standardized post-quantum cryptography to ensure long-term security against quantum computing threats. This section details our cryptographic implementation and security measures.

## Overview of Post-Quantum Cryptography

Post-quantum cryptography (PQC) refers to cryptographic algorithms that remain secure against attacks by both classical and quantum computers. QRDX uses:

- **CRYSTALS-Dilithium**: For digital signatures
- **CRYSTALS-Kyber**: For key encapsulation
- **BLAKE3**: For hash functions
- **Hybrid Modes**: For transition security

## CRYSTALS-Dilithium Implementation

QRDX uses CRYSTALS-Dilithium for digital signatures with the following specifications:

### Technical Details
- **NIST Status**: FIPS 204 (Standardized 2024)
- **Security Level**: NIST Level 3 (comparable to AES-192)
- **Public Key Size**: 1,952 bytes
- **Signature Size**: 3,293 bytes

### Performance
- Key Generation: ~50 microseconds
- Signature Generation: ~100 microseconds
- Verification: ~60 microseconds

### Usage in QRDX
1. Transaction signing
2. Block signing by validators
3. Smart contract authentication
4. Multi-signature wallets

## CRYSTALS-Kyber Implementation

CRYSTALS-Kyber provides quantum-resistant key encapsulation:

### Technical Details
- **NIST Status**: FIPS 203 (Standardized 2024)
- **Security Level**: NIST Level 3
- **Public Key Size**: 1,184 bytes
- **Ciphertext Size**: 1,088 bytes
- **Shared Secret Size**: 32 bytes

### Performance
- Key Generation: 52 μs
- Encapsulation: 42 μs
- Decapsulation: 48 μs

### Usage in QRDX
1. Secure key exchange for encrypted transactions
2. Private transaction pools
3. Validator communication encryption
4. Cross-chain bridge security

## Hash Functions

QRDX uses quantum-resistant hash functions:

### Primary Hash Function: BLAKE3
- 512-bit output for quantum resistance
- High performance characteristics
- Used for transaction hashing and Merkle trees

### Secondary Hash Function: SHA3-512
- Backup hash function
- Used in specific protocol operations
- Additional security layer

## Hybrid Security Model

During the transition period, QRDX supports hybrid modes combining classical and post-quantum cryptography:

### Dual Signing
- ECDSA + Dilithium signatures
- Maintains compatibility with existing systems
- Provides quantum resistance for future security

### Migration Path
1. Users can maintain classical addresses
2. Optional upgrade to quantum-resistant addresses
3. Seamless transition process

### Backward Compatibility
- Legacy transactions supported
- Quantum-resistant wrapping for old formats
- No forced migration timeline

## Security Considerations

When implementing post-quantum cryptography in QRDX:

### Key Management
- Secure key generation
- Safe storage practices
- Backup procedures

### Implementation Guidelines
- Constant-time operations
- Side-channel attack prevention
- Memory management best practices

### Validation
- Rigorous testing
- Third-party audits
- Ongoing security assessments
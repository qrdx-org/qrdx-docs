---
title: Quantum Resistance
description: Understanding QRDX's quantum-resistant security features
---

# Quantum Resistance

QRDX provides comprehensive protection against quantum computing threats through multiple layers of security. This section explains our quantum-resistant features and security model.

## Security Model

### Threat Model

QRDX is designed to be secure against adversaries with:

1. **Quantum Capabilities**
   - Large-scale quantum computers
   - Shor's algorithm implementation
   - Grover's algorithm capabilities

2. **Classical Capabilities**
   - Unlimited computational power
   - Network-level control
   - Economic resources

3. **Attack Vectors**
   - Cryptographic attacks
   - Network attacks
   - Economic attacks

## Cryptographic Security

### Post-Quantum Algorithms

QRDX implements NIST-standardized post-quantum cryptography:

1. **CRYSTALS-Dilithium**
   - Digital signatures
   - NIST Level 3 security
   - Quantum-resistant key generation

2. **CRYSTALS-Kyber**
   - Key encapsulation
   - Secure key exchange
   - Forward secrecy

3. **Hash Functions**
   - BLAKE3 (512-bit)
   - SHA3-512 backup
   - Quantum-resistant design

### Security Levels

| Component | Classical Security | Quantum Security |
|-----------|-------------------|------------------|
| Signatures | 192-bit | 96-bit |
| Key Exchange | 192-bit | 96-bit |
| Hashing | 512-bit | 256-bit |

## Network Security

### Consensus Security

1. **Validator Requirements**
   - Minimum 100,000 QRDX stake
   - Hardware security requirements
   - Performance monitoring

2. **Slashing Conditions**
   - Double signing (50% stake)
   - Invalid attestations (30% stake)
   - Downtime penalties (5% stake)

3. **Economic Security**
   - High cost of attack ($300M+)
   - Insurance fund protection
   - Rapid slash execution

### Bridge Security

1. **Multi-Layer Verification**
   - Source chain confirmations
   - Relayer consensus
   - Validator signatures
   - Fraud proofs

2. **Time Locks**
   - 7-day unshielding delay
   - Challenge period
   - Emergency pause capability

## Smart Contract Security

### Audit Status

Recent security audits:
- Trail of Bits (Q3 2025)
- OpenZeppelin (Q4 2025)
- Quantstamp (Q1 2026)

### Security Features

1. **Formal Verification**
   - Core contracts verified
   - Mathematical proofs
   - Automated checking

2. **Access Controls**
   - Role-based access
   - Time locks
   - Emergency procedures

3. **Upgrades**
   - Governed by community
   - Timelocked changes
   - Transparent process

## Best Practices

### For Users

1. **Wallet Security**
   - Use hardware wallets
   - Enable quantum signatures
   - Regular key rotation

2. **Transaction Safety**
   - Verify addresses
   - Check gas settings
   - Monitor confirmations

3. **Account Protection**
   - Strong passwords
   - 2FA where available
   - Regular security review

### For Developers

1. **Integration Security**
   - Use official SDKs
   - Implement all security checks
   - Regular dependency updates

2. **Contract Development**
   - Follow security patterns
   - Comprehensive testing
   - External audits

3. **Monitoring**
   - Real-time alerts
   - Performance tracking
   - Security scanning

## Security Program

### Bug Bounty

- Maximum reward: $1,000,000
- Scope: All core systems
- [Submit findings](https://hackerone.com/qrdx)

### Incident Response

1. **Detection**
   - 24/7 monitoring
   - Automated alerts
   - Community reports

2. **Response**
   - Emergency team
   - Quick mitigation
   - Clear communication

3. **Recovery**
   - System restoration
   - Loss prevention
   - Post-mortem analysis

## Resources

- [Security Audits](audits.md)
- [Best Practices](best-practices.md)
- [Bug Bounty](bug-bounty.md)
- [Incident Reports](https://security.qrdx.org/reports)
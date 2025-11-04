---
title: QRDX Chain Architecture
description: Understanding the architecture of the QRDX blockchain
---

# QRDX Chain Architecture

QRDX Chain is a purpose-built Layer-1 blockchain designed for post-quantum security, high performance, and DeFi optimization. This section details the technical architecture and components of QRDX Chain.

## Overview

QRDX Chain specifications:

- **Consensus**: Quantum-Resistant Proof-of-Stake (QR-PoS)
- **Block Time**: 2 seconds
- **Finality**: Sub-second (single slot finality)
- **Throughput**: 5,000+ TPS
- **Smart Contract VM**: QEVM (Quantum-resistant EVM)

## Network Architecture

```
┌─────────────────────────────────────────────────┐
│           QRDX Chain (Layer 1)                  │
│  ┌────────────────────────────────────────┐     │
│  │  Consensus Layer (QR-PoS)              │     │
│  └────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────┐     │
│  │  Execution Layer (QEVM)                │     │
│  │  - Smart Contracts                     │     │
│  │  - QRDX Protocol (AMM)                 │     │
│  │  - Asset Shielding Contracts           │     │
│  └────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────┐     │
│  │  Bridge Layer                          │     │
│  │  - Ethereum Bridge                     │     │
│  │  - Bitcoin Bridge                      │     │
│  │  - Multi-Chain Bridges                 │     │
│  └────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

## QEVM: Quantum-Resistant Ethereum Virtual Machine

QEVM extends the Ethereum Virtual Machine with post-quantum features while maintaining compatibility:

### Key Modifications
- Signature verification using CRYSTALS-Dilithium
- Key derivation using CRYSTALS-Kyber
- Quantum-resistant address generation
- Precompiled contracts for PQC operations

### Backwards Compatibility
- Full EVM bytecode compatibility
- Support for existing Ethereum tooling
- Seamless migration path for dApps

## State Management

QRDX Chain implements an advanced state management system:

### Merkle Patricia Trie
- Modified for quantum resistance
- BLAKE3 hash function (512-bit output)
- Optimized for performance

### Account State
- Includes quantum-resistant public keys
- Maintains classical bridge mappings
- Efficient storage design

### Data Availability
- State pruning capabilities
- Archival node support
- Historical data access

## Performance Characteristics

QRDX Chain is optimized for high performance:

### Block Production
- 2-second block time
- Single slot finality
- High transaction throughput

### Resource Requirements
Minimum validator specifications:
- CPU: 8 cores @ 3.0 GHz
- RAM: 32 GB
- Storage: 1 TB SSD
- Network: 100 Mbps symmetric

### Scaling Capabilities
- Future sharding support
- Layer-2 compatibility
- Cross-chain interoperability

## Development Environment

Tools and resources for building on QRDX Chain:

### Development Tools
- QRDX SDK
- Web3.js compatibility
- Hardhat/Truffle support

### Testing Networks
- Local testnet
- Public testnet
- Mainnet (launching Q4 2025)

### Documentation & Resources
- API documentation
- Code examples
- Developer tutorials
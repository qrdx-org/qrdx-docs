---
title: Asset Shielding Mechanism
description: Understanding QRDX's quantum-resistant asset shielding process
---

# Asset Shielding Mechanism

The asset shielding mechanism allows users to convert classical blockchain assets into quantum-resistant equivalents on QRDX Chain. This section explains how the shielding process works and its security features.

## Overview

Asset shielding converts traditional assets to quantum-resistant versions:

### Supported Assets
- ETH → qETH
- WBTC → qBTC
- USDC → qUSDC
- USDT → qUSDT
- Any ERC-20 → qRC20

## Shielding Process

The shielding process flow:

```
User (Ethereum)                    QRDX Bridge                    User (QRDX Chain)
      |                                  |                               |
      | 1. Lock ETH in Bridge Contract   |                               |
      |--------------------------------->|                               |
      |                                  | 2. Verify Lock (Relayers)     |
      |                                  | 3. Generate Proof             |
      |                                  |                               |
      |                                  | 4. Mint qETH                  |
      |                                  |------------------------------>|
      |                                  |                               |
      | 5. Emit Proof (Quantum-Resistant)|                               |
      |<---------------------------------|                               |
```

### Security Properties
- Trustless operation
- Quantum-resistant signatures
- Time-lock mechanisms
- Multi-validator consensus

## Unshielding (Redemption)

Converting quantum-resistant assets back to classical assets:

### Process Steps
1. Burn qRC20 tokens on QRDX Chain
2. Bridge validators verify burn (QR signatures)
3. Multi-sig release of locked assets
4. User receives original assets

### Security Measures
- 7-day unshielding delay (fraud proof window)
- 2/3 + 1 validator approval required
- Emergency pause mechanism
- Insurance fund protection

## Bridge Security Model

### Components
1. **Relayer Network**
   - Decentralized operators
   - Monitor both chains
   - Submit proofs

2. **Validator Set**
   - Bonded stake (min 100,000 QRDX)
   - Verification duties
   - Slashing conditions

3. **Proof System**
   - Merkle proofs
   - Quantum-resistant signatures
   - Efficient verification

4. **Fraud Proofs**
   - Challenge period
   - Slashing penalties
   - Dispute resolution

### Economic Security

#### Collateral Requirements
- Minimum 100,000 QRDX validator bond
- Slashing for invalid proofs/downtime
- 5% protocol revenue to insurance

#### Insurance Fund
- Protection against exploits
- Community-governed
- Risk management

## Technical Implementation

### Smart Contracts

#### Bridge Lock Contract (Ethereum)
```solidity
contract QRDXBridge {
    mapping(address => uint256) public lockedBalances;
    mapping(bytes32 => bool) public processedMints;
    
    event AssetLocked(
        address indexed user,
        address indexed token,
        uint256 amount,
        bytes32 qrdxAddress
    );
    
    function lockETH(bytes32 qrdxAddress) external payable {
        require(msg.value > 0, "Must lock ETH");
        lockedBalances[msg.sender] += msg.value;
        emit AssetLocked(msg.sender, address(0), msg.value, qrdxAddress);
    }
}
```

#### Mint Contract (QRDX Chain)
```solidity
contract QRDXBridgeMinter {
    function mintFromEthereum(
        address recipient,
        uint256 amount,
        bytes calldata merkleProof,
        bytes calldata dilithiumSignature
    ) external {
        require(verifyMerkleProof(merkleProof), "Invalid proof");
        require(verifyDilithiumSignature(dilithiumSignature), "Invalid sig");
        qETH.mint(recipient, amount);
    }
}
```

## Using Asset Shielding

### Shielding Assets
1. Connect wallet to QRDX Bridge
2. Select assets to shield
3. Approve bridge contract
4. Confirm transaction
5. Wait for confirmation
6. Receive quantum-resistant tokens

### Unshielding Assets
1. Connect to QRDX Chain
2. Select assets to unshield
3. Initiate unshielding
4. Wait 7-day fraud proof period
5. Claim original assets

## Best Practices

1. **Security**
   - Verify contract addresses
   - Check bridge status
   - Monitor transactions
   - Use hardware wallets

2. **Risk Management**
   - Start with small amounts
   - Monitor confirmation times
   - Understand time locks
   - Keep recovery info safe

3. **Cost Optimization**
   - Check bridge fees
   - Bundle transactions
   - Time transactions
   - Monitor gas prices

## Resources

- [Bridge Tutorial](../user-guides/bridge.md)
- [Security Guide](../security/best-practices.md)
- [API Reference](../dev/api-reference.md)
- [Bridge Status](https://bridge.qrdx.org/status)
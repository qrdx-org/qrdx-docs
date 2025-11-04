---
title: QRDX Protocol Overview
description: Understanding QRDX's quantum-resistant AMM protocol
---

# QRDX Protocol Overview

QRDX Protocol is an advanced Automated Market Maker (AMM) based on Uniswap v3/v4 architecture with concentrated liquidity and native quantum resistance. This section explains the core protocol mechanics and features.

## Design Philosophy

QRDX Protocol combines proven AMM principles with quantum-resistant security:

### Key Principles
1. **Capital Efficiency**: Concentrated liquidity from Uniswap v3
2. **Gas Optimization**: Single contract design from Uniswap v4
3. **Extensibility**: Hook-based plugin architecture
4. **Security**: Post-quantum cryptographic primitives
5. **Interoperability**: Cross-chain compatibility

## Concentrated Liquidity

QRDX Protocol allows liquidity providers to concentrate capital in specific price ranges:

### How It Works
```
Price Range: [Pₐ, Pᵦ]
Liquidity Density: L(P) = k / (P - Pₐ) for P ∈ [Pₐ, Pᵦ]
```

### Benefits
- Up to 4000x capital efficiency vs traditional AMMs
- Higher fee yield for active LPs
- Reduced slippage for traders
- Custom price range selection

## Singleton Architecture

All QRDX pools exist within a single smart contract:

### Contract Structure
```solidity
contract PoolManager {
    mapping(bytes32 => Pool) public pools;
    
    function swap(
        bytes32 poolId,
        bool zeroForOne,
        int256 amountSpecified,
        bytes calldata hookData
    ) external returns (int256 amount0, int256 amount1);
    
    function modifyLiquidity(
        bytes32 poolId,
        int24 tickLower,
        int24 tickUpper,
        int256 liquidityDelta
    ) external;
}
```

### Advantages
- Reduced gas costs (~50% savings)
- Simplified integrations
- Better capital efficiency
- Easier upgrades

## Hooks System

The hooks system enables custom pool behaviors:

### Hook Points
- `beforeInitialize` / `afterInitialize`
- `beforeSwap` / `afterSwap`
- `beforeModifyLiquidity` / `afterModifyLiquidity`
- `beforeDonate` / `afterDonate`

### Use Cases
1. TWAP oracles
2. Dynamic fees
3. Limit orders
4. KYC/AML compliance
5. Liquidity mining

## Fee Structure

QRDX implements flexible fee tiers:

### Fee Tiers
| Fee Tier | Use Case | Expected Volume |
|----------|----------|-----------------|
| 0.01% | Stablecoin pairs | High |
| 0.05% | Major pairs | High |
| 0.30% | Exotic pairs | Medium |
| 1.00% | Very exotic pairs | Low |

### Distribution
- 83.3% to liquidity providers
- 16.7% to protocol treasury

## Price Oracle

QRDX maintains quantum-resistant price oracles:

### TWAP Implementation
```
TWAP(t₀, t₁) = exp((log(P(t₁)) · t₁ - log(P(t₀)) · t₀) / (t₁ - t₀))
```

### Security Features
- Dilithium signatures on updates
- Manipulation resistance
- Historical price access
- Cross-chain price feeds

## Integration Guide

Steps to integrate with QRDX Protocol:

1. **Connect to QRDX Chain**
   - Configure RPC endpoint
   - Set up Web3 provider
   - Handle quantum-resistant signatures

2. **Pool Interaction**
   - Query pool data
   - Calculate prices
   - Execute swaps
   - Manage liquidity

3. **Security Considerations**
   - Use quantum-resistant signatures
   - Validate pool states
   - Handle errors properly

4. **Best Practices**
   - Monitor gas costs
   - Implement slippage protection
   - Cache pool data
   - Handle reorgs

## Resources

- [API Reference](../dev/api-reference.md)
- [Smart Contract Documentation](../dev/smart-contracts.md)
- [Integration Examples](../dev/integration-guide.md)
- [Security Best Practices](../security/best-practices.md)
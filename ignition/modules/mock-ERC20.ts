import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MockERC20-260524", (m) => {

  const mockERC20 = m.contract("MockERC20", [
    'Mock ERC20 Coin',
    'MEC'
  ]);
  
  return { mockERC20 };
});

// 1. npx hardhat ignition deploy ignition/modules/mock-ERC20.ts --network sapphire-testnet
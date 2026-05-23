import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Token", (m) => {

  const mockERC20 = m.contract("MockERC20", [
    'Wikitruth Coin',
    'WTRC'
  ]);
  
  return { mockERC20 };
});

// 1. npx hardhat ignition deploy ignition/modules/04_ERC20.ts --network sapphire-testnet
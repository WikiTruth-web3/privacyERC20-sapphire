import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// 1. npx hardhat ignition deploy ignition/modules/05_ERC20Privacy.ts --network sapphire-testnet

export default buildModule("ERC20Privacy", (m) => {

  const WROSE_ADDRESS = '0xB759a0fbc1dA517aF257D5Cf039aB4D86dFB3b94'

  const wrosePrivacy = m.contract("WROSEPrivacy", [
    WROSE_ADDRESS
  ]);

  // const mockERC20 = ''

  // const ERC20Privacy = m.contract("ERC20Privacy", [
  //   mockERC20
  // ]);
  
  return { 
    wrosePrivacy, 
    // ERC20Privacy 
  };
});

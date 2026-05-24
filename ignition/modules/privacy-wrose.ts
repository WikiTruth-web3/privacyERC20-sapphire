import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// 1. npx hardhat ignition deploy ignition/modules/privacy-wrose.ts --network sapphire-testnet

export default buildModule("Privacy_WROSE_260514", (m) => {

  const WROSE_ADDRESS = '0xB759a0fbc1dA517aF257D5Cf039aB4D86dFB3b94'
  // Personalization string converted to hex (represents "PrivacyWROSE_Pers_Key")
  const PERS_SEED = '0x5072697661637957524f53455f506572735f4b6579'

  const PrivacyWROSE = m.contract("contracts/PrivacyWROSE.sol:PrivacyWROSE", [
    WROSE_ADDRESS,
    PERS_SEED
  ]);

  return { 
    PrivacyWROSE, 
    // ERC20Privacy 
  };
});

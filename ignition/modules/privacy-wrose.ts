import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";
// 1. npx hardhat ignition deploy ignition/modules/privacy-wrose.ts --network sapphire-testnet

export default buildModule("Privacy_WROSE_260525", (m) => {

  const WROSE_ADDRESS = '0xB759a0fbc1dA517aF257D5Cf039aB4D86dFB3b94'
  // Personalization string converted to hex (represents "PrivacyWROSE_Pers_Key")
  const PERS_SEED = ethers.hexlify(ethers.randomBytes(32));

  const PrivacyWROSE = m.contract("contracts/PrivacyWROSE.sol:PrivacyWROSE", [
    WROSE_ADDRESS,
    PERS_SEED
  ]);

  return { 
    PrivacyWROSE, 
    // ERC20Privacy 
  };
});

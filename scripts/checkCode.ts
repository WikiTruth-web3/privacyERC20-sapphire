import { ethers } from "hardhat";
import { erc20_address_testnet } from "../signers-contracts/erc20_address";

async function main() {
    const provider = ethers.provider;
    const wroseCode = await provider.getCode(erc20_address_testnet.wROSE);
    const privacyWroseCode = await provider.getCode(erc20_address_testnet.PrivacyWROSE);

    console.log("wROSE Code Length:", wroseCode.length - 2);
    console.log("PrivacyWROSE Code Length:", privacyWroseCode.length - 2);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

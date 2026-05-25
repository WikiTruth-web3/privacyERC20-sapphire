import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";


/**
 * 
 * @returns 获取sapphire-testnet测试网的Signer
 * 
 * 运行命令：npx hardhat run scripts/utils/signers-sapphire-testnet.ts --network sapphire-testnet
 */

interface Signers_SapphireTestnet {
    erc20_deployer_Signer: HardhatEthersSigner | null;
    erc20_user_01_Signer: HardhatEthersSigner | null;
}

export const getSigners_SapphireTestnet = async () : Promise<Signers_SapphireTestnet> => {

    const network = await ethers.provider.getNetwork();
    if (Number(network.chainId) !== 23295) {
        console.error("当前网络ID不是23295，请检查网络ID");
        return {
            erc20_deployer_Signer: null,
            erc20_user_01_Signer: null
        };
    }
    
    const signers = await ethers.getSigners();
    const erc20_deployer_Signer = signers[0];
    const erc20_user_01_Signer = signers[1];

    return {
        erc20_deployer_Signer,
        erc20_user_01_Signer
    }
}

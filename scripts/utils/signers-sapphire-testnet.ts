import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";


/**
 * 
 * @returns 获取sapphire-testnet测试网的Signer
 * 
 * 运行命令：npx hardhat run scripts/utils/signers-sapphire-testnet.ts --network sapphire-testnet
 */

interface Signers_SapphireTestnet {
    adminSigner: HardhatEthersSigner | null;
    minterSigner: HardhatEthersSigner | null;
    buyerSigner: HardhatEthersSigner | null;
    buyer2Signer: HardhatEthersSigner | null;
    sellerSigner: HardhatEthersSigner | null;
    completerSigner: HardhatEthersSigner | null;
    daoFundManagerSigner: HardhatEthersSigner | null;
}

export const getSigners_SapphireTestnet = async () : Promise<Signers_SapphireTestnet> => {

    const network = await ethers.provider.getNetwork();
    if (Number(network.chainId) !== 23295) {
        console.error("当前网络ID不是23295，请检查网络ID");
        return {
            adminSigner: null,
            minterSigner: null,
            buyerSigner: null,
            buyer2Signer: null,
            sellerSigner: null,
            completerSigner: null,
            daoFundManagerSigner: null
        };
    }
    
    const signers = await ethers.getSigners();
    const adminSigner = signers[0];
    const minterSigner = signers[1];
    const buyerSigner = signers[2];
    const buyer2Signer = signers[3];
    const sellerSigner = signers[4];
    const completerSigner = signers[5];
    const daoFundManagerSigner = signers[6];

    return {
        adminSigner,
        minterSigner,
        buyerSigner,
        buyer2Signer,
        sellerSigner,
        completerSigner,
        daoFundManagerSigner
    }
}

// async function main() {
//     console.log("开始获取sapphire-testnet测试网的Signer...");

//     // 检查chainId 
//     const network = await ethers.provider.getNetwork();
//     console.log("🌐 当前网络ID:", network.chainId);
//     if (Number(network.chainId) !== 23295) {
//         console.error("当前网络ID不是23295，请检查网络ID");
//         return;
//     }

//     const signers = await ethers.getSigners();
//     const adminSigner = signers[0];
//     const minterSigner = signers[1];
//     const buyerSigner = signers[2];
//     const buyer2Signer = signers[3];
//     const sellerSigner = signers[4];
//     const completerSigner = signers[5];
//     const daoFundManagerSigner = signers[6];

//     console.log("adminSigner:", adminSigner.address);
//     console.log("minterSigner:", minterSigner.address);
//     console.log("buyerSigner:", buyerSigner.address);
//     console.log("buyer2Signer:", buyer2Signer.address);
//     console.log("sellerSigner:", sellerSigner.address);
//     console.log("completerSigner:", completerSigner.address);
//     console.log("daoFundManagerSigner:", daoFundManagerSigner.address);

// }

// // 运行部署脚本
// main()
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error("失败:", error);
//         process.exit(1);
//     });

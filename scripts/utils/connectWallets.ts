// import { ethers } from "hardhat";
// import { Signer, Wallet } from "ethers";
// import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
// import {
//     user_evm_WikiTruth,
//     user_oasis_WikiTruth
// } from "../../WikiTruth_account";
// // import { wrapEthereumProvider } from "@oasisprotocol/sapphire-paratime";

// // import { domainList } from "../../test/utils";

// /**
//  * 
//  * @returns 初始化WikiTruth的合约至sapphire-testnet测试网
//  * 
//  * 运行命令：npx hardhat run scripts/utils/connects.ts --network sapphire-testnet
//  */

// export interface ConnectWalletsResult {
//     adminSigner: Signer|HardhatEthersSigner | Wallet | null;
//     minterSigner: Signer | HardhatEthersSigner | Wallet | null;
//     buyerSigner: Signer | HardhatEthersSigner | Wallet | null;
//     buyer2Signer: Signer | HardhatEthersSigner | Wallet | null;
//     sellerSigner: Signer | HardhatEthersSigner | Wallet | null;
//     completerSigner: Signer | HardhatEthersSigner | Wallet | null;
// }

// export const connectWallets = async function () : Promise<ConnectWalletsResult> {
//     console.log("开始连接钱包...");

//     let accounts

//     // 检查chainId 
//     const network = await ethers.provider.getNetwork();
//     if (Number(network.chainId) === 23295 ) {
//         accounts = user_evm_WikiTruth;
//     } else if (Number(network.chainId) === 23294 ) {
//         accounts = user_oasis_WikiTruth;
//     } 

//     let result: ConnectWalletsResult = {
//         adminSigner: null,
//         minterSigner: null,
//         buyerSigner: null,
//         buyer2Signer: null,
//         sellerSigner: null,
//         completerSigner: null
//     };

//     if (!accounts) {
//         console.error("网络ID不存在");
//         return result;
//     }

//     // 判断是本地网络还是测试网/主网
//     const isLocalNetwork = [31337, 23293].includes(Number(network.chainId)); // localhost 和 sapphire_localnet

//     let adminSigner, minterSigner, buyerSigner, buyer2Signer, sellerSigner, completerSigner;

//     // 先 wrap provider
// // const provider = wrapEthereumProvider(ethers.provider as any);


//     if (isLocalNetwork) {
//         // 本地网络：使用 ethers.getSigner（Hardhat 管理私钥）
//         adminSigner = await ethers.getSigner(accounts.admin.address!);
//         minterSigner = await ethers.getSigner(accounts.minter.address!);
//         buyerSigner = await ethers.getSigner(accounts.buyer.address!);
//         buyer2Signer = await ethers.getSigner(accounts.buyer2.address!);
//         sellerSigner = await ethers.getSigner(accounts.seller.address!);
//         completerSigner = await ethers.getSigner(accounts.completer.address!);
//     } else {
//         // 测试网/主网：使用私钥创建 Wallet
//         if (!accounts.admin.privateKey || 
//             !accounts.minter.privateKey || 
//             !accounts.buyer.privateKey || 
//             !accounts.buyer2.privateKey ||
//             !accounts.seller.privateKey || 
//             !accounts.completer.privateKey
//         ) {
//             console.error("No private key");
//             return result;
//         }

//         adminSigner = new ethers.Wallet(accounts.admin.privateKey, ethers.provider );
//         minterSigner = new ethers.Wallet(accounts.minter.privateKey, ethers.provider);
//         buyerSigner = new ethers.Wallet(accounts.buyer.privateKey, ethers.provider);
//         buyer2Signer = new ethers.Wallet(accounts.buyer2.privateKey, ethers.provider);
//         sellerSigner = new ethers.Wallet(accounts.seller.privateKey, ethers.provider);
//         completerSigner = new ethers.Wallet(accounts.completer.privateKey,ethers.provider);
//     }

//     // 验证签名者地址是否正确
//     if (adminSigner.address.toLowerCase() !== accounts.admin.address!.toLowerCase()) {
//         console.error("adminSigner 地址不匹配");
//         return result;
//     }
//     if (minterSigner.address.toLowerCase() !== accounts.minter.address!.toLowerCase()) {
//         console.error("minterSigner 地址不匹配");
//         return result;
//     }
//     if (buyerSigner.address.toLowerCase() !== accounts.buyer.address!.toLowerCase()) {
//         console.error("buyerSigner 地址不匹配");
//         return result;
//     }
//     if (buyer2Signer.address.toLowerCase() !== accounts.buyer2.address!.toLowerCase()) {
//         console.error("buyer2Signer 地址不匹配");
//         return result;
//     }
//     if (sellerSigner.address.toLowerCase() !== accounts.seller.address!.toLowerCase()) {
//         console.error("sellerSigner 地址不匹配");
//         return result;
//     }
//     if (completerSigner.address.toLowerCase() !== accounts.completer.address!.toLowerCase()) {
//         console.error("completerSigner 地址不匹配");
//         return result;
//     }

//     console.log("✅ 所有签名者创建成功");

//     return {
//         adminSigner,
//         minterSigner,
//         buyerSigner,
//         buyer2Signer,
//         sellerSigner,
//         completerSigner
//     }

//     // =========================================== View functions=============================================

// }

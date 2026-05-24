import { expect } from "chai";
import { ethers } from "hardhat";
import { erc20_address_testnet } from "../utils/erc20_address";
import { getSigners_SapphireTestnet } from "../utils/signers-sapphire-testnet";
import { createGetUserIdSignature } from "../utils/privacyUtils";

describe("PrivacyWROSE - UserId & Virtual Address Conversion Tests", function () {
    this.timeout(60000);

    let admin: any;
    let user1: any;
    let underlyingToken: any;
    let privacyToken: any;
    let chainId: number;

    before(async function () {
        const network = await ethers.provider.getNetwork();
        chainId = Number(network.chainId);
        console.log(`🌐 Testing conversions on Network: ${network.name || "Hardhat"}, Chain ID: ${chainId}`);

        // Fetch accounts
        const signers = await getSigners_SapphireTestnet();
        if (signers.erc20_deployer_Signer && signers.erc20_user_01_Signer) {
            admin = signers.erc20_deployer_Signer;
            user1 = signers.erc20_deployer_Signer;
            console.log(`Using Sapphire Testnet Signers`);
        } else {
            const localSigners = await ethers.getSigners();
            admin = localSigners[0];
            user1 = localSigners[0];
            console.log(`Using Local Hardhat Signers`);
        }

        // Connect to pre-deployed contracts
        underlyingToken = await ethers.getContractAt("contracts/WrappedROSE.sol:WrappedROSE", erc20_address_testnet.wROSE);
        privacyToken = await ethers.getContractAt("contracts/PrivacyWROSE.sol:PrivacyWROSE", erc20_address_testnet.PrivacyWROSE);
    });

    it("Should revert getMyUserId if signature is invalid or expired", async function () {
        const user1Address = await user1.getAddress();
        const badSig = {
            r: ethers.ZeroHash,
            s: ethers.ZeroHash,
            v: 27
        };
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        await expect(
            privacyToken.getMyUserId(user1Address, deadline, badSig)
        ).to.be.revertedWithCustomError(privacyToken, "EIPError");
    });

    it("Should securely retrieve EOA's own raw userId with valid signature", async function () {
        const user1Address = await user1.getAddress();
        const { signature, deadline } = await createGetUserIdSignature(
            user1,
            await privacyToken.getAddress(),
            chainId
        );

        const userId = await privacyToken.getMyUserId(user1Address, deadline, signature);
        expect(userId).to.not.equal(ethers.ZeroHash);
        console.log(`User1 raw userId: ${userId}`);
    });

    it("Should securely retrieve EOA's own virtual address with valid signature", async function () {
        const user1Address = await user1.getAddress();
        const { signature, deadline } = await createGetUserIdSignature(
            user1,
            await privacyToken.getAddress(),
            chainId
        );

        const virtualAddr = await privacyToken.getMyVirtualAddress(user1Address, deadline, signature);
        expect(virtualAddr).to.not.equal(ethers.ZeroAddress);
        console.log(`User1 Virtual Address: ${virtualAddr}`);
    });

    it("Should allow public retrieval of contract's userId", async function () {
        const contractAddr = await underlyingToken.getAddress();
        const contractUserId = await privacyToken.getContractUserId(contractAddr);
        expect(contractUserId).to.not.equal(ethers.ZeroHash);
        console.log(`wROSE Contract userId: ${contractUserId}`);
    });

    it("Should revert getContractUserId for EOA addresses", async function () {
        const user1Address = await user1.getAddress();
        await expect(
            privacyToken.getContractUserId(user1Address)
        ).to.be.revertedWithCustomError(privacyToken, "NotContractAddress");
    });
});

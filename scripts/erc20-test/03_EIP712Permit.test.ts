import { expect } from "chai";
import { ethers } from "hardhat";
import { erc20_address_testnet } from "../utils/erc20_address";
import { getSigners_SapphireTestnet } from "../utils/signers-sapphire-testnet";
import {
    createEIP712Permit,
    createGetUserIdSignature,
    PermitType
} from "../utils/privacyUtils";

// Helper function to sleep for preventing network overload on sapphire testnet
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("PrivacyWROSE - EIP712 Permit Tests", function () {
    // Extend timeout for testnet transaction confirmations
    this.timeout(180000);

    let admin: any;
    let user1: any;
    let user2: any;
    let underlyingToken: any;
    let privacyToken: any;
    let chainId: number;

    const wrapAmount = ethers.parseEther("10");
    const transferAmount = ethers.parseEther("3");

    before(async function () {
        const network = await ethers.provider.getNetwork();
        chainId = Number(network.chainId);
        console.log(`🌐 Testing EIP712 Permits on Network: ${network.name || "Hardhat"}, Chain ID: ${chainId}`);

        // Fetch accounts
        const signers = await getSigners_SapphireTestnet();
        if (signers.erc20_deployer_Signer && signers.erc20_user_01_Signer) {
            admin = signers.erc20_deployer_Signer;
            user1 = signers.erc20_deployer_Signer;
            user2 = signers.erc20_user_01_Signer;
            console.log(`Using Sapphire Testnet Signers`);
        } else {
            const localSigners = await ethers.getSigners();
            admin = localSigners[0];
            user1 = localSigners[0];
            user2 = localSigners[1];
            console.log(`Using Local Hardhat Signers`);
        }

        // Connect to pre-deployed contracts
        underlyingToken = await ethers.getContractAt("contracts/WrappedROSE.sol:WrappedROSE", erc20_address_testnet.wROSE);
        privacyToken = await ethers.getContractAt("contracts/PrivacyWROSE.sol:PrivacyWROSE", erc20_address_testnet.PrivacyWROSE);

        // Ensure user1 has enough underlying wROSE
        const bal1 = await underlyingToken.balanceOf(await user1.getAddress());
        if (bal1 < ethers.parseEther("50")) {
            console.log("Depositing native ROSE to get wROSE for user1...");
            const tx = await underlyingToken.connect(user1).deposit({ value: ethers.parseEther("100") });
            await tx.wait();
            await sleep(5000);
        }

        // Ensure user2 has enough underlying wROSE
        const bal2 = await underlyingToken.balanceOf(await user2.getAddress());
        if (bal2 < ethers.parseEther("50")) {
            console.log("Depositing native ROSE to get wROSE for user2...");
            const tx = await underlyingToken.connect(user2).deposit({ value: ethers.parseEther("100") });
            await tx.wait();
            await sleep(5000);
        }

        // Approve privacyToken to spend wROSE
        const allowance1 = await underlyingToken.allowance(await user1.getAddress(), await privacyToken.getAddress());
        if (allowance1 < ethers.parseEther("1000")) {
            console.log("Approving PrivacyWROSE to spend user1's wROSE...");
            const tx = await underlyingToken.connect(user1).approve(await privacyToken.getAddress(), ethers.MaxUint256);
            await tx.wait();
            await sleep(5000);
        }

        const allowance2 = await underlyingToken.allowance(await user2.getAddress(), await privacyToken.getAddress());
        if (allowance2 < ethers.parseEther("1000")) {
            console.log("Approving PrivacyWROSE to spend user2's wROSE...");
            const tx = await underlyingToken.connect(user2).approve(await privacyToken.getAddress(), ethers.MaxUint256);
            await tx.wait();
            await sleep(5000);
        }

        // Pre-wrap some tokens to ensure user1 has privacy WROSE balance for permit test
        console.log("Ensuring user1 has privacy token balance...");
        const viewPermit = await createEIP712Permit(
            user1, await user2.getAddress(), 0, PermitType.View, await privacyToken.getAddress(), chainId
        );
        const pBal = await privacyToken.balanceOfWithPermit(viewPermit);
        if (pBal < ethers.parseEther("20")) {
            const tx = await privacyToken.connect(user1).wrap(ethers.parseEther("30"));
            await tx.wait();
            await sleep(5000);
        }
    });

    it("Should retrieve EOA's balance using EIP-712 Permit (VIEW)", async function () {
        const permit = await createEIP712Permit(
            user1,
            await user2.getAddress(),
            0,
            PermitType.View,
            await privacyToken.getAddress(),
            chainId
        );

        const balance = await privacyToken.connect(user2).balanceOfWithPermit(permit);
        expect(balance).to.be.greaterThanOrEqual(0);
    });

    it("Should retrieve allowance using EIP-712 Permit with virtual spender address", async function () {
        const user2Address = await user2.getAddress();
        
        // Get virtual address of user2
        const { signature: sig2, deadline: dl2 } = await createGetUserIdSignature(
            user2, await privacyToken.getAddress(), chainId
        );
        const virtualAddr2 = await privacyToken.getMyVirtualAddress(user2Address, dl2, sig2);

        const permit = await createEIP712Permit(
            user1,
            virtualAddr2,
            0,
            PermitType.View,
            await privacyToken.getAddress(),
            chainId
        );

        const allowance = await privacyToken.connect(user2).allowanceWithPermit(permit);
        expect(allowance).to.be.greaterThanOrEqual(0);
    });

    it("Should allow transferWithPermit using virtual receiver address", async function () {
        const user1Address = await user1.getAddress();
        const user2Address = await user2.getAddress();

        // Get virtual address of user2 (recipient)
        const { signature: sig2, deadline: dl2 } = await createGetUserIdSignature(
            user2, await privacyToken.getAddress(), chainId
        );
        const virtualAddr2 = await privacyToken.getMyVirtualAddress(user2Address, dl2, sig2);

        // Get virtual address of user1
        const { signature: sig1, deadline: dl1 } = await createGetUserIdSignature(
            user1, await privacyToken.getAddress(), chainId
        );
        const virtualAddr1 = await privacyToken.getMyVirtualAddress(user1Address, dl1, sig1);

        // Prepare view permits
        const user1ViewPermit = await createEIP712Permit(
            user1, virtualAddr2, 0, PermitType.View, await privacyToken.getAddress(), chainId
        );
        const user2ViewPermit = await createEIP712Permit(
            user2, virtualAddr1, 0, PermitType.View, await privacyToken.getAddress(), chainId
        );
        
        const bal1Before = await privacyToken.balanceOfWithPermit(user1ViewPermit);
        const bal2Before = await privacyToken.balanceOfWithPermit(user2ViewPermit);

        // Create transfer permit (User1 permits User2 to execute transfer of transferAmount to user2's virtual address)
        // Spender here acts as the destination virtual address
        const permit = await createEIP712Permit(
            user1,
            virtualAddr2,
            transferAmount,
            PermitType.Transfer,
            await privacyToken.getAddress(),
            chainId
        );

        // Execute transferWithPermit
        const tx = await privacyToken.connect(user2).transferWithPermit(permit);
        await tx.wait();
        await sleep(5000);

        const bal1After = await privacyToken.balanceOfWithPermit(user1ViewPermit);
        const bal2After = await privacyToken.balanceOfWithPermit(user2ViewPermit);

        expect(bal1Before - bal1After).to.equal(transferAmount);
        expect(bal2After - bal2Before).to.equal(transferAmount);
    });

    it("Should allow approveWithPermit using virtual spender address", async function () {
        const user1Address = await user1.getAddress();
        const user2Address = await user2.getAddress();

        // Get virtual address of user2 (spender)
        const { signature: sig2, deadline: dl2 } = await createGetUserIdSignature(
            user2, await privacyToken.getAddress(), chainId
        );
        const virtualAddr2 = await privacyToken.getMyVirtualAddress(user2Address, dl2, sig2);

        // Create approve permit (User1 permits User2's virtual address to spend transferAmount)
        const permit = await createEIP712Permit(
            user1,
            virtualAddr2,
            transferAmount,
            PermitType.Approve,
            await privacyToken.getAddress(),
            chainId
        );

        // Execute approveWithPermit
        const tx = await privacyToken.connect(user2).approveWithPermit(permit);
        await tx.wait();
        await sleep(5000);

        // Check allowance using permit
        const viewPermitForAllowance = await createEIP712Permit(
            user1,
            virtualAddr2,
            0,
            PermitType.View,
            await privacyToken.getAddress(),
            chainId
        );
        const allowance = await privacyToken.connect(user2).allowanceWithPermit(viewPermitForAllowance);
        expect(allowance).to.equal(transferAmount);
    });
});

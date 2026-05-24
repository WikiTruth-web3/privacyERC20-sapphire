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

describe("PrivacyWROSE - Virtual Address ERC20 Tests", function () {
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
        console.log(`🌐 Testing ERC20 operations on Network: ${network.name || "Hardhat"}, Chain ID: ${chainId}`);

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
    });

    it("Should wrap wROSE tokens into encrypted privacy balance", async function () {
        const user2Address = await user2.getAddress();
        const viewPermit = await createEIP712Permit(
            user1, user2Address, 0, PermitType.View, await privacyToken.getAddress(), chainId
        );
        const balBefore = await privacyToken.balanceOfWithPermit(viewPermit);

        const wrapTx = await privacyToken.connect(user1).wrap(wrapAmount);
        await wrapTx.wait();
        await sleep(5000);

        const balAfter = await privacyToken.balanceOfWithPermit(viewPermit);
        expect(balAfter - balBefore).to.equal(wrapAmount);
    });

    it("Should unwrap privacy tokens back to wROSE tokens", async function () {
        const user2Address = await user2.getAddress();
        const viewPermit = await createEIP712Permit(
            user1, user2Address, 0, PermitType.View, await privacyToken.getAddress(), chainId
        );
        const balBefore = await privacyToken.balanceOfWithPermit(viewPermit);

        const unwrapTx = await privacyToken.connect(user1).unwrap(wrapAmount / 2n);
        await unwrapTx.wait();
        await sleep(5000);

        const balAfter = await privacyToken.balanceOfWithPermit(viewPermit);
        expect(balBefore - balAfter).to.equal(wrapAmount / 2n);
    });

    it("Should allow user to deposit native ROSE directly", async function () {
        const user2Address = await user2.getAddress();
        const viewPermit = await createEIP712Permit(
            user1, user2Address, 0, PermitType.View, await privacyToken.getAddress(), chainId
        );
        const balBefore = await privacyToken.balanceOfWithPermit(viewPermit);
        const depAmount = ethers.parseEther("5");

        const tx = await privacyToken.connect(user1).deposit({ value: depAmount });
        await tx.wait();
        await sleep(5000);

        const balAfter = await privacyToken.balanceOfWithPermit(viewPermit);
        expect(balAfter - balBefore).to.equal(depAmount);
    });

    it("Should allow user to withdraw native ROSE directly", async function () {
        const user2Address = await user2.getAddress();
        const viewPermit = await createEIP712Permit(
            user1, user2Address, 0, PermitType.View, await privacyToken.getAddress(), chainId
        );
        const balBefore = await privacyToken.balanceOfWithPermit(viewPermit);
        const wdrAmount = ethers.parseEther("2");

        const tx = await privacyToken.connect(user1).withdraw(wdrAmount);
        await tx.wait();
        await sleep(5000);

        const balAfter = await privacyToken.balanceOfWithPermit(viewPermit);
        expect(balBefore - balAfter).to.equal(wdrAmount);
    });

    it("Should return 0 for balanceOf if caller is not the owner (EOA)", async function () {
        const user1Address = await user1.getAddress();
        const balance = await privacyToken.connect(user2).balanceOf(user1Address);
        expect(balance).to.equal(0);
    });

    it("Should return balance of contract address for public queries", async function () {
        const contractAddr = await underlyingToken.getAddress();
        
        // Query initial contract balance on PrivacyWROSE
        const initialContractBalance = await privacyToken.connect(user2).balanceOf(contractAddr);

        const wrapTx = await privacyToken.connect(user1).wrap(wrapAmount);
        await wrapTx.wait();
        await sleep(5000);

        // Fetch contract KDF userId and derive its virtual address
        const contractUserId = await privacyToken.getContractUserId(contractAddr);
        const virtualContractAddr = ethers.getAddress("0x" + contractUserId.slice(-40));

        // Transfer to contract's virtual address
        const transferTx = await privacyToken.connect(user1).transfer(virtualContractAddr, transferAmount);
        await transferTx.wait();
        await sleep(5000);

        const contractBalance = await privacyToken.connect(user2).balanceOf(contractAddr);
        expect(contractBalance - initialContractBalance).to.equal(transferAmount);
    });

    it("Should transfer tokens to a virtual address and verify balances via permit", async function () {
        const user1Address = await user1.getAddress();
        const user2Address = await user2.getAddress();

        // Get virtual address of user2
        const { signature: sig2, deadline: dl2 } = await createGetUserIdSignature(
            user2, await privacyToken.getAddress(), chainId
        );
        const virtualAddr2 = await privacyToken.getMyVirtualAddress(user2Address, dl2, sig2);

        // Get virtual address of user1
        const { signature: sig1, deadline: dl1 } = await createGetUserIdSignature(
            user1, await privacyToken.getAddress(), chainId
        );
        const virtualAddr1 = await privacyToken.getMyVirtualAddress(user1Address, dl1, sig1);

        // Permits to query balances
        const user1ViewPermit = await createEIP712Permit(
            user1, virtualAddr2, 0, PermitType.View, await privacyToken.getAddress(), chainId
        );
        const user2ViewPermit = await createEIP712Permit(
            user2, virtualAddr1, 0, PermitType.View, await privacyToken.getAddress(), chainId
        );
        
        const bal1Before = await privacyToken.balanceOfWithPermit(user1ViewPermit);
        const bal2Before = await privacyToken.balanceOfWithPermit(user2ViewPermit);

        // Transfer from user1 to user2's virtual address
        const tx = await privacyToken.connect(user1).transfer(virtualAddr2, transferAmount);
        await tx.wait();
        await sleep(5000);

        // Verify updated balances
        const bal1After = await privacyToken.balanceOfWithPermit(user1ViewPermit);
        const bal2After = await privacyToken.balanceOfWithPermit(user2ViewPermit);

        expect(bal1Before - bal1After).to.equal(transferAmount);
        expect(bal2After - bal2Before).to.equal(transferAmount);
    });

    it("Should allow approve and transferFrom using virtual addresses", async function () {
        const user1Address = await user1.getAddress();
        const user2Address = await user2.getAddress();

        // Get virtual address of user1
        const { signature: sig1, deadline: dl1 } = await createGetUserIdSignature(
            user1, await privacyToken.getAddress(), chainId
        );
        const virtualAddr1 = await privacyToken.getMyVirtualAddress(user1Address, dl1, sig1);

        // Get virtual address of user2
        const { signature: sig2, deadline: dl2 } = await createGetUserIdSignature(
            user2, await privacyToken.getAddress(), chainId
        );
        const virtualAddr2 = await privacyToken.getMyVirtualAddress(user2Address, dl2, sig2);

        // User1 approves user2's virtual address to spend tokens
        const appTx = await privacyToken.connect(user1).approve(virtualAddr2, transferAmount);
        await appTx.wait();
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

        // Prepare balances
        const user1ViewPermit = await createEIP712Permit(
            user1, virtualAddr2, 0, PermitType.View, await privacyToken.getAddress(), chainId
        );
        const user2ViewPermit = await createEIP712Permit(
            user2, virtualAddr1, 0, PermitType.View, await privacyToken.getAddress(), chainId
        );

        const bal1Before = await privacyToken.balanceOfWithPermit(user1ViewPermit);
        const bal2Before = await privacyToken.balanceOfWithPermit(user2ViewPermit);

        // User2 calls transferFrom: transferring from user1's virtual address to user2's virtual address
        const tfTx = await privacyToken.connect(user2).transferFrom(virtualAddr1, virtualAddr2, transferAmount);
        await tfTx.wait();
        await sleep(5000);

        const bal1After = await privacyToken.balanceOfWithPermit(user1ViewPermit);
        const bal2After = await privacyToken.balanceOfWithPermit(user2ViewPermit);

        expect(bal1Before - bal1After).to.equal(transferAmount);
        expect(bal2After - bal2Before).to.equal(transferAmount);
    });
});

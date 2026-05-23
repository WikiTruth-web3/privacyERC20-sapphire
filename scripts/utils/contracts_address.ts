import deploymentInfo from "../../deployments/sapphire_testnet.json";
import deploymentToken from "../../deployments/sapphire_testnet_token.json";
import deploymentImplementation from "../../deployments/sapphire_testnet_implementation.json";



export const core_contracts_address = {
    addressManager: deploymentInfo.AddressManager,
    forwarder: deploymentInfo.Forwarder,
    blindBox: deploymentInfo.BlindBox,
    exchange: deploymentInfo.Exchange,
    fundManager: deploymentInfo.FundManager,
    userManager: deploymentInfo.UserManager,
    siweAuth: deploymentInfo.SiweAuth,
}

export const token_contracts_address ={
    wrosePrivacy: deploymentToken.WROSE_Privacy,
    officialToken: deploymentToken.OfficialToken,
    settlementToken: deploymentToken.OfficialToken_Privacy,
};

export const core_contracts_testnet = [
    {
        name: "AddressManager",
        contract: "AddressManager",
        address: deploymentInfo.AddressManager,
        implementation: deploymentImplementation.AddressManager_Implementation,
    },
    {
        name: "Forwarder",
        contract: "Forwarder",
        address: deploymentInfo.Forwarder,
        implementation: deploymentImplementation.Forwarder_Implementation,
    },
    {
        name: "BlindBox",
        contract: "BlindBox",
        address: deploymentInfo.BlindBox,
        implementation: deploymentImplementation.BlindBox_Implementation,
    },
    {
        name: "Exchange",
        contract: "Exchange",
        address: deploymentInfo.Exchange,
        implementation: deploymentImplementation.Exchange_Implementation,
    },
    {
        name: "FundManager",
        contract: "FundManager",
        address: deploymentInfo.FundManager,
        implementation: deploymentImplementation.FundManager_Implementation,
    },
    {
        name: "UserManager",
        contract: "UserManager",
        address: deploymentInfo.UserManager,
        implementation: deploymentImplementation.UserManager_Implementation,
    },
    {
        name: "SiweAuthWikiTruth",
        contract: "SiweAuthWikiTruth",
        address: deploymentInfo.SiweAuth,
        // implementation: '',
    },
    {
        name: "WROSEprivacy",
        symbol: "wROSE.P",
        contract: "WROSEprivacy",
        address: deploymentToken.WROSE_Privacy,
        // implementation: '',
    },
    {
        name: "OfficialToken",
        symbol: "WTRC",
        contract: "MockERC20",
        address: deploymentToken.OfficialToken,
        // implementation: '',
    },
    {
        name: "SettlementToken",
        symbol: "WTRC.P",
        contract: "ERC20privacy",
        address: deploymentToken.OfficialToken_Privacy,
        // implementation: '',
    },
]



import deploymentERC20 from "../../deployments/sapphire-testnet-erc20.json";



export const erc20_address_testnet ={
    wROSE: deploymentERC20.wROSE,
    PrivacyWROSE: deploymentERC20.wROSE_Privacy,
    // officialToken: deploymentERC20.OfficialToken,
    // settlementToken: deploymentERC20.OfficialToken_Privacy,
    mockERC20: deploymentERC20.Mock_ERC20,
    mockERC20_Privacy: deploymentERC20.Mock_ERC20_Privacy,
};

export const erc20_contracts_testnet = [

    {
        name: "MockERC20",
        symbol: "wROSE.Privacy",
        contract: "MockERC20",
        address: deploymentERC20.Mock_ERC20,
        // implementation: '',
    },
    {
        name: "PrivacyMockERC20",
        symbol: "Mock.Privacy",
        contract: "PrivacyERC20",
        address: deploymentERC20.Mock_ERC20_Privacy,
        // implementation: '',
    },
    {
        name: "WrappedROSE",
        symbol: "wROSE",
        contract: "WrappedROSE",
        address: deploymentERC20.wROSE,
        // implementation: '',
    },
    {
        name: "PrivacyWROSE",
        symbol: "wROSE.Privacy",
        contract: "PrivacyWROSE",
        address: deploymentERC20.wROSE_Privacy,
        // implementation: '',
    },
    // {
    //     name: "OfficialToken",
    //     symbol: "WTRC",
    //     contract: "MockERC20",
    //     address: deploymentERC20.OfficialToken,
    //     // implementation: '',
    // },
    // {
    //     name: "SettlementToken",
    //     symbol: "WTRC.Privacy",
    //     contract: "ERC20privacy",
    //     address: deploymentERC20.OfficialToken_Privacy,
    //     // implementation: '',
    // },
]




export const user_erc20_evm = {
    user: {
        address: process.env.ERC20_deployer_ADDR_EVM,
        privateKey: process.env.ERC20_deployer_PRIVATE_KEY_EVM,
    },
    user_01: {
        address: process.env.ERC20_user_01_ADDR_EVM,
        privateKey: process.env.ERC20_user_01_PRIVATE_KEY_EVM,
    },
}

export const user_erc20_oasis = {
    user: {
        address: process.env.ERC20_deployer_ADDR_OASIS_CONSENSUS,
        privateKey: process.env.ERC20_deployer_PRIVATE_KEY_OASIS_CONSENSUS,
    },
    user_01: {
        address: process.env.ERC20_user_01_ADDR_OASIS_CONSENSUS,
        privateKey: process.env.ERC20_user_01_PRIVATE_KEY_OASIS_CONSENSUS,
    },
}


















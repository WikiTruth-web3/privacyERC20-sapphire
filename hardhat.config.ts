import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-switch-network";
import "@oasisprotocol/sapphire-hardhat";
import "dotenv/config"
import "./tasks"
import "@nomicfoundation/hardhat-foundry";
import "hardhat-abi-exporter";
import { hardhat_accounts } from "./account_hardhat";


const sapphire_testnet_admin = process.env.ADMIN_PRIVATE_KEY_EVM ? process.env.ADMIN_PRIVATE_KEY_EVM : "";
const sapphire_testnet_minter = process.env.MINTER_PRIVATE_KEY_EVM ? process.env.MINTER_PRIVATE_KEY_EVM : "";
const sapphire_testnet_buyer = process.env.BUYER_PRIVATE_KEY_EVM ? process.env.BUYER_PRIVATE_KEY_EVM : "";
const sapphire_testnet_buyer2 = process.env.BUYER2_PRIVATE_KEY_EVM ? process.env.BUYER2_PRIVATE_KEY_EVM : "";
const sapphire_testnet_daoFundManager = process.env.DAO_FUND_MANAGER_PRIVATE_KEY_EVM ? process.env.DAO_FUND_MANAGER_PRIVATE_KEY_EVM : "";

// =============================================================
const sapphire_testnet_user = process.env.Privacy_ERC20_User_PRIVATE_KEY_EVM ? process.env.Privacy_ERC20_User_PRIVATE_KEY_EVM : "";
const sapphire_testnet_user_01 = process.env.Privacy_ERC20_User_01_PRIVATE_KEY_EVM ? process.env.Privacy_ERC20_User_01_PRIVATE_KEY_EVM : "";

const sapphire_mainnet_admin = process.env.ADMIN_PRIVATE_KEY_EVM ? process.env.ADMIN_PRIVATE_KEY_EVM : "";


const config: HardhatUserConfig = {
  solidity: {

    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          viaIR: true
        }
      },
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          viaIR: true
        }
      },
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.7.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ],
    // settings: {
    //   remappings: [
    //     "@oasisprotocol/sapphire-contracts/=node_modules/@oasisprotocol/sapphire-contracts/",
    //     "@oasisprotocol/opl-contracts/=node_modules/@oasisprotocol/sapphire-contracts/contracts/opl/",
    //     "@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/",
    //     "@ignition/=ignition/",
    //     "@wikitruth-v1/=wikitruth-v1/"
    //   ]
    // }
  },
  // 2. 添加 abiExporter 配置
  abiExporter: {
    path: './abi',        // 导出 ABI 的目标目录
    runOnCompile: true,   // 开启编译时自动导出
    clear: true,          // 每次导出前清空目录
    flat: false,          // 按路径层级导出，避免同名合约（如 AddressManager）输出冲突
    only: [':BlindBox$', ':Exchange$', ':FundManager$', ':UserManager$', ':AddressManager$', ':Forwarder$', 'SiweAuth'], // 可选：只导出匹配名称的合约（支持正则）
    spacing: 2,           // JSON 缩进格数
    format: "json",       // 导出格式，支持 "json" 或 "minimal" (极简模式)
  },
  paths: {
    sources: "./contracts-eth", 
    tests: "./test",
    cache: "./cache/contracts-eth",
    artifacts: "./artifacts"
  },
  // paths: {
  //   sources: "./contracts", 
  //   tests: "./test",
  //   cache: "./cache/contracts",
  //   artifacts: "./artifacts/contracts"
  // },
  
  mocha: {
    timeout: 40000
  },
  networks: {
    'localhost': {
      url: 'http://127.0.0.1:8545/',
      // accounts: [
        //  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
      //   "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
      // ],
      chainId: 31337,
    },
    'sapphire_localnet': {
      url: "http://localhost:8545",
      chainId: 0x5afd, // 23293 
      accounts: [
        ...hardhat_accounts.map((account) => account.privateKey),
      ],
    },
    // ------------------------------
    // 'bsc-mainnet': {
    //   url: process.env.BSC_MAINNET_Infura_RPC_1,
    //   chainId: 56,
    //   accounts: bscAccounts_1,
    // },
    // 'bsc-testnet': {
    //   url: 'https://bsc-testnet-rpc.publicnode.com',
    //   // url: 'https://bsc-testnet.blockpi.network/v1/rpc/public',
    //   // url: `https://bsc-testnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    //   chainId: 97,
    //   accounts: bscAccounts_1,
    // },
    // ------------------------------
    'sapphire-mainnet': {
      url: process.env.OASIS_Mainnet_Chainstack_RPC_1,
      chainId: 0x5afe, // 23294
      accounts: [
        sapphire_mainnet_admin,
      ],
    },
    'sapphire-testnet': {
      url: "https://testnet.sapphire.oasis.io",
      chainId: 0x5aff, // 23295 
      accounts: [
        sapphire_testnet_admin,
        sapphire_testnet_minter,
        sapphire_testnet_buyer,
        sapphire_testnet_buyer2,
        sapphire_testnet_user,
        sapphire_testnet_user_01,
        sapphire_testnet_daoFundManager,
      ]
    },
  },
  // add verify config
  // pnpm hardhat verify --network sapphire-testnet DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"
  etherscan: {
		//  Enabled by default (not supported on Sapphire)
		enabled: false,
		apiKey: {
			"sapphire-testnet": "test" // 占位符，Sapphire 不使用 Etherscan
		}
	},
	// sourcify: {
		// Disabled by default
		// Doesn't need an API key
	// 	enabled: true
	// }

};

export default config;

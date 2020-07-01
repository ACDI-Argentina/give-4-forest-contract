const { usePlugin } = require('@nomiclabs/buidler/config')
const hooks = require('./scripts/buidler-hooks')

usePlugin('@aragon/buidler-aragon')
usePlugin('buidler-deploy');

module.exports = {
  // Default Buidler configurations. Read more about it at https://buidler.dev/config/
  defaultNetwork: 'localhost',
  //defaultNetwork: 'rsk',
  networks: {
    localhost: {
      url: 'http://localhost:8545',
      timeout: 60000      
    },
    buidlerevm: {
      allowUnlimitedContractSize: true
    },
    rsk: {
      url: 'http://localhost:4444',
      accounts: 'remote',
      gas: 6000000,
      timeout: 60000
    },
  },
  solc: {
    version: '0.4.24',
    optimizer: {
      enabled: true,
      runs: 10000,
    },
  },
  // Etherscan plugin configuration. Learn more at https://github.com/nomiclabs/buidler/tree/master/packages/buidler-etherscan
  etherscan: {
    apiKey: '', // API Key for smart contract verification. Get yours at https://etherscan.io/apis
  },
  // Aragon plugin configuration
  aragon: {
    appServePort: 8001,
    clientServePort: 3000,
    appSrcPath: 'app/',
    appBuildOutputPath: 'dist/',
    appName: 'first-dao',
    hooks, // Path to script hooks
    nodes: {
      defaultEth: 'ws://localhost:8545/websocket'
    }
    /*deployedAddresses: {
      ens: '0x9a16bCfC7c2D996694C9854B8C23b3A0C477b1c8',
      apm: '0xF73c04c9eAAc370845ce26da230B7769546ed45d',
      daoFactory: '0xEB71c55A85016d201718b7B08701b495548fe6aD'
    } */
  },
  // Deploy plugin configuration
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
    },
    delegate: {
      default: 1, // DAC Dalegate
    }
  },
  paths: {
    deploy: 'deploy',
    deployments: 'deployments'
  }
}

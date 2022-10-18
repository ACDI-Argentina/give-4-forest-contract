const { hash } = require('eth-ens-namehash')
const { getEventArgument } = require('@aragon/contract-test-helpers/events')
const Kernel = artifacts.require('@aragon/os/build/contracts/kernel/Kernel')
const ACL = artifacts.require('@aragon/os/build/contracts/acl/ACL')
const EVMScriptRegistryFactory = artifacts.require(
  '@aragon/os/build/contracts/factory/EVMScriptRegistryFactory'
)
const DAOFactory = artifacts.require(
  '@aragon/os/build/contracts/factory/DAOFactory'
)

const newDao = async (deployer) => {

  let kernelBase;
  if (process.env.DAO_KERNEL_BASE_ADDRESS) {
    // Se especificó la dirección del DAO Kernel.
    kernelBase = await Kernel.at(process.env.DAO_KERNEL_BASE_ADDRESS);
    console.log(`   - DAO - Kernel Base: ${kernelBase.address}`);
  } else {
    kernelBase = await Kernel.new(true, { from: deployer });
    console.log(`   - DAO - Deploy Kernel Base: ${kernelBase.address}`);
  }
  
  let aclBase;
  if (process.env.DAO_ACL_BASE_ADDRESS) {
    // Se especificó la dirección del DAO ACL.
    aclBase = await ACL.at(process.env.DAO_ACL_BASE_ADDRESS);
    console.log(`   - DAO - ACL Base: ${aclBase.address}`);
  } else {
    aclBase = await ACL.new({ from: deployer });
    console.log(`   - DAO - Deploy ACL Base: ${aclBase.address}`);
  }
  
  let registryFactory;
  if (process.env.DAO_REGISTRY_FACTORY_ADDRESS) {
    // Se especificó la dirección del DAO Registry Factory.
    registryFactory = await EVMScriptRegistryFactory.at(process.env.DAO_REGISTRY_FACTORY_ADDRESS);
    console.log(`   - DAO - Registry Factory: ${registryFactory.address}`);
  } else {
    registryFactory = await EVMScriptRegistryFactory.new({ from: deployer });
    console.log(`   - DAO - Deploy Registry Factory: ${registryFactory.address}`);
  }
  
  let daoFactory;
  if (process.env.DAO_FACTORY_ADDRESS) {
    // Se especificó la dirección del DAO Factory.
    daoFactory = await DAOFactory.at(process.env.DAO_FACTORY_ADDRESS);
    console.log(`   - DAO - Factory: ${daoFactory.address}`);
  } else {
    daoFactory = await DAOFactory.new(
      kernelBase.address,
      aclBase.address,
      registryFactory.address
    );
    console.log(`   - DAO - Deploy Factory: ${daoFactory.address}`);
  }

  // Create a DAO instance.
  const daoReceipt = await daoFactory.newDAO(deployer)
  const dao = await Kernel.at(getEventArgument(daoReceipt, 'DeployDAO', 'dao'))

  // Grant the deployer address permission to install apps in the DAO.
  const acl = await ACL.at(await dao.acl())
  const APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
  await acl.createPermission(
    deployer,
    dao.address,
    APP_MANAGER_ROLE,
    deployer,
    { from: deployer }
  )

  return { kernelBase, aclBase, dao, acl }
}

const newApp = async (dao, appName, baseAppAddress, deployer) => {
  const receipt = await dao.newAppInstance(
    hash(`${appName}`), // appId - Unique identifier for each app installed in the DAO; can be any bytes32 string in the tests.
    baseAppAddress, // appBase - Location of the app's base implementation.
    '0x', // initializePayload - Used to instantiate and initialize the proxy in the same call (if given a non-empty bytes string).
    false, // setDefault - Whether the app proxy is the default proxy.
    { from: deployer }
  )

  // Find the deployed proxy address in the tx logs.
  const logs = receipt.logs
  const log = logs.find((l) => l.event === 'NewAppProxy')
  const proxyAddress = log.args.proxy

  return proxyAddress
}

module.exports = {
  newDao,
  newApp
}

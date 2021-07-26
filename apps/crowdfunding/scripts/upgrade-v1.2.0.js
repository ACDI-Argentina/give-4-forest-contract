const bre = require("@nomiclabs/buidler")
const { hash } = require('eth-ens-namehash')
const Crowdfunding = bre.artifacts.require('Crowdfunding')
const Kernel = bre.artifacts.require('@aragon/os/build/contracts/kernel/Kernel')

async function main() {

  console.log(`Upgrade v1.2.0`);
  console.log(` - BUIDLER_NETWORK: ${process.env.BUIDLER_NETWORK}`);
  console.log(` - CROWDFUNDING_ADDRESS: ${process.env.CROWDFUNDING_ADDRESS}`);

  const { deployer } = await bre.getNamedAccounts();

  console.log(`Crowdfunding compile`);
  await bre.run("compile");

  console.log(`Crowdfunding deploy`);

  const crowdfundingBase = await Crowdfunding.new({ from: deployer });

  console.log(` - Crowdfunding Base: ${crowdfundingBase.address}`);

  // Actualización de la DAO

  const dao = await Kernel.at(process.env.DAO_ADDRESS);
  const namespace = await dao.APP_BASES_NAMESPACE();
  const appId = hash('crowdfunding');
  const appAddress = crowdfundingBase.address;

  console.log(` - Upgrade app`);
  console.log(`   - DAO Address: ${process.env.DAO_ADDRESS}`);
  console.log(`   - Namespace: ${namespace}`);
  console.log(`   - App Id: ${appId}`);
  console.log(`   - App Address: ${appAddress}`);

  await dao.setApp(namespace, appId, appAddress,
    { from: deployer }
  )
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
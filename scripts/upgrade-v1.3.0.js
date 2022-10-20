const bre = require("@nomiclabs/buidler")
const { hash } = require('eth-ens-namehash')
const { linkLibByAddress,
  ARRAY_LIB_PLACEHOLDER,
  ENTITY_LIB_PLACEHOLDER,
  DAC_LIB_PLACEHOLDER,
  CAMPAIGN_LIB_PLACEHOLDER,
  MILESTONE_LIB_PLACEHOLDER,
  ACTIVITY_LIB_PLACEHOLDER,
  DONATION_LIB_PLACEHOLDER } = require('./libs')
const Crowdfunding = bre.artifacts.require('Crowdfunding')
const Kernel = bre.artifacts.require('@aragon/os/build/contracts/kernel/Kernel')

function sleep() {
  const network = process.env.BUIDLER_NETWORK;
  if (network === "rskTestnet") {
    // 1 minuto
    return new Promise(resolve => setTimeout(resolve, 60000));
  } else if (network === "rskMainnet") {
    // 5 minuto
    return new Promise(resolve => setTimeout(resolve, 300000));
  }
  return new Promise(resolve => setTimeout(resolve, 1));
}

async function main() {

  const network = process.env.BUIDLER_NETWORK;
  const daoContractAddress = process.env.DAO_CONTRACT_ADDRESS;
  const arrayLibAddress = process.env.ARRAY_LIB_ADDRESS;
  const entityLibAddress = process.env.ENTITY_LIB_ADDRESS;
  const dacLibAddress = process.env.DAC_LIB_ADDRESS;
  const campaignLibAddress = process.env.CAMPAIGN_LIB_ADDRESS;
  const milestoneLibAddress = process.env.MILESTONE_LIB_ADDRESS;
  const activityLibAddress = process.env.ACTIVITY_LIB_ADDRESS;
  const donationLibAddress = process.env.DONATION_LIB_ADDRESS;

  console.log(`Upgrade v1.3.0`);
  console.log(` - BUIDLER_NETWORK: ${network}`);
  console.log(` - DAO_CONTRACT_ADDRESS: ${daoContractAddress}`);
  console.log(` - ARRAY_LIB_ADDRESS: ${arrayLibAddress}`);
  console.log(` - ENTITY_LIB_ADDRESS: ${entityLibAddress}`);
  console.log(` - DAC_LIB_ADDRESS: ${dacLibAddress}`);
  console.log(` - CAMPAIGN_LIB_ADDRESS: ${campaignLibAddress}`);
  console.log(` - MILESTONE_LIB_ADDRESS: ${milestoneLibAddress}`);
  console.log(` - ACTIVITY_LIB_ADDRESS: ${activityLibAddress}`);
  console.log(` - DONATION_LIB_ADDRESS: ${donationLibAddress}`);

  const { deployer } = await bre.getNamedAccounts();

  console.log(`Crowdfunding compile`);
  await bre.run("compile");

  console.log(`Crowdfunding deploy`);

  // Link Crowdfunding > ArrayLib
  await linkLibByAddress(arrayLibAddress, Crowdfunding, ARRAY_LIB_PLACEHOLDER);
  // Link Crowdfunding > EntityLib
  await linkLibByAddress(entityLibAddress, Crowdfunding, ENTITY_LIB_PLACEHOLDER);
  // Link Crowdfunding > DacLib
  await linkLibByAddress(dacLibAddress, Crowdfunding, DAC_LIB_PLACEHOLDER);
  // Link Crowdfunding > CampaignLib
  await linkLibByAddress(campaignLibAddress, Crowdfunding, CAMPAIGN_LIB_PLACEHOLDER);
  // Link Crowdfunding > MilestoneLib
  await linkLibByAddress(milestoneLibAddress, Crowdfunding, MILESTONE_LIB_PLACEHOLDER);
  // Link Crowdfunding > ActivityLib
  await linkLibByAddress(activityLibAddress, Crowdfunding, ACTIVITY_LIB_PLACEHOLDER);
  // Link Crowdfunding > DonationLib
  await linkLibByAddress(donationLibAddress, Crowdfunding, DONATION_LIB_PLACEHOLDER);

  const crowdfundingBase = await Crowdfunding.new({ from: deployer });

  await sleep();

  console.log(` - Crowdfunding Base: ${crowdfundingBase.address}`);

  // Actualización de la DAO

  const dao = await Kernel.at(daoContractAddress);
  const namespace = await dao.APP_BASES_NAMESPACE();
  const appId = hash('crowdfunding');
  const appAddress = crowdfundingBase.address;

  console.log(` - Upgrade app`);
  console.log(`   - DAO Address: ${daoContractAddress}`);
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
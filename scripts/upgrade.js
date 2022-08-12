const bre = require("@nomiclabs/buidler");
const { hash } = require('eth-ens-namehash')
const { linkLib,
  ARRAY_LIB_PLACEHOLDER,
  ENTITY_LIB_PLACEHOLDER,
  DAC_LIB_PLACEHOLDER,
  CAMPAIGN_LIB_PLACEHOLDER,
  MILESTONE_LIB_PLACEHOLDER,
  ACTIVITY_LIB_PLACEHOLDER,
  DONATION_LIB_PLACEHOLDER } = require('./libs')
const Crowdfunding = bre.artifacts.require('Crowdfunding')
const ArrayLib = bre.artifacts.require('ArrayLib')
const EntityLib = bre.artifacts.require('EntityLib')
const DacLib = bre.artifacts.require('DacLib')
const CampaignLib = bre.artifacts.require('CampaignLib')
const MilestoneLib = bre.artifacts.require('MilestoneLib')
const ActivityLib = bre.artifacts.require('ActivityLib')
const DonationLib = bre.artifacts.require('DonationLib')
const Kernel = bre.artifacts.require('@aragon/os/build/contracts/kernel/Kernel')

async function main() {

  const { deployer } = await bre.getNamedAccounts();

  console.log(`Crowdfunding compile`);
  await bre.run("compile");

  console.log(`Crowdfunding deploy`);

  // Link Crowdfunding > ArrayLib
  const arrayLib = await ArrayLib.new({ from: deployer });
  await linkLib(arrayLib, Crowdfunding, ARRAY_LIB_PLACEHOLDER);
  // Link Crowdfunding > EntityLib
  const entityLib = await EntityLib.new({ from: deployer });
  await linkLib(entityLib, Crowdfunding, ENTITY_LIB_PLACEHOLDER);
  // Link Crowdfunding > DacLib
  const dacLib = await DacLib.new({ from: deployer });
  await linkLib(dacLib, Crowdfunding, DAC_LIB_PLACEHOLDER);
  // Link Crowdfunding > CampaignLib
  const campaignLib = await CampaignLib.new({ from: deployer });
  await linkLib(campaignLib, Crowdfunding, CAMPAIGN_LIB_PLACEHOLDER);
  // Link Crowdfunding > MilestoneLib
  const milestoneLib = await MilestoneLib.new({ from: deployer });
  await linkLib(milestoneLib, Crowdfunding, MILESTONE_LIB_PLACEHOLDER);
  // Link Crowdfunding > ActivityLib
  const activityLib = await ActivityLib.new({ from: deployer });
  await linkLib(activityLib, Crowdfunding, ACTIVITY_LIB_PLACEHOLDER);
  // Link Crowdfunding > DonationLib
  const donationLib = await DonationLib.new({ from: deployer });
  await linkLib(donationLib, Crowdfunding, DONATION_LIB_PLACEHOLDER);

  const crowdfundingBase = await Crowdfunding.new({ from: deployer });

  console.log(` - Libraries`);
  console.log(`   - Entity Lib: ${entityLib.address}`);
  console.log(`   - Dac Lib: ${dacLib.address}`);
  console.log(`   - Campaign Lib: ${campaignLib.address}`);
  console.log(`   - Milestone Lib: ${milestoneLib.address}`);
  console.log(`   - Activity Lib: ${activityLib.address}`);
  console.log(`   - Donation Lib: ${donationLib.address}`);
  console.log(`   - Array Lib: ${arrayLib.address}`);
  console.log(` - Crowdfunding Base: ${crowdfundingBase.address}`);

  // Actualización de la DAO

  const dao = await Kernel.at(process.env.DAO_CONTRACT_ADDRESS);
  const namespace = await dao.APP_BASES_NAMESPACE();
  const appId = hash('crowdfunding');
  const appAddress = crowdfundingBase.address;

  console.log(` - Upgrade app`);
  console.log(`   - DAO Address: ${process.env.DAO_CONTRACT_ADDRESS}`);
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
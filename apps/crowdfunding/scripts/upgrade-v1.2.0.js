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
const ArrayLib = bre.artifacts.require('ArrayLib')
const EntityLib = bre.artifacts.require('EntityLib')
const DacLib = bre.artifacts.require('DacLib')
const CampaignLib = bre.artifacts.require('CampaignLib')
const MilestoneLib = bre.artifacts.require('MilestoneLib')
const ActivityLib = bre.artifacts.require('ActivityLib')
const DonationLib = bre.artifacts.require('DonationLib')
const Kernel = bre.artifacts.require('@aragon/os/build/contracts/kernel/Kernel')

function sleep() {
  // Mainnet
  return new Promise(resolve => setTimeout(resolve, 300000));
  //return new Promise(resolve => setTimeout(resolve, 1));
}

async function main() {

  console.log(`Upgrade v1.2.0`);
  console.log(` - BUIDLER_NETWORK: ${process.env.BUIDLER_NETWORK}`);

  const { deployer } = await bre.getNamedAccounts();

  console.log(`Crowdfunding compile`);
  await bre.run("compile");

  const network = process.env.BUIDLER_NETWORK;
  console.log(`Crowdfunding deploy`);

  let arrayLibAddress;
  let entityLibAddress;
  let dacLibAddress;
  let campaignLibAddress;
  let milestoneLibAddress;
  let activityLibAddress;
  let donationLibAddress;

  if (network === "rskRegtest") {

    const arrayLib = await ArrayLib.new({ from: deployer });
    arrayLibAddress = arrayLib.address;

    const entityLib = await EntityLib.new({ from: deployer });
    entityLibAddress = entityLib.address;

    const dacLib = await DacLib.new({ from: deployer });
    dacLibAddress = dacLib.address;

    const campaignLib = await CampaignLib.new({ from: deployer });
    campaignLibAddress = campaignLib.address;

    const milestoneLib = await MilestoneLib.new({ from: deployer });
    milestoneLibAddress = milestoneLib.address;

    const activityLib = await ActivityLib.new({ from: deployer });
    activityLibAddress = activityLib.address;

    const donationLib = await DonationLib.new({ from: deployer });
    donationLibAddress = donationLib.address;

  } else if (network === "rskTestnet") {

    //TODO: Complete with current deployed libs addresses
    arrayLibAddress = "0x...";
    entityLibAddress = "0x...";
    dacLibAddress = "0x...";
    campaignLibAddress = "0x...";
    milestoneLibAddress = "0x...";
    activityLibAddress = "0x...";
    donationLibAddress = "0x...";

  } else if (network === "rskMainnet") {

    //TODO: Complete with current deployed libs addresses
    arrayLibAddress = "0x...";
    entityLibAddress = "0x...";
    dacLibAddress = "0x...";
    campaignLibAddress = "0x...";
    milestoneLibAddress = "0x...";
    activityLibAddress = "0x...";
    donationLibAddress = "0x...";

  }

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

  console.log(` - Libraries`);
  console.log(`   - Entity Lib: ${entityLibAddress}`);
  console.log(`   - Dac Lib: ${dacLibAddress}`);
  console.log(`   - Campaign Lib: ${campaignLibAddress}`);
  console.log(`   - Milestone Lib: ${milestoneLibAddress}`);
  console.log(`   - Activity Lib: ${activityLibAddress}`);
  console.log(`   - Donation Lib: ${donationLibAddress}`);
  console.log(`   - Array Lib: ${arrayLibAddress}`);
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
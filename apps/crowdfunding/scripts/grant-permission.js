const bre = require("@nomiclabs/buidler");
const Kernel = bre.artifacts.require('@aragon/os/build/contracts/kernel/Kernel')
const ACL =  bre.artifacts.require('@aragon/os/build/contracts/acl/ACL')
const { keccak256 } = require('web3-utils');
const { grantPermission } = require('./permissions')

async function main() {

  const { deployer } = await bre.getNamedAccounts();

  const crowdfundingAddress = process.env.CROWDFUNDING_ADDRESS;
  const accountAddress = process.env.ACCOUNT_ADDRESS
  const role = process.env.ROLE;
  const roleHash = keccak256(role);

  const dao = await Kernel.at(process.env.DAO_ADDRESS);
  const acl = await ACL.at(await dao.acl());

  console.log(` - Grant permission`);
  console.log(`   - DAO: ${dao.address}`);
  console.log(`   - ACL: ${acl.address}`);
  console.log(`   - Crowdfunding: ${crowdfundingAddress}`);
  console.log(`   - Account: ${accountAddress}`);
  console.log(`   - Role: ${role} (${roleHash})`);

  await grantPermission(acl, accountAddress, crowdfundingAddress, roleHash, deployer);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
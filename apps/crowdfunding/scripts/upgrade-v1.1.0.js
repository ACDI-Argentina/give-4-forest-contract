const bre = require("@nomiclabs/buidler")
const Crowdfunding = bre.artifacts.require('Crowdfunding')
const RoCStateMock = bre.artifacts.require('RoCStateMock')
const DocTokenMock = bre.artifacts.require('DocTokenMock')
const RifTokenMock = bre.artifacts.require('RifTokenMock')
const ExchangeRateProvider = bre.artifacts.require('ExchangeRateProvider')
const BN = require('bn.js');

function sleep() {
  // Mainnet
  //return new Promise(resolve => setTimeout(resolve, 300000));
  return new Promise(resolve => setTimeout(resolve, 1));
}

async function main() {

  console.log(`Upgrade v1.1.0`);
  console.log(` - BUIDLER_NETWORK: ${process.env.BUIDLER_NETWORK}`);
  console.log(` - CROWDFUNDING_ADDRESS: ${process.env.CROWDFUNDING_ADDRESS}`);

  const { deployer } = await bre.getNamedAccounts();

  console.log(`Crowdfunding compile`);
  await bre.run("compile");

  const network = process.env.BUIDLER_NETWORK;
  const crowdfunding = await Crowdfunding.at(process.env.CROWDFUNDING_ADDRESS);

  // ERC20 Token

  console.log(` - ERC20 Tokens`);

  let rifAddress;
  let docAddress;
  let DOC_PRICE = new BN('00001000000000000000000'); // Precio del DOC: 1,00 US$
  if (network === "rskRegtest") {

    let rifTokenMock = await RifTokenMock.new({ from: deployer });
    rifAddress = rifTokenMock.address;

    let docTokenMock = await DocTokenMock.new({ from: deployer });
    docAddress = docTokenMock.address;

  } else if (network === "rskTestnet") {

    // TODO
    rifAddress = '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe';
    //docAddress = '';
    // Temporal hasta que tenga la dirección de DOC en Testnet.
    docAddress = '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe';
  } else if (network === "rskMainnet") {

    // TODO
    rifAddress = '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5';
    docAddress = '';
  }
  console.log(`   - RifToken: ${rifAddress}`);
  console.log(`   - DocToken: ${docAddress}`);
  await sleep();

  // Exchange Rate

  console.log(` - RBTC Exchange Rate`);

  let moCStateAddress;
  let roCStateAddress;

  if (network === "rskRegtest") {
    const RBTC_PRICE = new BN('58172000000000000000000'); // Precio del RBTC: 58172,00 US$
    const moCStateMock = await MoCStateMock.new(RBTC_PRICE, { from: deployer });
    moCStateAddress = moCStateMock.address;
    const RIF_PRICE = new BN('00000391974000000000000'); // Precio del RIF: 0,391974 US$
    const roCStateMock = await RoCStateMock.new(RIF_PRICE, { from: deployer });
    roCStateAddress = roCStateMock.address;
  } else if (network === "rskTestnet") {
    // MoCState de MOC Oracles en Testnet 
    moCStateAddress = "0x0adb40132cB0ffcEf6ED81c26A1881e214100555";
    // RoCState de MOC Oracles en Testnet 
    roCStateAddress = "0x496eD67F77D044C8d9471fe86085Ccb5DC4d2f63";
  } else if (network === "rskMainnet") {
    // MoCState de MOC Oracles en Mainnet 
    moCStateAddress = "0xb9C42EFc8ec54490a37cA91c423F7285Fa01e257";
    // RoCState de MOC Oracles en Mainnet 
    moCStateAddress = "0x541F68a796Fe5ae3A381d2Aa5a50b975632e40A6";
  }
  await sleep();

  console.log(`   - MoCState: ${moCStateAddress}`);
  console.log(`   - RoCState: ${roCStateAddress}`);

  const exchangeRateProvider = await ExchangeRateProvider.new(
    moCStateAddress,
    roCStateAddress,
    rifAddress,
    docAddress,
    DOC_PRICE,
    { from: deployer });
  console.log(`   - ExchangeRateProvider: ${exchangeRateProvider.address}`);
  await sleep();

  await crowdfunding.setExchangeRateProvider(exchangeRateProvider.address, { from: deployer });
  console.log(`   - Set ExchangeRateProvider en Crowdfunding`);
  await sleep();

  // Habilitación de tokens para donar.

  console.log(` - Enable token donations`);

  await crowdfunding.enableToken(rifAddress, { from: deployer });
  console.log(`   - RifToken: ${rifAddress}`);
  await sleep();

  await crowdfunding.enableToken(docAddress, { from: deployer });
  console.log(`   - DocToken: ${docAddress}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
const bre = require("@nomiclabs/buidler")
const Crowdfunding = artifacts.require('Crowdfunding')
const RoCStateMock = artifacts.require('RoCStateMock')
const DocTokenMock = artifacts.require('DocTokenMock')
const RifTokenMock = artifacts.require('RifTokenMock')
const ExchangeRateProvider = artifacts.require('ExchangeRateProvider')

function sleep() {
  // Mainnet
  //return new Promise(resolve => setTimeout(resolve, 300000));
  return new Promise(resolve => setTimeout(resolve, 1));
}

async function main() {

  const { deployer } = await bre.getNamedAccounts();

  console.log(`Crowdfunding compile`);
  await bre.run("compile");

  const crowdfunding = await Crowdfunding.at('0xd598F01...................');

  // ERC20 Token

  log(` - ERC20 Tokens`);

  let rifAddress;
  let docAddress;
  let DOC_PRICE = new BN('00001000000000000000000'); // Precio del DOC: 1,00 US$
  if (network === "rskRegtest") {

    let rifTokenMock = await RifTokenMock.new({ from: deployer });
    rifAddress = rifTokenMock.address;
    log(`   - RifTokenMock: ${rifAddress}`);

    let docTokenMock = await DocTokenMock.new({ from: deployer });
    docAddress = docTokenMock.address;
    log(`   - DocTokenMock: ${docAddress}`);

  } else if (network === "rskTestnet") {

    // TODO
    rifAddress = '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe';
    docAddress = '';

  } else if (network === "rskMainnet") {

    // TODO
    rifAddress = '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5';
    docAddress = '';
  }
  await sleep();

  // Exchange Rate

  log(` - RBTC Exchange Rate`);

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

  log(`   - MoCState: ${moCStateAddress}`);
  log(`   - RoCState: ${roCStateAddress}`);

  const exchangeRateProvider = await ExchangeRateProvider.new(
    moCStateAddress,
    roCStateAddress,
    rifAddress,
    docAddress,
    DOC_PRICE,
    { from: deployer });
  log(`   - ExchangeRateProvider: ${exchangeRateProvider.address}`);
  await sleep();

  await crowdfunding.setExchangeRateProvider(exchangeRateProvider.address, { from: deployer });
  await sleep();

  // Habilitación de tokens para donar.

  log(` - Enable token donations`);

  await crowdfunding.enableToken(rifAddress, { from: deployer });
  log(`   - RifToken`);

  await crowdfunding.enableToken(docAddress, { from: deployer });
  log(`   - DocToken`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
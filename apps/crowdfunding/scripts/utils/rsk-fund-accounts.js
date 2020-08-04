var Web3 = require('web3');
var network = "http://localhost:4444";

console.log('');
console.log('RSK Node Status');
console.log('  Network: ' + network);
console.log('-------------------------------------------');

var web3 = new Web3(network);

// Ver https://github.com/trufflesuite/truffle/issues/2160

var from = '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826';
var value = web3.utils.toWei('1');

web3.eth.sendTransaction({
    from: from,
    to: '0xee4b388fb98420811C9e04AE8378330C05A2735a',
    value: value
})/*.once('confirmation', function (confNumber, receipt) {
    console.log(`Confirmation Number: ${confNumber}`);
    console.log(`Receipt`, receipt);
});*/

web3.eth.sendTransaction({
    from: from,
    to: '0x0bfA3B6b0E799F2eD34444582187B2cDf2fB11a7',
    value: value
})/*.once('confirmation', function (confNumber, receipt) {
    console.log(`Confirmation Number: ${confNumber}`);
    console.log(`Receipt`, receipt);
});*/

web3.eth.sendTransaction({
    from: from,
    to: '0x36d1d3c43422EF3B1d7d23F20a25977c29BC3f0e',
    value: value
})/*.once('confirmation', function (confNumber, receipt) {
    console.log(`Confirmation Number: ${confNumber}`);
    console.log(`Receipt`, receipt);
});*/
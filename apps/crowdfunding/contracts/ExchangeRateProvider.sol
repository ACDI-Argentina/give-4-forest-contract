pragma solidity ^0.4.24;

import "./interfaces/IPriceProvider.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";

/** 
  Este smart contract es el encargado de comunicarse con otros que son proveedores
  como los priceProvider de MoC
*/
contract ExchangeRateProvider {
    using SafeMath for uint256;
    IPriceProvider internal priceProvider;
    address RBTC = 0x0;

    constructor(IPriceProvider _priceProviderAddress) public {
        priceProvider = _priceProviderAddress;
    }

    /**
     * @return _rate Equivalencia de 0.01 USD en Token.
     */
    function getExchangeRate(address _token) public view returns (uint256) {
        if (_token == RBTC) {
            uint256 tokenPriceUSDWei = getBTCPriceFromMoC();
            return _asExchangeRate(tokenPriceUSDWei);
        } else {
            //can throw exceptions or something else?
            return 0;
        }
    }

    function getBTCPriceFromMoC() public view returns (uint256) {
        (bytes32 price, bool has) = priceProvider.peek();
        require(has, "Oracle have no Bitcoin Price");
        return uint256(price);
    }

    function _asExchangeRate(uint256 tokenPriceUSDWei) private pure returns (uint256){
        uint256 numerator = 10**34;
        return (numerator).div(tokenPriceUSDWei);
    }

    /* 
  function getPriceFromChainLink() internal view returns (uint256) {}
 */
}

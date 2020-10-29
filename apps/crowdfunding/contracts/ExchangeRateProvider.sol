pragma solidity ^0.4.24;

import "./interfaces/IPriceProvider.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";

/** 
  Este smart contract es el encargado de comunicarse con otros que son proveedores
  como los priceProvider de MoC
  TODO: Preguntar por la cotizacion de otros tokens
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

    /**
     * @return _rate Equivalencia de 0.01 USD en Token en WEI.
        ej: uint256 BTCWeiPrice = 13046750000000000000000; 
      /*

      Mover esto a la doc!

           1 USD = 10**18 weiUSD
        0.01 USD = 10**16 weiUSD

                     1 token - price USD
            10**18 wei token - 10**18 price wei USD
              ${X} wei token - 10**16 price wei USD  (0.01 USD)

        Por regla de 3 simple:

            (10**16) * (10**18)
            -------------------  = RATE
            usd PRICE * (10**18)

              (10**34)
            ------------  = RATE
            price weiUSD
        */
    function _asExchangeRate(uint256 tokenPriceUSDWei) private pure returns (uint256){
        uint256 numerator = 10**34;
        return (numerator).div(tokenPriceUSDWei);
    }

    /* 
  function getPriceFromChainLink() internal view returns (uint256) {}
 */
}

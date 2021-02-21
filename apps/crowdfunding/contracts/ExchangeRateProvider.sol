pragma solidity ^0.4.24;

import "./interfaces/IMoCState.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";

/**
 * Responsable de proveer la tasa de cambio de RBTC.
 */
contract ExchangeRateProvider {
    using SafeMath for uint256;
    IMoCState internal moCState;
    address RBTC = 0x0000000000000000000000000000000000000000;

    //array of allowed tokens? //require comprobaria que se encuentre en el listado

    constructor(IMoCState _moCStateAddress) public {
        moCState = _moCStateAddress;
    }

    /**
     * @param _token Token para el cual se establece el tipo de cambio en USD.
     * @return _rate Equivalencia de 0.01 USD en Token.
     */
    function getExchangeRate(address _token) public view returns (uint256) {
        if (_token == RBTC) {
            uint256 tokenPrice = getRbtcPrice();
            return _asExchangeRate(tokenPrice);
        } else {
            return 0; //we should revert transaction? https://blog.polymath.network/try-catch-in-solidity-handling-the-revert-exception-f53718f76047
            //Otra alternativa sería retornar una tupla (has,exchangeRate)
        }
    }

    /**
     * Obtiene el precio de RBTC utilizando MOC Oracles.
     */
    function getRbtcPrice() public view returns (uint256) {
        return moCState.getBitcoinPrice();
    }

    /**
     * Convierte un monto medido en dólares a la tasa de cambio de 0.01 USD medida en wei.
     *
     * 1RBTC = 1000000000000000000 wei ==== USD_PRICE USD
     *                           X wei ====      0.01 USD
     * 
     * RBTC_RATE = 1000000000000000000 * 0.01 / USD_PRICE;
     * RBTC_RATE = 10000000000000000 / USD_PRICE;
     */
    function _asExchangeRate(uint256 tokenPrice)
        private
        pure
        returns (uint256)
    {
        uint256 numerator = 10000000000000000;
        return (numerator).div(tokenPrice);
    }
}
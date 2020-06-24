pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

/**
 * @title Dac Library
 * @author Mauricio Coronel
 * @notice Librería encargada de la realización de operaciones sobre las Dacs.
 */
library DacLib {
    enum Status {Active, Cancelled}
    /// @dev Estructura que define los datos de una DAC.
    struct Dac {
        uint256 id; // Identificación de la entidad
        uint256 idIndex; // Índice del Id en dacIds;
        string infoCid; // IPFS Content ID de las información (JSON) de la Dac.
        address delegate;
        uint256[] campaignIds; // Ids de las campaigns relacionadas.
        Status status;
    }

    struct Data {
        /// @dev Almacena los ids de la dacs para poder iterar en el iterable mapping de Dacs
        uint256[] ids;
        /// @dev Iterable Mapping de Dacs
        mapping(uint256 => Dac) dacs;
    }

    /**
     * @notice Crea la DAC `title`.
     * @param self Contenedor con los datos de las Dacs.
     * @param id Id de la Dac.
     * @param infoCid Content ID de los datos (JSON) de la Dac. IPFS Cid.
     */
    function createDac(
        Data storage self,
        uint256 id,
        string infoCid
    ) internal {
        self.ids.push(id);
        uint256 idIndex = self.ids.length - 1;
        Dac memory dac;
        dac.id = id;
        dac.idIndex = idIndex;
        dac.infoCid = infoCid;
        dac.delegate = msg.sender;
        dac.status = Status.Active;
        self.dacs[id] = dac;
    }

    /**
     * @notice Asocia la DAC Id `id` con la Campaign Id `campaignId`.
     * @param self Contenedor con los datos de las Dacs.
     * @param id Id de la Dac.
     * @param campaignId Id de la Campaign
     */
    function associateCampaign(
        Data storage self,
        uint256 id,
        uint256 campaignId
    ) internal {
        self.dacs[id].campaignIds.push(campaignId);
    }

    /**
     * @notice Obtiene todas las Dacs.
     * @dev Dado que no puede retornarse un mapping, las Dacs son convertidas primeramente en una lista.
     * @param self contenedor con los datos de las Dacs.
     * @return Lista con todas las Dacs.
     */
    function getAll(Data storage self) public view returns (Dac[] memory) {
        Dac[] memory result = new Dac[](self.ids.length);
        for (uint256 i = 0; i < self.ids.length; i++) {
            result[i] = self.dacs[self.ids[i]];
        }
        return result;
    }
}

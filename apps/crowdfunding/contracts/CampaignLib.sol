pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

/**
 * @title Campaign Library
 * @author Mauricio Coronel
 * @notice Librería encargada de la realización de operaciones sobre las Campaigns.
 */
library CampaignLib {
    enum Status {Active, Cancelled}
    /// @dev Estructura que define los datos de una Campaign.
    struct Campaign {
        uint256 id; // Identificación de la entidad
        uint256 idIndex; // Índice del Id en campaignIds
        string infoCid; // IPFS Content ID de las información (JSON) de la Campaign.
        address manager;
        address reviewer;
        uint256[] dacIds; // Ids de las dacs relacionadas.
        uint256[] milestoneIds; // Ids de los milestones relacionados.
        Status status;
    }

    struct Data {
        /// @dev Almacena los ids de la campaigns para poder iterar en el iterable mapping de Campaigns
        uint256[] ids;
        /// @dev Iterable Mapping de Campaigns
        mapping(uint256 => Campaign) campaigns;
    }

    /**
     * @notice Crea la Campaign `title`.
     * @param self Contenedor con los datos de las Campaign.
     * @param id Id de la Campaign.
     * @param infoCid Content ID de los datos (JSON) de la Campaign. IPFS Cid.
     * @param dacId Id de la Dac a la cual pertenece la Campaign.
     * @param reviewer address del Campaign Reviewer
     */
    function createCampaign(
        Data storage self,
        uint256 id,
        string infoCid,
        uint256 dacId,
        address reviewer
    ) internal {
        self.ids.push(id);
        uint256 idIndex = self.ids.length - 1;
        Campaign memory campaign;
        campaign.id = id;
        campaign.idIndex = idIndex;
        campaign.infoCid = infoCid;
        campaign.manager = msg.sender;
        campaign.reviewer = reviewer;
        campaign.status = Status.Active;
        // Asociación entre Dac y Campaign
        // Memory Array no permite que se cree con un tamaño dinámico.
        // Memory Array no tiene la función push.
        uint256[] memory dacIdsTmp = new uint256[](1);
        dacIdsTmp[0] = dacId;
        campaign.dacIds = dacIdsTmp;
        self.campaigns[id] = campaign;
    }

    /**
     * @notice Asocia la Campaign Id `id` con el Milestone Id `milestoneId`.
     * @param self Contenedor con los datos de las Campaigns.
     * @param id Id de la Campaign.
     * @param milestoneId Id del Milestone
     */
    function associateMilestone(
        Data storage self,
        uint256 id,
        uint256 milestoneId
    ) internal {
        self.campaigns[id].milestoneIds.push(milestoneId);
    }

    /**
     * @notice Obtiene todas las Campaigns.
     * @dev Dado que no puede retornarse un mapping, las Campaigns son convertidas primeramente en una lista.
     * @param self contenedor con los datos de las Campaigns.
     * @return Lista con todas las Campaigns.
     */
    function getAll(Data storage self) public view returns (Campaign[] memory) {
        Campaign[] memory result = new Campaign[](self.ids.length);
        for (uint256 i = 0; i < self.ids.length; i++) {
            result[i] = self.campaigns[self.ids[i]];
        }
        return result;
    }
}

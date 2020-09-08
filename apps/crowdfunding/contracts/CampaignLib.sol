pragma solidity ^0.4.24;

/**
 * @title Librería de Campaigns.
 * @author Mauricio Coronel
 * @notice Librería encargada del tratamiento de Campaigns.
 */
library CampaignLib {
    enum Status {Active, Cancelled, Finished}

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
        /// @dev Almacena los ids de la campaigns para poder iterar
        /// en el iterable mapping de Campaigns
        uint256[] ids;
        /// @dev Iterable Mapping de Campaigns
        mapping(uint256 => Campaign) campaigns;
    }

    string
        internal constant ERROR_CAMPAIGN_NOT_EXISTS = "CROWDFUNDING_CAMPAIGN_NOT_EXIST";

    /**
     * @notice Inserta una nueva Campaign.
     */
    function insert(
        Data storage self,
        uint256 id,
        string _infoCid,
        uint256 _dacId,
        address _manager,
        address _reviewer
    ) public {
        self.ids.push(id);
        uint256 idIndex = self.ids.length - 1;
        Campaign memory campaign;
        campaign.id = id;
        campaign.idIndex = idIndex;
        campaign.infoCid = _infoCid;
        campaign.manager = _manager;
        campaign.reviewer = _reviewer;
        campaign.status = Status.Active;
        // Asociación entre Dac y Campaign
        // Memory Array no permite que se cree con un tamaño dinámico.
        // Memory Array no tiene la función push.
        uint256[] memory dacIdsTmp = new uint256[](1);
        dacIdsTmp[0] = _dacId;
        campaign.dacIds = dacIdsTmp;
        self.campaigns[id] = campaign;
    }

    /**
     * @notice actualiza una Campaign.
     */
    function update(
        Data storage self,
        uint256 id,
        string _infoCid,
        uint256 _dacId,
        address _manager, //No se si vamos a permitir la actualizacion del manager
        address _reviewer
    ) public {
        Campaign storage campaign = self.campaigns[id];
        campaign.infoCid = _infoCid;
        campaign.manager = _manager;
        campaign.reviewer = _reviewer;

        //Si permitimos que actualice la dac relacionada vamos a tener que actualizar el array de campañas de la dac original
        // dac.campaignIds.push(_campaignId); //Actualiza la dac relacionada
        // es factible economicamente borrar datos de un array? revisar cryptozombies a ver como hacia esto

        uint256[] memory dacIdsTmp = new uint256[](1);
        dacIdsTmp[0] = _dacId;
        campaign.dacIds = dacIdsTmp;        
    }

    /**
     * @notice Obtiene la Campaign `_id`
     * @return Campaign cuya identificación coincide con la especificada.
     */
    function getCampaign(Data storage self, uint256 _id)
        public
        view
        returns (Campaign storage)
    {
        require(self.campaigns[_id].id != 0, ERROR_CAMPAIGN_NOT_EXISTS);
        return self.campaigns[_id];
    }
}

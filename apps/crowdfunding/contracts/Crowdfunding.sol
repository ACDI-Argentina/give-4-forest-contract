pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "./Constants.sol";

/**
 * @title Crowdfunding
 * @author Mauricio Coronel
 * @notice Contrato encargado de las principales operaciones de manejo de entidades y fondos.
 */
contract Crowdfunding is EtherTokenConstant, AragonApp, Constants {
    enum EntityType {Dac, Campaign, Milestone}
    enum DacStatus {Active, Cancelled}
    enum CampaignStatus {Active, Finished, Cancelled}
    enum MilestoneStatus {Active, Finished, Cancelled}
    enum DonationStatus {Available, Spent, Returned}
    enum ButgetStatus {Budgeted, Paying, Paid}

    /// @dev Estructura que define la base de una entidad.
    struct Entity {
        uint256 id; // Identificación de la entidad
        uint256 idIndex; // Índice del Id en entityIds;
        EntityType entityType;
        uint256[] butgetIds; // Ids de los presupuestos.
    }

    /// @dev Estructura que define los datos de una DAC.
    struct Dac {
        uint256 id; // Identificación de la entidad
        uint256 idIndex; // Índice del Id en dacIds;
        string infoCid; // IPFS Content ID de las información (JSON) de la Dac.
        address delegate;
        uint256[] campaignIds; // Ids de las campaigns relacionadas.
        DacStatus status;
    }

    /// @dev Estructura que define los datos de una Campaign.
    struct Campaign {
        uint256 id; // Identificación de la entidad
        uint256 idIndex; // Índice del Id en campaignIds
        string infoCid; // IPFS Content ID de las información (JSON) de la Campaign.
        address manager;
        address reviewer;
        uint256[] dacIds; // Ids de las dacs relacionadas.
        uint256[] milestoneIds; // Ids de los milestones relacionados.
        CampaignStatus status;
    }

    /// @dev Estructura que define los datos de una Milestone.
    struct Milestone {
        uint256 id; // Identificación de la entidad
        uint256 idIndex; // Índice del Id en MilestoneIds;
        string infoCid; // IPFS Content ID de las información (JSON) del Milestone.
        uint256 maxAmount;
        address manager;
        address reviewer;
        address recipient;
        address campaignReviewer;
        uint256 campaignId; // Id de las campaign relacionada.
        // TODO Agregar Items
        MilestoneStatus status;
    }

    /// @dev Estructura que define los datos de una Donación.
    struct Donation {
        uint256 id; // Identificación de la donación
        uint256 idIndex; // Índice del Id en donationIds;
        address giver; // Address del donante.
        address token; // Token donado.
        uint256 amount; // Monto donado.
        uint256 amountRemainding; // Monto donado restante de consumir.
        uint256 entityId; // Identificación de la entidad a la cual se destinó el fondo inicialmente.
        uint256 butgetId; // Identificación del presupuesto al cual está asignada la donación.
        DonationStatus status;
    }

    /// @dev Estructura que define los datos de un Presupuesto para una Entidad.
    struct Butget {
        uint256 id; // Identificación del presupuesto.
        uint256 idIndex; // Índice del Id en butguIds;
        uint256 entityId; // Identificación de la entidad al cual está destinado el presupuesto.
        address token; // Token del presupuesto.
        uint256 amount; // Monto del presupuesto.
        ButgetStatus status;
    }

    struct EntityData {
        /**
         * @dev Almacena los ids de la entities para poder iterar
         *  en el iterable mapping de Entities.
         * Desde esta variable son generados todos los identificadores de entidades.
         */
        uint256[] ids;
        /// @dev Iterable Mapping de Entities
        mapping(uint256 => Entity) entities;
    }

    struct DacData {
        /// @dev Almacena los ids de la dacs para poder iterar
        /// en el iterable mapping de Dacs
        uint256[] ids;
        /// @dev Iterable Mapping de Dacs
        mapping(uint256 => Dac) dacs;
    }

    struct CampaignData {
        /// @dev Almacena los ids de la campaigns para poder iterar
        /// en el iterable mapping de Campaigns
        uint256[] ids;
        /// @dev Iterable Mapping de Campaigns
        mapping(uint256 => Campaign) campaigns;
    }

    struct MilestoneData {
        /// @dev Almacena los ids de la Milestones para poder iterar
        /// en el iterable mapping de Milestones
        uint256[] ids;
        /// @dev Iterable Mapping de Milestones
        mapping(uint256 => Milestone) milestones;
    }

    struct DonationData {
        /// @dev Almacena los ids de las donaciones para poder iterar
        /// en el iterable mapping de donaciones.
        uint256[] ids;
        /// @dev Iterable Mapping de Donaciones
        mapping(uint256 => Donation) donations;
    }

    struct ButgetData {
        /// @dev Almacena los ids de las presupuestos para poder iterar
        /// en el iterable mapping de presupuestos.
        uint256[] ids;
        /// @dev Iterable Mapping de Presupuesto
        mapping(uint256 => Butget) butgets;
    }

    EntityData entityData;
    DacData dacData;
    CampaignData campaignData;
    MilestoneData milestoneData;
    DonationData donationData;
    ButgetData butgetData;

    modifier entityExists(uint256 _id) {
        require(entityData.entities[_id].id != 0, ERROR_ENTITY_NOT_EXISTS);
        _;
    }

    modifier dacExists(uint256 _id) {
        require(dacData.dacs[_id].id != 0, ERROR_DAC_NOT_EXISTS);
        _;
    }

    modifier campaignExists(uint256 _id) {
        require(campaignData.campaigns[_id].id != 0, ERROR_CAMPAIGN_NOT_EXISTS);
        _;
    }

    modifier milestoneExists(uint256 _id) {
        require(
            milestoneData.milestones[_id].id != 0,
            ERROR_MILESTONE_NOT_EXISTS
        );
        _;
    }

    modifier donationExists(uint256 _donationId) {
        require(
            donationData.donations[_donationId].id != 0,
            ERROR_DONATION_NOT_EXISTS
        );
        _;
    }

    modifier butgetExists(uint256 _id) {
        require(butgetData.butgets[_id].id != 0, ERROR_BUTGET_NOT_EXISTS);
        _;
    }

    Vault public vault;

    /**
     * @notice Inicializa el Crowdfunding App con el Vault `_vault`.
     * @param _vault Address del vault
     */
    function initialize(Vault _vault) external onlyInit {
        require(isContract(_vault), ERROR_VAULT_NOT_CONTRACT);
        vault = _vault;
        initialized();
    }

    event NewDac(uint256 id);
    event NewCampaign(uint256 id);
    event NewMilestone(uint256 id);
    event NewDonation(
        uint256 id,
        uint256 entityId,
        address token,
        uint256 amount
    );
    event Transfer(
        uint256 entityIdFrom,
        uint256 entityIdTo,
        uint256 donationId,
        uint256 amount
    );

    /**
     * @notice Crea la DAC `title`. Quien envía la transacción es el delegate de la Dac.
     * @param _infoCid Content ID de las información (JSON) de la Dac. IPFS Cid.
     */
    function newDac(string _infoCid) external auth(CREATE_DAC_ROLE) {
        uint256 entityId = _newEntity(EntityType.Dac);
        dacData.ids.push(entityId);
        uint256 idIndex = dacData.ids.length - 1;
        Dac memory dac;
        dac.id = entityId;
        dac.idIndex = idIndex;
        dac.infoCid = _infoCid;
        dac.delegate = msg.sender;
        dac.status = DacStatus.Active;
        dacData.dacs[entityId] = dac;
        emit NewDac(entityId);
    }

    /**
     * @notice Crea la Campaign `title`. Quien envía la transacción es el manager de
     *  la Campaign.
     * @param _infoCid Content ID de las información (JSON) de la Campaign. IPFS Cid.
     * @param _dacId Id de la Dac a la cual pertenece la Campaign.
     * @param _reviewer address del Campaign Reviewer
     */
    function newCampaign(
        string _infoCid,
        uint256 _dacId,
        address _reviewer
    ) external auth(CREATE_CAMPAIGN_ROLE) dacExists(_dacId) {
        uint256 entityId = _newEntity(EntityType.Campaign);
        campaignData.ids.push(entityId);
        uint256 idIndex = campaignData.ids.length - 1;
        Campaign memory campaign;
        campaign.id = entityId;
        campaign.idIndex = idIndex;
        campaign.infoCid = _infoCid;
        campaign.manager = msg.sender;
        campaign.reviewer = _reviewer;
        campaign.status = CampaignStatus.Active;
        // Asociación entre Dac y Campaign
        // Memory Array no permite que se cree con un tamaño dinámico.
        // Memory Array no tiene la función push.
        uint256[] memory dacIdsTmp = new uint256[](1);
        dacIdsTmp[0] = _dacId;
        campaign.dacIds = dacIdsTmp;
        campaignData.campaigns[entityId] = campaign;
        dacData.dacs[_dacId].campaignIds.push(entityId);
        emit NewCampaign(entityId);
    }

    /**
     * @notice Crea el Milestone `title`. Quien envía la transacción es el
     *  manager del Milestone.
     * @param _infoCid Content ID de las información (JSON) del Milestone. IPFS Cid.
     * @param _campaignId Id de la Campaign a la cual pertenece el Milestone.
     * @param _maxAmount Monto máximo para financiar el Milestone.
     * @param _reviewer address del Milestone Reviewer
     * @param _recipient address del Milestone Recipient
     * @param _campaignReviewer address del Campaign Reviewer del Milestone
     */
    function newMilestone(
        string _infoCid,
        uint256 _campaignId,
        uint256 _maxAmount,
        address _reviewer,
        address _recipient,
        address _campaignReviewer
    ) external auth(CREATE_MILESTONE_ROLE) campaignExists(_campaignId) {
        uint256 entityId = _newEntity(EntityType.Milestone);
        milestoneData.ids.push(entityId);
        uint256 idIndex = milestoneData.ids.length - 1;
        Milestone memory milestone;
        milestone.id = entityId;
        milestone.idIndex = idIndex;
        milestone.infoCid = _infoCid;
        milestone.maxAmount = _maxAmount;
        milestone.manager = msg.sender;
        milestone.reviewer = _reviewer;
        milestone.recipient = _recipient;
        milestone.campaignReviewer = _campaignReviewer;
        milestone.status = MilestoneStatus.Active;
        // Asociación entre Campaign y Milestone
        milestone.campaignId = _campaignId;
        milestoneData.milestones[entityId] = milestone;
        campaignData.campaigns[_campaignId].milestoneIds.push(entityId);
        emit NewMilestone(entityId);
    }

    /**
     * @notice Realiza la donación de `_amount` del Token `_token`, destinados
     *  a la entidad con Id `_entityId`.
     * @dev Los fondos son resguardados en el vault.
     * @param _entityId Id de la entidad a la cual se donan los fondos.
     * @param _token Address del token donados.
     * @param _amount Cantidad de tokens donados.
     */
    function donate(
        uint256 _entityId,
        address _token,
        uint256 _amount
    ) external payable isInitialized entityExists(_entityId) {
        require(_amount > 0, ERROR_DONATE_AMOUNT_ZERO);
        if (_token == ETH) {
            // Asegura que la cantidad de ETH enviada coincida con el valor
            require(msg.value == _amount, ERROR_ETH_VALUE_MISMATCH);
            vault.deposit.value(_amount)(ETH, _amount);
        } else {
            // This assumes the sender has approved the tokens for Crowdfunding
            require(
                ERC20(_token).safeTransferFrom(
                    msg.sender,
                    address(this),
                    _amount
                ),
                ERROR_TOKEN_TRANSFER_FROM_REVERTED
            );
            // Approve the tokens for the Vault (it does the actual transferring)
            require(
                ERC20(_token).safeApprove(vault, _amount),
                ERROR_TOKEN_APPROVE_FAILED
            );
            // Finally, initiate the deposit
            vault.deposit(_token, _amount);
        }

        // Registración de la donación.
        uint256 donationId = donationData.ids.length + 1;
        donationData.ids.push(donationId);
        uint256 idIndex = donationData.ids.length - 1;
        Donation memory donation;
        donation.id = donationId;
        donation.idIndex = idIndex;
        donation.giver = msg.sender;
        donation.token = _token;
        donation.amount = _amount;
        donation.amountRemainding = _amount;
        donation.entityId = _entityId;
        donation.status = DonationStatus.Available;

        // Se agrega al presupuesto de la entidad.
        Butget storage butget = _getButget(_entityId, _token);
        butget.amount = butget.amount + _amount;
        donation.butgetId = butget.id;

        donationData.donations[donationId] = donation;

        emit NewDonation(donationId, _entityId, _token, _amount);
    }

    /**
     * @notice Realiza la transferencia de las donaciones `_donationIds` desde
     *  la entidad `_entityIdFrom` a la entidad `_entityIdTo`.
     * @dev Las donaciones se transfieren por completo y no fraccionadas.
     *  Previo a realiza la transferencia de las donaciones, se realizan validaciones
     *  de autorización, estructura y estados.
     * @param _entityIdFrom Id de la entidad a la cual pertenecen las donaciones transferidas.
     * @param _entityIdTo Id de la entidad a la cual se transfieren las donaciones.
     * @param _donationIds Ids de las donaciones a transferir.
     */
    function transfer(
        uint256 _entityIdFrom,
        uint256 _entityIdTo,
        uint256[] _donationIds
    ) external isInitialized {
        Entity storage entityFrom = _getEntity(_entityIdFrom);
        Entity storage entityTo = _getEntity(_entityIdTo);
        if (entityFrom.entityType == EntityType.Dac) {
            Dac storage dacFrom = _getDac(entityFrom.id);
            // Solamente el Delegate de la DAC puede trasferir fondos.
            require(
                dacFrom.delegate == msg.sender,
                ERROR_TRANSFER_NOT_AUTHORIZED
            );
            // La DAC debe estar Activa.
            require(
                dacFrom.status == DacStatus.Active,
                ERROR_TRANSFER_DAC_NOT_ACTIVE
            );
            // La entidad destino debe pertenecer a la DAC
            if (entityTo.entityType == EntityType.Campaign) {
                // Transferencia DAC > Campaign
                // La entidad de destino debe estar entre las Campaigns de la Dac.
                require(
                    dacFrom.campaignIds[entityTo.id] != 0,
                    ERROR_TRANSFER_CAMPAIGN_NOT_BELONGS_DAC
                );
                Campaign storage campaignTo = _getCampaign(entityTo.id);
                // La Campaign debe estar Activa.
                require(
                    campaignTo.status == CampaignStatus.Active,
                    ERROR_TRANSFER_CAMPAIGN_NOT_ACTIVE
                );
            } else if (entityTo.entityType == EntityType.Milestone) {
                // Transferencia DAC > Milestone
                // La entidad de destino debe estar entre los Milestones de las Campaigns de la Dac.
                bool found = false;
                for (uint256 i1 = 0; i1 < dacFrom.campaignIds.length; i1++) {
                    if (
                        _getCampaign(dacFrom.campaignIds[i1])
                            .milestoneIds[entityTo.id] != 0
                    ) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    revert(ERROR_TRANSFER_MILESTONE_NOT_BELONGS_DAC);
                }
                // El Milestone debe estar Activo.
                require(
                    _getMilestone(entityTo.id).status == MilestoneStatus.Active,
                    ERROR_TRANSFER_MILESTONE_NOT_ACTIVE
                );
            } else {
                // Solamente se permite transferir a una Campaign o Milestone.
                revert(ERROR_TRANSFER_INVALID);
            }
        } else if (entityFrom.entityType == EntityType.Campaign) {
            Campaign storage campaignFrom = _getCampaign(entityFrom.id);
            // Solamente el Manager de la Campaign puede trasferir fondos.
            require(
                campaignFrom.manager == msg.sender,
                ERROR_TRANSFER_NOT_AUTHORIZED
            );
            // La Campaign debe estar Activa.
            require(
                campaignFrom.status == CampaignStatus.Active,
                ERROR_TRANSFER_CAMPAIGN_NOT_ACTIVE
            );
            // La entidad de destino debe estar entre los Milestone de la Dac.
            require(
                campaignFrom.milestoneIds[entityTo.id] != 0,
                ERROR_TRANSFER_MILESTONE_NOT_BELONGS_CAMPAIGN
            );
            // Transferencia Campaign > Milestone
            // El Milestone debe estar Activo.
            require(
                _getMilestone(entityTo.id).status == MilestoneStatus.Active,
                ERROR_TRANSFER_MILESTONE_NOT_ACTIVE
            );
        } else {
            // Solamente se permite transferir desde Dac o Campaign.
            // No puede transferirse desde un Milestone.
            revert(ERROR_TRANSFER_INVALID);
        }
        // La transferencia superó las validaciones de autorización, estructura y estado.
        for (uint256 i2 = 0; i2 < _donationIds.length; i2++) {
            //_doTransfer(_entityIdFrom, _entityIdTo, _donationIds[i2]);
        }
    }

    // Getters functions

    /**
     * @notice Obtiene todas las Entities.
     * @dev Dado que no puede retornarse un mapping, las Entities son convertidas
     *  primeramente en una lista.
     * @return Lista con todas las Entities.
     */
    function getAllEntities() public view returns (Entity[] memory) {
        Entity[] memory result = new Entity[](entityData.ids.length);
        for (uint256 i = 0; i < entityData.ids.length; i++) {
            result[i] = entityData.entities[entityData.ids[i]];
        }
        return result;
    }

    /**
     * @notice Obtiene todas las DAC.
     * @return Lista con todas las DACs.
     */
    function getAllDacs() public view returns (Dac[] memory) {
        Dac[] memory result = new Dac[](dacData.ids.length);
        for (uint256 i = 0; i < dacData.ids.length; i++) {
            result[i] = dacData.dacs[dacData.ids[i]];
        }
        return result;
    }

    /**
     * @notice Obtiene todas las Campaigns.
     * @return Lista con todas las Campaigns.
     */
    function getAllCampaigns() public view returns (Campaign[] memory) {
        Campaign[] memory result = new Campaign[](campaignData.ids.length);
        for (uint256 i = 0; i < campaignData.ids.length; i++) {
            result[i] = campaignData.campaigns[campaignData.ids[i]];
        }
        return result;
    }

    /**
     * @notice Obtiene todos los Milestones.
     * @return Lista con todos los Milestones.
     */
    function getAllMilestones() public view returns (Milestone[] memory) {
        Milestone[] memory result = new Milestone[](milestoneData.ids.length);
        for (uint256 i = 0; i < milestoneData.ids.length; i++) {
            result[i] = milestoneData.milestones[milestoneData.ids[i]];
        }
        return result;
    }

    /**
     * @notice Obtiene todas las Donaciones.
     * @return Lista con todas las Donaciones.
     */
    function getAllDonations() public view returns (Donation[] memory) {
        Donation[] memory result = new Donation[](donationData.ids.length);
        for (uint256 i = 0; i < donationData.ids.length; i++) {
            result[i] = donationData.donations[donationData.ids[i]];
        }
        return result;
    }

    /**
     * @notice Obtiene todas las Presupuestos.
     * @return Lista con todos los Presupuestos.
     */
    function getAllButgets() public view returns (Butget[] memory) {
        Butget[] memory result = new Butget[](butgetData.ids.length);
        for (uint256 i = 0; i < butgetData.ids.length; i++) {
            result[i] = butgetData.butgets[butgetData.ids[i]];
        }
        return result;
    }

    // Internal functions

    /**
     * @dev Crea una entidad base del tipo `_entityType`.
     * Al crearse la entidad, también se crea su presupuesto inicial.
     * @param _entityType tipo de la entidad a crear.
     * @return identificador de la entidad creada.
     */
    function _newEntity(EntityType _entityType)
        internal
        returns (uint256 entityId)
    {
        entityId = entityData.ids.length + 1; // Generación del Id único por entidad.
        entityData.ids.push(entityId);
        uint256 idIndex = entityData.ids.length - 1;
        Entity memory entity;
        entity.id = entityId;
        entity.idIndex = idIndex;
        entity.entityType = _entityType;
        entityData.entities[entityId] = entity;
    }

    /**
     * @dev crea un nuevo presupuesto para la entidad `_entityId`.
     * @param _entityId Identificador de la entidad a la cual se asociará el presupuesto.
     * @param _token Token del presupuesto.
     * @return presupuesto creado.
     */
    function _newButget(uint256 _entityId, address _token)
        internal
        entityExists(_entityId)
        returns (Butget storage butget)
    {
        uint256 butgetId = butgetData.ids.length + 1; // Generación del Id único por presupuesto.
        butgetData.ids.push(butgetId);
        uint256 idIndex = butgetData.ids.length - 1;
        butget = butgetData.butgets[butgetId];
        butget.id = butgetId;
        butget.idIndex = idIndex;
        butget.entityId = _entityId;
        butget.token = _token;
        // El presupuesto se inicializa en 0 tokens.
        butget.amount = 0;
        butget.status = ButgetStatus.Budgeted;
        // Se asocia el presupuesto a la entidad
        entityData.entities[_entityId].butgetIds.push(butgetId);
    }

    /**
     * @notice Obtiene el Entity `_id`
     * @return Entity cuya identificación coincide con la especificada.
     */
    function _getEntity(uint256 _id)
        internal
        view
        entityExists(_id)
        returns (Entity storage)
    {
        return entityData.entities[_id];
    }

    /**
     * @notice Obtiene la Dac `_id`
     * @return Dac cuya identificación coincide con la especificada.
     */
    function _getDac(uint256 _id)
        internal
        view
        dacExists(_id)
        returns (Dac storage)
    {
        return dacData.dacs[_id];
    }

    /**
     * @notice Obtiene la Campaign `_id`
     * @return Campaign cuya identificación coincide con la especificada.
     */
    function _getCampaign(uint256 _id)
        internal
        view
        campaignExists(_id)
        returns (Campaign storage)
    {
        return campaignData.campaigns[_id];
    }

    /**
     * @notice Obtiene el Milestone `_id`
     * @return Milestone cuya identificación coincide con la especificada.
     */
    function _getMilestone(uint256 _id)
        internal
        view
        milestoneExists(_id)
        returns (Milestone storage)
    {
        return milestoneData.milestones[_id];
    }

    /**
     * @notice Obtiene la donación `_id`
     * @return Donación cuya identificación coincide con la especificada.
     */
    function _getDonation(uint256 _id)
        internal
        view
        donationExists(_id)
        returns (Donation storage)
    {
        return donationData.donations[_id];
    }

    /**
     * @notice Obtiene el Presupuesto de la Entity `_entityId` del token `_token`.
     * @dev Si el presupuesto aún no fue creado, se crea en este momento.
     * @param _entityId identificador de la entidad.
     * @param _token token del presupuesto.
     * @return Presupuesto del entity y token especificado.
     */
    function _getButget(uint256 _entityId, address _token)
        internal
        returns (Butget storage)
    {
        Entity storage entity = _getEntity(_entityId);
        for (uint256 i = 0; i < entity.butgetIds.length; i++) {
            if (butgetData.butgets[entity.butgetIds[i]].token == _token) {
                return butgetData.butgets[entity.butgetIds[i]];
            }
        }
        // No existe un presupuesto de la entidad para el token especificado,
        // por lo que se crea un nuevo presupuesto para el token.
        return _newButget(_entityId, _token);
    }

    /**
     * @notice Realiza la transferencia de la donación `_donationId` desde
     *  la entidad `_entityIdFrom` a la entidad `_entityIdTo`.
     * @dev Las donación se transfiere por completo y no fraccionada.
     *  En este punto, ya se encuentra validada la transferencia entre entidades.
     * @param _entityIdFrom Id de la entidad a la cual pertenece la donación transferida.
     * @param _entityIdTo Id de la entidad a la cual se transfiere la donación.
     * @param _donationId Id de las donación a transferir.
     */
    function _doTransfer(
        uint256 _entityIdFrom,
        uint256 _entityIdTo,
        uint256 _donationId
    ) internal {
        Donation storage donation = _getDonation(_donationId);
        // La donación debe estar disponible.
        require(
            donation.status == DonationStatus.Available,
            ERROR_TRANSFER_DONATION_NOT_AVAILABLE
        );
        Butget storage butgetFrom = _getButget(_entityIdFrom, donation.token);
        Butget storage butgetTo = _getButget(_entityIdTo, donation.token);

        uint256 amountTransfer = donation.amountRemainding;
        butgetFrom.amount = butgetFrom.amount - amountTransfer;
        butgetTo.amount = butgetTo.amount + amountTransfer;
        donation.butgetId = butgetTo.id;

        emit Transfer(_entityIdFrom, _entityIdTo, _donationId, amountTransfer);
    }
}

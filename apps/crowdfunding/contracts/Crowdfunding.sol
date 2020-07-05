pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "./Constants.sol";

/**
 * @title Crowdfunding
 * @author Mauricio Coronel
 * @notice Contrato encargado de las principales operaciones de manejo de entidades y fondos.
 */
contract Crowdfunding is EtherTokenConstant, AragonApp, Constants {
    using SafeMath for uint256;
    enum EntityType {Dac, Campaign, Milestone}
    enum DacStatus {Active, Cancelled}
    enum CampaignStatus {Active, Cancelled, Finished}
    enum MilestoneStatus {
        Active,
        Cancelled,
        Completed, // Fue marcado completado.
        Approved, // Se aprobó una vez completado. Listo para el retiro de fondos.
        Rejected, // Se rechazó una vez completado. Debe volver a completarse.
        Finished // Se finalizó y se retiraron los fondos.
    }
    enum DonationStatus {Available, Spent, Returned}
    enum ButgetStatus {
        Butgeted, // Los fondos del presupuesto están comprometidos.
        Paying, // No utilizado por el momento. Se utiliza si se utiliza una aprobación de pago antes de hacerlo efectivo-
        Closed, // EL presupuesto se cierra sin realizarse el pago.
        Paid // El presupuesto fue pagado.
    }

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
        uint256 fiatAmountTarget; // Cantidad de dinero Fiat necesario para el Milestone.
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

    /// @dev Estructura que almacena el tipo de cambio en USD de un token para una fecha y hora.
    struct ExchangeRate {
        address token;
        uint64 date; // Fecha y hora del tipo de cambio.
        uint256 rate; // USD por Token.
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
    mapping(address => ExchangeRate) public exchangeRates;

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

    modifier exchangeRateExists(address _token) {
        require(
            exchangeRates[_token].date != 0,
            ERROR_EXCHANGE_RATE_NOT_EXISTS
        );
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
    event Withdraw(uint256 milestoneId, address token, uint256 amount);

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
     * @param _fiatAmountTarget Monto máximo para financiar el Milestone.
     * @param _reviewer address del Milestone Reviewer
     * @param _recipient address del Milestone Recipient
     * @param _campaignReviewer address del Campaign Reviewer del Milestone
     */
    function newMilestone(
        string _infoCid,
        uint256 _campaignId,
        uint256 _fiatAmountTarget,
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
        milestone.fiatAmountTarget = _fiatAmountTarget;
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
            // Se asume que el sender aprobó al Crowdfunding para manejar el monto de tokens.
            require(
                ERC20(_token).safeTransferFrom(
                    msg.sender,
                    address(this),
                    _amount
                ),
                ERROR_TOKEN_TRANSFER_FROM_REVERTED
            );
            // Se aprueba al Vault para que transfiera los tokens.
            require(
                ERC20(_token).safeApprove(vault, _amount),
                ERROR_TOKEN_APPROVE_FAILED
            );
            // Se inicia el depósito en el Vault.
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
        Butget storage butget = _getOrNewButget(_entityId, _token);
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
                if (!_contains(dacFrom.campaignIds, entityTo.id)) {
                    revert(ERROR_TRANSFER_CAMPAIGN_NOT_BELONGS_DAC);
                }
                // La Campaign debe estar Activa.
                require(
                    _getCampaign(entityTo.id).status == CampaignStatus.Active,
                    ERROR_TRANSFER_CAMPAIGN_NOT_ACTIVE
                );
            } else if (entityTo.entityType == EntityType.Milestone) {
                // Transferencia DAC > Milestone
                // La entidad de destino debe estar entre los Milestones de las Campaigns de la Dac.
                bool found = false;
                for (uint256 i1 = 0; i1 < dacFrom.campaignIds.length; i1++) {
                    if (
                        _contains(
                            _getCampaign(dacFrom.campaignIds[i1]).milestoneIds,
                            entityTo.id
                        )
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
                // Solamente se permite transferir a una Campaign o Milestone desde una Dac.
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
            // La entidad de destino debe estar entre los Milestone de la Campaign.
            if (!_contains(campaignFrom.milestoneIds, entityTo.id)) {
                revert(ERROR_TRANSFER_MILESTONE_NOT_BELONGS_CAMPAIGN);
            }
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
            _doTransfer(_entityIdFrom, _entityIdTo, _donationIds[i2]);
        }
    }

    /**
     * @notice Retira los fondos del Milestone `_milestoneId`.
     * @dev Implementación de Withdraw Pattern.
     * @param _milestoneId Id del milestone sobre el cual se retiran los fondos.
     */
    function withdraw(uint256 _milestoneId) external isInitialized {
        Milestone storage milestone = _getMilestone(_milestoneId);
        // Solamente el destinatario de los fondos puede hacer el retiro.
        // Withdraw Pattern
        require(milestone.recipient == msg.sender, ERROR_AUTH_FAILED);
        // El Milestone debe estar Aprobado.
        require(
            milestone.status == MilestoneStatus.Approved,
            ERROR_WITHDRAW_NOT_APPROVED
        );
        // El retiro superó las validaciones del Milestones
        uint256 fiatAmountTarget = milestone.fiatAmountTarget;
        Entity storage entity = _getEntity(_milestoneId);
        for (uint256 i = 0; i < entity.butgetIds.length; i++) {
            fiatAmountTarget = _fitButget(
                _milestoneId,
                entity.butgetIds[i],
                fiatAmountTarget
            );
            _doWithdraw(_milestoneId, entity.butgetIds[i]);
        }
        milestone.status = MilestoneStatus.Finished;
    }

    /**
     * @notice Marca el Milestone `_milestoneId` como completado.
     * @param _milestoneId Id del milestone que se marca como completado.
     */
    function milestoneComplete(uint256 _milestoneId) external isInitialized {
        Milestone storage milestone = _getMilestone(_milestoneId);
        // Solamente el Milestone Manager puede marcar el Milestone como completado.
        require(milestone.manager == msg.sender, ERROR_AUTH_FAILED);
        // El Milestone debe estar Activo.
        require(
            milestone.status == MilestoneStatus.Active,
            ERROR_MILESTONE_COMPLETE_NOT_ACTIVE
        );
        milestone.status = MilestoneStatus.Completed;
    }

    /**
     * @notice Marca el Milestone `_milestoneId` como aprobado.
     * @param _milestoneId Id del milestone que se marca como aprobado.
     */
    function milestoneApprove(uint256 _milestoneId) external isInitialized {
        Milestone storage milestone = _getMilestone(_milestoneId);
        // Solamente el Milestone Reviewer o Campaign Reviewer puede
        // marcar el Milestone como aprobado.
        require(
            milestone.reviewer == msg.sender ||
                milestone.campaignReviewer == msg.sender,
            ERROR_AUTH_FAILED
        );
        // El Milestone debe estar Completado.
        require(
            milestone.status == MilestoneStatus.Completed,
            ERROR_MILESTONE_APPROVE_NOT_COMPLETED
        );
        milestone.status = MilestoneStatus.Approved;
    }

    /**
     * @notice Marca el Milestone `_milestoneId` como rechazado.
     * @param _milestoneId Id del milestone que se marca como rechazado.
     */
    function milestoneReject(uint256 _milestoneId) external isInitialized {
        Milestone storage milestone = _getMilestone(_milestoneId);
        // Solamente el Milestone Reviewer o Campaign Reviewer puede
        // marcar el Milestone como rechazado.
        require(
            milestone.reviewer == msg.sender ||
                milestone.campaignReviewer == msg.sender,
            ERROR_AUTH_FAILED
        );
        // El Milestone debe estar Completado.
        require(
            milestone.status == MilestoneStatus.Completed,
            ERROR_MILESTONE_REJECT_NOT_COMPLETED
        );
        milestone.status = MilestoneStatus.Rejected;
    }

    /**
     * @notice Establece que `_rate` del `_token` equivale a 0.01 USD.
     * @dev TODO este método debe reeplazarse por el establecimiento a través de un Oracle.
     *  Evaluar la incorporación de RIF Gateway.
     * @param _token Token para el cual se estable el tipo de cambio en USD.
     * @param _rate Equivalencia de 0.01 USD en Token.
     */
    function setExchangeRate(address _token, uint256 _rate)
        public
        auth(EXCHANGE_RATE_ROLE)
    {
        exchangeRates[_token] = ExchangeRate(_token, getTimestamp64(), _rate);
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

    /**
     * @notice Obtiene los presupuestos de la Entity `_entityId` para cada token.
     * @param _entityId identificador de la entidad.
     * @return Presupuestos del entity con los diferentes tokens.
     */
    function getButgets(uint256 _entityId)
        public
        view
        returns (Butget[] butgets)
    {
        Entity storage entity = _getEntity(_entityId);
        for (uint256 i = 0; i < entity.butgetIds.length; i++) {
            Butget storage butget = butgetData.butgets[entity.butgetIds[i]];
            butgets[i] = butget;
        }
    }

    /**
     * @notice Obtiene el Presupuesto de la Entity `_entityId` del token `_token`.
     * @param _entityId identificador de la entidad.
     * @param _token token del presupuesto.
     * @return Presupuesto del entity y token especificado.
     */
    function getButget(uint256 _entityId, address _token)
        public
        view
        returns (
            uint256 id,
            uint256 idIndex,
            uint256 entityId,
            address token,
            uint256 amount,
            ButgetStatus status
        )
    {
        Entity storage entity = _getEntity(_entityId);
        for (uint256 i = 0; i < entity.butgetIds.length; i++) {
            Butget storage butget = butgetData.butgets[entity.butgetIds[i]];
            if (butget.token == _token) {
                id = butget.id;
                idIndex = butget.idIndex;
                entityId = butget.entityId;
                token = butget.token;
                amount = butget.amount;
                status = butget.status;
                break;
            }
        }
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
        butget.status = ButgetStatus.Butgeted;
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
     * @notice Obtiene el presupuesto `_id`
     * @return Presupuesto cuya identificación coincide con la especificada.
     */
    function _getButget(uint256 _id)
        internal
        view
        butgetExists(_id)
        returns (Butget storage)
    {
        return butgetData.butgets[_id];
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
     * @notice Obtiene el Exchange Rate del Token `_token`
     * @return Exchange Rate del Token.
     */
    function _getExchangeRate(address _token)
        internal
        view
        exchangeRateExists(_token)
        returns (ExchangeRate storage)
    {
        return exchangeRates[_token];
    }

    /**
     * @notice Obtiene el Presupuesto de la Entity `_entityId` del token `_token`.
     * @dev Si el presupuesto aún no fue creado, se crea en este momento.
     * @param _entityId identificador de la entidad.
     * @param _token token del presupuesto.
     * @return Presupuesto del entity y token especificado.
     */
    function _getOrNewButget(uint256 _entityId, address _token)
        internal
        returns (Butget storage butget)
    {
        Entity storage entity = _getEntity(_entityId);
        for (uint256 i = 0; i < entity.butgetIds.length; i++) {
            butget = butgetData.butgets[entity.butgetIds[i]];
            if (butget.token == _token) {
                return;
            }
        }
        // No existe un presupuesto de la entidad para el token especificado,
        // por lo que se crea un nuevo presupuesto para el token.
        butget = _newButget(_entityId, _token);
    }

    /**
     * @notice Realiza la transferencia de la donación `_donationId` desde
     *  la entidad `_entityIdFrom` a la entidad `_entityIdTo`.
     * @dev La donación se transfiere por completo y no fraccionada.
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
        Butget storage butgetFrom = _getOrNewButget(
            _entityIdFrom,
            donation.token
        );
        // La donación debe estar disponible.
        require(
            donation.status == DonationStatus.Available,
            ERROR_TRANSFER_DONATION_NOT_AVAILABLE
        );
        // La donación debe pertenecer al presupuesto de la entidad origen.
        require(
            donation.butgetId == butgetFrom.id,
            ERROR_TRANSFER_DONATION_NOT_BELONGS_ORIGIN
        );

        Butget storage butgetTo = _getOrNewButget(_entityIdTo, donation.token);

        uint256 amountTransfer = donation.amountRemainding;
        //butgetFrom.amount = butgetFrom.amount - amountTransfer;
        butgetFrom.amount = butgetFrom.amount.sub(amountTransfer);
        //butgetTo.amount = butgetTo.amount + amountTransfer;
        butgetTo.amount = butgetTo.amount.add(amountTransfer);
        donation.butgetId = butgetTo.id;

        emit Transfer(_entityIdFrom, _entityIdTo, _donationId, amountTransfer);
    }

    /**
     * @notice Realiza el retiro de fondos desde el presupuesto `_butgetId` del Milestone `_milestoneId`.
     * @param _milestoneId Id del Milestone para el cual se retiran los fondos.
     * @param _butgetId Id del presupuesto desde el cual se retiran los fondos.
     */
    function _doWithdraw(uint256 _milestoneId, uint256 _butgetId) internal {
        Milestone storage milestone = _getMilestone(_milestoneId);
        Butget storage butget = _getButget(_butgetId);
        if (butget.amount == 0) {
            // No se continúa con el retiro porque no hay monto por transferir.
            // El presupuesto es cerrado.
            butget.status = ButgetStatus.Closed;
            return;
        }
        // El presupuesto debe estar comprometido.
        require(
            butget.status == ButgetStatus.Butgeted,
            ERROR_WITHDRAW_NOT_BUTGETED
        );
        // Se realiza la transferencia desde el Vault al destinatario.
        vault.transfer(butget.token, milestone.recipient, butget.amount);
        // El presupuesto es finalizado.
        butget.status = ButgetStatus.Paid;

        emit Withdraw(_milestoneId, butget.token, butget.amount);
    }

    /**
     * @notice Ajusta el presupuesto `_butgetId` del Milestone `_milestoneId`
     *  según el monto objetivo `_fiatAmountTarget`.
     *  @dev Los cálculos de valores restantes de las donaciones del presupuesto,
     *  ajustan el presupuesto en sí.
     * @param _milestoneId Id del Milestone para el cual se ajusta el presupuesto.
     * @param _butgetId Id del presupuesto del Milestone que se ajusta.
     * @param _fiatAmountTarget Monto en dinero fiat objetivo a alcanzar por el presupuesto.
     */
    function _fitButget(
        uint256 _milestoneId,
        uint256 _butgetId,
        uint256 _fiatAmountTarget
    ) internal returns (uint256 fiatAmountTarget) {
        Milestone storage milestone = _getMilestone(_milestoneId);
        Butget storage butget = _getButget(_butgetId);
        uint256 rate = _getExchangeRate(butget.token).rate;
        //uint256[] memory donationIds = _getDonationIdsByButget(_butgetId);

        // returns $0.01 ETH wei
        // A cuántos Token (WEI) equivale un 0.01 USD.

        // Centavos de dolar.
        //fiatAmountTarget = _fiatAmountTarget;

        // WEI objetivo
        //uint256 weiAmountTarget = _fiatAmountTarget * rate;
        uint256 weiAmountTarget = _fiatAmountTarget.mul(rate);

        for (uint256 i = 0; i < donationData.ids.length; i++) {
            Donation storage donation = donationData.donations[donationData
                .ids[i]];

            if (donation.butgetId != _butgetId) {
                continue;
            }

            //uint256 fiatAmount = donation.amountRemainding * rate;
            //if (fiatAmountTarget >= fiatAmount) {
            if (weiAmountTarget >= donation.amountRemainding) {
                // No se superó el monto objetivo.
                donation.amountRemainding = 0;
                donation.status = DonationStatus.Spent;
                //fiatAmountTarget = fiatAmountTarget - fiatAmount;
                //weiAmountTarget = weiAmountTarget - donation.amountRemainding;
                weiAmountTarget = weiAmountTarget.sub(
                    donation.amountRemainding
                );
            } else {
                // El monto restante de la donación es superior al objetivo.
                if (weiAmountTarget != 0) {
                    // Se calculan los Token para completar el objetivo.
                    //uint256 tokenAmountTarget = fiatAmountTarget / rate;
                    /*donation.amountRemainding =
                        donation.amountRemainding -
                        tokenAmountTarget;*/
                    /*donation.amountRemainding =
                        donation.amountRemainding -
                        weiAmountTarget;*/
                    donation.amountRemainding = donation.amountRemainding.sub(
                        weiAmountTarget
                    );
                    weiAmountTarget = 0;
                }
                // Se transfiere el fondo restante de la Donación a la Campaign del Milestone.
                _doTransfer(milestone.id, milestone.campaignId, donation.id);
            }
        }

        // El redondeo favorece a la retención de fondos.
        fiatAmountTarget = weiAmountTarget.div(rate);
    }

    /**
     * @notice Obtiene los Ids de las donaciones del presupuesto `_butgetId`.
     * @param _butgetId identificador del presuesto al cual pertenecen las donaciones.
     * @return Ids de las donaciones del presupuesto.
     */
    function _getDonationIdsByButget(uint256 _butgetId)
        public
        view
        butgetExists(_butgetId)
        returns (uint256[] memory)
    {
        uint256[] memory donationIds = new uint256[](1);
        for (uint256 i = 0; i < donationData.ids.length; i++) {
            Donation storage donation = donationData.donations[donationData
                .ids[i]];
            if (donation.butgetId == _butgetId) {
                donationIds[donationIds.length] = donation.id;
            }
        }
        return donationIds;
    }

    // Internal functions - utils

    /**
     * @dev Determina si una arreglo contiene un elemento o no.
     * @param _array arreglo de elementos
     * @param _element elemento a determinar si se encuentra dentro del arreglo o no.
     * @return si elemento existe o no dentro del arreglo.
     */
    function _contains(uint256[] _array, uint256 _element)
        internal
        pure
        returns (bool contains)
    {
        contains = false;
        for (uint256 i = 0; i < _array.length; i++) {
            if (_array[i] == _element) {
                contains = true;
                break;
            }
        }
    }
}

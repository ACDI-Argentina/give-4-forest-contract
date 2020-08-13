pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "./Constants.sol";
import "./ArrayLib.sol";
import "./EntityLib.sol";
import "./DacLib.sol";
import "./CampaignLib.sol";
import "./MilestoneLib.sol";
import "./DonationLib.sol";
import "./BudgetLib.sol";

/**
 * @title Crowdfunding
 * @author Mauricio Coronel
 * @notice Contrato encargado de las principales operaciones de manejo de entidades y fondos.
 */
contract Crowdfunding is AragonApp, Constants {
    using EntityLib for EntityLib.Data;
    using DacLib for DacLib.Data;
    using CampaignLib for CampaignLib.Data;
    using MilestoneLib for MilestoneLib.Data;
    using DonationLib for DonationLib.Data;
    using BudgetLib for BudgetLib.Data;
    using SafeMath for uint256;

    /// @dev Estructura que almacena el tipo de cambio en USD de un token para una fecha y hora.
    struct ExchangeRate {
        address token;
        uint64 date; // Fecha y hora del tipo de cambio.
        uint256 rate; // USD por Token.
    }

    EntityLib.Data entityData;
    DacLib.Data dacData;
    CampaignLib.Data campaignData;
    MilestoneLib.Data milestoneData;
    DonationLib.Data donationData;
    BudgetLib.Data budgetData;

    mapping(address => ExchangeRate) public exchangeRates;

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
        uint256 entityId = _newEntity(EntityLib.EntityType.Dac);
        dacData.insert(entityId, _infoCid, msg.sender);
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
    ) external auth(CREATE_CAMPAIGN_ROLE) {
        // Se comprueba que la Dac exista.
        DacLib.Dac storage dac = _getDac(_dacId);
        uint256 entityId = _newEntity(EntityLib.EntityType.Campaign);
        campaignData.insert(entityId, _infoCid, _dacId, msg.sender, _reviewer);
        dac.campaignIds.push(entityId);
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
    ) external auth(CREATE_MILESTONE_ROLE) {
        // Se comprueba que la Campaign exista.
        CampaignLib.Campaign storage campaign = _getCampaign(_campaignId);
        uint256 entityId = _newEntity(EntityLib.EntityType.Milestone);
        milestoneData.insert(
            entityId,
            _infoCid,
            _campaignId,
            _fiatAmountTarget,
            msg.sender,
            _reviewer,
            _recipient,
            _campaignReviewer
        );
        campaign.milestoneIds.push(entityId);
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
    ) external payable isInitialized {
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
        uint256 donationId = donationData.insert(
            _entityId,
            _token,
            _amount,
            msg.sender
        );

        // Se agrega a las donaciones de la entidad.
        EntityLib.Entity storage entity = _getEntity(_entityId);
        entity.donationIds.push(donationId);

        // Se agrega al presupuesto de la entidad.
        BudgetLib.Budget storage budget = _getOrNewBudget(_entityId, _token);
        budget.amount = budget.amount.add(_amount);
        budget.donationIds.push(donationId);

        DonationLib.Donation storage donation = _getDonation(donationId);
        donation.budgetId = budget.id;

        emit NewDonation(donation.id, _entityId, _token, _amount);
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
        EntityLib.Entity storage entityFrom = _getEntity(_entityIdFrom);
        EntityLib.Entity storage entityTo = _getEntity(_entityIdTo);
        if (entityFrom.entityType == EntityLib.EntityType.Dac) {
            DacLib.Dac storage dacFrom = _getDac(entityFrom.id);
            // Solamente el Delegate de la DAC puede trasferir fondos.
            require(
                dacFrom.delegate == msg.sender,
                ERROR_TRANSFER_NOT_AUTHORIZED
            );
            // La DAC debe estar Activa.
            require(
                dacFrom.status == DacLib.Status.Active,
                ERROR_TRANSFER_DAC_NOT_ACTIVE
            );
            // La entidad destino debe pertenecer a la DAC
            if (entityTo.entityType == EntityLib.EntityType.Campaign) {
                // Transferencia DAC > Campaign
                // La entidad de destino debe estar entre las Campaigns de la Dac.
                if (!ArrayLib.contains(dacFrom.campaignIds, entityTo.id)) {
                    revert(ERROR_TRANSFER_CAMPAIGN_NOT_BELONGS_DAC);
                }
                // La Campaign debe estar Activa.
                require(
                    _getCampaign(entityTo.id).status ==
                        CampaignLib.Status.Active,
                    ERROR_TRANSFER_CAMPAIGN_NOT_ACTIVE
                );
            } else if (entityTo.entityType == EntityLib.EntityType.Milestone) {
                // Transferencia DAC > Milestone
                // La entidad de destino debe estar entre los Milestones de las Campaigns de la Dac.
                bool found = false;
                for (uint256 i1 = 0; i1 < dacFrom.campaignIds.length; i1++) {
                    if (
                        ArrayLib.contains(
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
                    _getMilestone(entityTo.id).status ==
                        MilestoneLib.Status.Active,
                    ERROR_TRANSFER_MILESTONE_NOT_ACTIVE
                );
            } else {
                // Solamente se permite transferir a una Campaign o Milestone desde una Dac.
                revert(ERROR_TRANSFER_INVALID);
            }
        } else if (entityFrom.entityType == EntityLib.EntityType.Campaign) {
            CampaignLib.Campaign storage campaignFrom = _getCampaign(
                entityFrom.id
            );
            // Solamente el Manager de la Campaign puede trasferir fondos.
            require(
                campaignFrom.manager == msg.sender,
                ERROR_TRANSFER_NOT_AUTHORIZED
            );
            // La Campaign debe estar Activa.
            require(
                campaignFrom.status == CampaignLib.Status.Active,
                ERROR_TRANSFER_CAMPAIGN_NOT_ACTIVE
            );
            // La entidad de destino debe estar entre los Milestone de la Campaign.
            if (!ArrayLib.contains(campaignFrom.milestoneIds, entityTo.id)) {
                revert(ERROR_TRANSFER_MILESTONE_NOT_BELONGS_CAMPAIGN);
            }
            // Transferencia Campaign > Milestone
            // El Milestone debe estar Activo.
            require(
                _getMilestone(entityTo.id).status == MilestoneLib.Status.Active,
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
        MilestoneLib.Milestone storage milestone = _getMilestone(_milestoneId);
        // Solamente el destinatario de los fondos o el manager pueden hacer el retiro.
        // Withdraw Pattern
        require(
            milestone.recipient == msg.sender ||
                milestone.manager == msg.sender,
            ERROR_AUTH_FAILED
        );
        // El Milestone debe estar Aprobado.
        // TODO Volver a colocar restricción se implemente que el Milestone está completo.
        /*require(
            milestone.status == MilestoneLib.Status.Approved,
            ERROR_WITHDRAW_NOT_APPROVED
        );*/
        // El retiro superó las validaciones del Milestones
        uint256 fiatAmountTarget = milestone.fiatAmountTarget;
        EntityLib.Entity storage entity = _getEntity(_milestoneId);
        for (uint256 i = 0; i < entity.budgetIds.length; i++) {
            fiatAmountTarget = _fitBudget(
                _milestoneId,
                entity.budgetIds[i],
                fiatAmountTarget
            );
            _doWithdraw(_milestoneId, entity.budgetIds[i]);
        }
        milestone.status = MilestoneLib.Status.Paid;
    }

    /**
     * @notice Marca el Milestone `_milestoneId` como completado.
     * @param _milestoneId Id del milestone que se marca como completado.
     */
    function milestoneComplete(uint256 _milestoneId) external isInitialized {
        MilestoneLib.Milestone storage milestone = _getMilestone(_milestoneId);
        // Solamente el Milestone Manager puede marcar el Milestone como completado.
        require(milestone.manager == msg.sender, ERROR_AUTH_FAILED);
        // El Milestone debe estar Activo.
        require(
            milestone.status == MilestoneLib.Status.Active,
            ERROR_MILESTONE_COMPLETE_NOT_ACTIVE
        );
        milestone.status = MilestoneLib.Status.Completed;
    }

    /**
     * @notice Marca el Milestone `_milestoneId` como aprobado si `_approve` es true.
     *  Marca el Milestone como rechazado si `_approve` es false.
     * @param _milestoneId Id del milestone que se marca como aprobado o rechazado.
     * @param _approve Especifica si se aprueba o no el Milestone.
     */
    function milestoneApprove(uint256 _milestoneId, bool _approve)
        external
        isInitialized
    {
        MilestoneLib.Milestone storage milestone = _getMilestone(_milestoneId);
        // Solamente el Milestone Reviewer o Campaign Reviewer puede
        // marcar el Milestone como aprobado o no.
        require(
            milestone.reviewer == msg.sender ||
                milestone.campaignReviewer == msg.sender,
            ERROR_AUTH_FAILED
        );
        // El Milestone debe estar Completado.
        require(
            milestone.status == MilestoneLib.Status.Completed,
            ERROR_MILESTONE_APPROVE_NOT_COMPLETED
        );
        if (_approve) {
            // Milestone Aprobado
            milestone.status = MilestoneLib.Status.Approved;
        } else {
            // Milestone Rechazado
            milestone.status = MilestoneLib.Status.Rejected;
        }
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
     * @notice Obtiene todos los identificadores de Dacs.
     * @return Arreglo con todos los identificadores de Dacs.
     */
    function getDacIds() external view returns (uint256[]) {
        return dacData.ids;
    }

    /**
     * @notice Obtiene todos los identificadores de Campaigns.
     * @return Arreglo con todos los identificadores de Campaigns.
     */
    function getCampaignIds() external view returns (uint256[]) {
        return campaignData.ids;
    }

    /**
     * @notice Obtiene todos los identificadores de Milestones.
     * @return Arreglo con todos los identificadores de Milestones.
     */
    function getMilestoneIds() external view returns (uint256[]) {
        return milestoneData.ids;
    }

    /**
     * @notice Obtiene todos los identificadores de Donaciones.
     * @return Arreglo con todos los identificadores de Donaciones.
     */
    function getDonationIds() external view returns (uint256[]) {
        return donationData.ids;
    }

    /**
     * @notice Obtiene el Entity cuyo identificador coincide con `_id`.
     * @return Datos del Entity.
     */
    function getEntity(uint256 _id)
        external
        view
        returns (
            uint256 id,
            uint256 idIndex,
            EntityLib.EntityType entityType,
            uint256[] budgetIds
        )
    {
        EntityLib.Entity storage entity = _getEntity(_id);
        id = entity.id;
        idIndex = entity.idIndex;
        entityType = entity.entityType;
        budgetIds = entity.budgetIds;
    }

    /**
     * @notice Obtiene la Dac cuyo identificador coincide con `_id`.
     * @return Datos de la Dac.
     */
    function getDac(uint256 _id)
        external
        view
        returns (
            uint256 id,
            uint256 idIndex,
            string infoCid,
            address delegate,
            uint256[] campaignIds,
            uint256[] donationIds,
            uint256[] budgetIds,
            DacLib.Status status
        )
    {
        EntityLib.Entity storage entity = _getEntity(_id);
        DacLib.Dac storage dac = _getDac(_id);
        id = dac.id;
        idIndex = dac.idIndex;
        infoCid = dac.infoCid;
        delegate = dac.delegate;
        campaignIds = dac.campaignIds;
        donationIds = entity.donationIds;
        budgetIds = entity.budgetIds;
        status = dac.status;
    }

    /**
     * @notice Obtiene la Campaign cuyo identificador coincide con `_id`.
     * @return Datos de la Campaign.
     */
    function getCampaign(uint256 _id)
        external
        view
        returns (
            uint256 id,
            uint256 idIndex,
            string infoCid,
            address manager,
            address reviewer,
            uint256[] dacIds,
            uint256[] milestoneIds,
            uint256[] donationIds,
            uint256[] budgetIds,
            CampaignLib.Status status
        )
    {
        EntityLib.Entity storage entity = _getEntity(_id);
        CampaignLib.Campaign storage campaign = _getCampaign(_id);
        id = campaign.id;
        idIndex = campaign.idIndex;
        infoCid = campaign.infoCid;
        manager = campaign.manager;
        reviewer = campaign.reviewer;
        dacIds = campaign.dacIds;
        milestoneIds = campaign.milestoneIds;
        donationIds = entity.donationIds;
        budgetIds = entity.budgetIds;
        status = campaign.status;
    }

    /**
     * @notice Obtiene el Milestone cuyo identificador coincide con `_id`.
     * @return Datos del Milestone.
     */
    function getMilestone(uint256 _id)
        external
        view
        returns (
            uint256 id,
            uint256 idIndex,
            string infoCid,
            uint256 fiatAmountTarget,
            address manager,
            address reviewer,
            address recipient,
            address campaignReviewer,
            uint256 campaignId,
            uint256[] donationIds,
            uint256[] budgetIds,
            MilestoneLib.Status status
        )
    {
        EntityLib.Entity storage entity = _getEntity(_id);
        MilestoneLib.Milestone storage milestone = _getMilestone(_id);
        id = milestone.id;
        idIndex = milestone.idIndex;
        infoCid = milestone.infoCid;
        fiatAmountTarget = milestone.fiatAmountTarget;
        manager = milestone.manager;
        reviewer = milestone.reviewer;
        recipient = milestone.recipient;
        campaignReviewer = milestone.campaignReviewer;
        campaignId = milestone.campaignId;
        donationIds = entity.donationIds;
        budgetIds = entity.budgetIds;
        status = milestone.status;
    }

    /**
     * @notice Obtiene el Presupuesto cuyo identificador coincide con `_id`.
     * @return Datos del Presupuesto.
     */
    function getBudget(uint256 _id)
        external
        view
        returns (
            uint256 id,
            uint256 idIndex,
            uint256 entityId,
            address token,
            uint256 amount,
            uint256[] donationIds,
            BudgetLib.Status status
        )
    {
        BudgetLib.Budget storage budget = _getBudget(_id);
        id = budget.id;
        idIndex = budget.idIndex;
        entityId = budget.entityId;
        token = budget.token;
        amount = budget.amount;
        donationIds = budget.donationIds;
        status = budget.status;
    }

    /**
     * @notice Obtiene la Donación cuyo identificador coincide con `_id`.
     * @return Datos de la Donación.
     */
    function getDonation(uint256 _id)
        external
        view
        returns (
            uint256 id,
            uint256 idIndex,
            address giver,
            address token,
            uint256 amount,
            uint256 amountRemainding,
            uint256 createdAt,
            uint256 entityId,
            uint256 budgetId,
            DonationLib.Status status
        )
    {
        DonationLib.Donation storage donation = _getDonation(_id);
        id = donation.id;
        idIndex = donation.idIndex;
        giver = donation.giver;
        token = donation.token;
        amount = donation.amount;
        amountRemainding = donation.amountRemainding;
        createdAt = donation.createdAt;
        entityId = donation.entityId;
        budgetId = donation.budgetId;
        status = donation.status;
    }

    // Internal functions

    /**
     * @notice Crea una nueva entidad del tipo `_entityType`.
     * @return Identificador de la nueva entidad creada.
     */
    function _newEntity(EntityLib.EntityType _entityType)
        private
        returns (uint256)
    {
        return entityData.insert(_entityType);
    }

    /**
     * @notice Obtiene el Presupuesto de la Entity `_entityId` del token `_token`.
     * @dev Si el presupuesto aún no fue creado, se crea en este momento.
     * @param _entityId identificador de la entidad.
     * @param _token token del presupuesto.
     * @return Presupuesto del entity y token especificado.
     */
    function _getOrNewBudget(uint256 _entityId, address _token)
        internal
        returns (BudgetLib.Budget storage)
    {
        EntityLib.Entity storage entity = _getEntity(_entityId);
        for (uint256 i = 0; i < entity.budgetIds.length; i++) {
            BudgetLib.Budget storage budget = budgetData.budgets[entity
                .budgetIds[i]];
            if (budget.token == _token) {
                return budget;
            }
        }
        // No existe un presupuesto de la entidad para el token especificado,
        // por lo que se crea un nuevo presupuesto para el token.
        uint256 budgetId = budgetData.insert(_entityId, _token);
        // Se asocia el presupuesto a la entidad
        entityData.entities[_entityId].budgetIds.push(budgetId);
        return _getBudget(budgetId);
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
        DonationLib.Donation storage donation = _getDonation(_donationId);
        BudgetLib.Budget storage budgetFrom = _getOrNewBudget(
            _entityIdFrom,
            donation.token
        );
        // La donación debe estar disponible.
        require(
            donation.status == DonationLib.Status.Available,
            ERROR_TRANSFER_DONATION_NOT_AVAILABLE
        );
        // La donación debe pertenecer al presupuesto de la entidad origen.
        require(
            donation.budgetId == budgetFrom.id,
            ERROR_TRANSFER_DONATION_NOT_BELONGS_ORIGIN
        );

        BudgetLib.Budget storage budgetTo = _getOrNewBudget(
            _entityIdTo,
            donation.token
        );

        uint256 amountTransfer = donation.amountRemainding;
        // Se quita la donación del presupuesto origen.
        budgetFrom.amount = budgetFrom.amount.sub(amountTransfer);
        ArrayLib.removeElement(budgetFrom.donationIds, _donationId);
        // Se agrega la donación al presupuesto destino.
        budgetTo.amount = budgetTo.amount.add(amountTransfer);
        budgetTo.donationIds.push(_donationId);
        donation.budgetId = budgetTo.id;

        emit Transfer(_entityIdFrom, _entityIdTo, _donationId, amountTransfer);
    }

    /**
     * @notice Realiza el retiro de fondos desde el presupuesto `_budgetId` del Milestone `_milestoneId`.
     * @param _milestoneId Id del Milestone para el cual se retiran los fondos.
     * @param _budgetId Id del presupuesto desde el cual se retiran los fondos.
     */
    function _doWithdraw(uint256 _milestoneId, uint256 _budgetId) internal {
        MilestoneLib.Milestone storage milestone = _getMilestone(_milestoneId);
        BudgetLib.Budget storage budget = _getBudget(_budgetId);
        if (budget.amount == 0) {
            // No se continúa con el retiro porque no hay monto por transferir.
            // El presupuesto es cerrado.
            budget.status = BudgetLib.Status.Closed;
            return;
        }
        // El presupuesto debe estar comprometido.
        require(
            budget.status == BudgetLib.Status.Budgeted,
            ERROR_WITHDRAW_NOT_BUDGETED
        );
        // Se realiza la transferencia desde el Vault al destinatario.
        vault.transfer(budget.token, milestone.recipient, budget.amount);
        // El presupuesto es finalizado.
        budget.status = BudgetLib.Status.Paid;

        emit Withdraw(_milestoneId, budget.token, budget.amount);
    }

    /**
     * @notice Ajusta el presupuesto `_budgetId` del Milestone `_milestoneId`
     *  según el monto objetivo `_fiatAmountTarget`.
     *  @dev Los cálculos de valores restantes de las donaciones del presupuesto,
     *  ajustan el presupuesto en sí.
     * @param _milestoneId Id del Milestone para el cual se ajusta el presupuesto.
     * @param _budgetId Id del presupuesto del Milestone que se ajusta.
     * @param _fiatAmountTarget Monto en dinero fiat objetivo a alcanzar por el presupuesto.
     */
    function _fitBudget(
        uint256 _milestoneId,
        uint256 _budgetId,
        uint256 _fiatAmountTarget
    ) private returns (uint256 fiatAmountTarget) {
        MilestoneLib.Milestone storage milestone = _getMilestone(_milestoneId);
        BudgetLib.Budget storage budget = _getBudget(_budgetId);
        uint256 rate = _getExchangeRate(budget.token).rate;
        uint256 amountTarget = _fiatAmountTarget.mul(rate);
        for (uint256 i = 0; i < budget.donationIds.length; i++) {
            /*DonationLib.Donation storage donation = donationData
                .donations[budget.donationIds[i]];*/
            DonationLib.Donation storage donation = _getDonation(
                budget.donationIds[i]
            );
            if (amountTarget >= donation.amountRemainding) {
                // No se superó el monto objetivo.
                donation.amountRemainding = 0;
                donation.status = DonationLib.Status.Spent;
                amountTarget = amountTarget.sub(donation.amountRemainding);
            } else {
                // El monto restante de la donación es superior al objetivo.
                if (amountTarget != 0) {
                    // Se calculan los Token para completar el objetivo.
                    donation.amountRemainding = donation.amountRemainding.sub(
                        amountTarget
                    );
                    amountTarget = 0;
                }
                // Se transfiere el fondo restante de la Donación a la Campaign del Milestone.
                _doTransfer(milestone.id, milestone.campaignId, donation.id);
            }
        }
        // El redondeo favorece a la retención de fondos.
        fiatAmountTarget = amountTarget.div(rate);
    }

    function _getEntity(uint256 _id)
        private
        returns (EntityLib.Entity storage)
    {
        return entityData.getEntity(_id);
    }

    function _getDac(uint256 _id) private returns (DacLib.Dac storage) {
        return dacData.getDac(_id);
    }

    function _getCampaign(uint256 _id)
        private
        returns (CampaignLib.Campaign storage)
    {
        return campaignData.getCampaign(_id);
    }

    function _getMilestone(uint256 _id)
        private
        returns (MilestoneLib.Milestone storage)
    {
        return milestoneData.getMilestone(_id);
    }

    function _getBudget(uint256 _id)
        private
        returns (BudgetLib.Budget storage)
    {
        return budgetData.getBudget(_id);
    }

    function _getDonation(uint256 _id)
        private
        returns (DonationLib.Donation storage)
    {
        return donationData.getDonation(_id);
    }

    /**
     * @notice Obtiene el Exchange Rate del Token `_token`
     * @return Exchange Rate del Token.
     */
    function _getExchangeRate(address _token)
        private
        returns (ExchangeRate storage)
    {
        require(
            exchangeRates[_token].date != 0,
            ERROR_EXCHANGE_RATE_NOT_EXISTS
        );
        return exchangeRates[_token];
    }
}

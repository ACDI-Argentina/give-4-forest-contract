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
import "./ActivityLib.sol";
import "./DonationLib.sol";

import "./ExchangeRateProvider.sol";
/**
 * @title Crowdfunding
 * @author ACDI
 * @notice Contrato encargado de las principales operaciones de manejo de entidades y fondos.
 */
contract Crowdfunding is AragonApp, Constants {
    using EntityLib for EntityLib.Data;
    using DacLib for DacLib.Data;
    using CampaignLib for CampaignLib.Data;
    using MilestoneLib for MilestoneLib.Data;
    using ActivityLib for ActivityLib.Data;
    using DonationLib for DonationLib.Data;
    using SafeMath for uint256;

    EntityLib.Data entityData;
    DacLib.Data dacData;
    CampaignLib.Data campaignData;
    MilestoneLib.Data milestoneData;
    ActivityLib.Data activityData;
    DonationLib.Data donationData; 

    ExchangeRateProvider public exchangeRateProvider;

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
    event SaveCampaign(uint256 id);
    event SaveMilestone(uint256 id);
    event NewDonation(
        uint256 id,
        uint256 entityId,
        address token,
        uint256 amount
    );
    event Transfer(
        uint256 entityIdFrom,
        uint256 entityIdTo,
        uint256 donationId
    );
    event MilestoneComplete(uint256 milestoneId);
    event MilestoneApprove(uint256 milestoneId);
    event MilestoneReject(uint256 milestoneId);
    event MilestoneWithdraw(uint256 milestoneId, address token, uint256 amount);

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
     * @notice Crea o actualiza una campaign.
     * quien envía la transacción es el manager de la campaign.
     * @param _infoCid Content ID de las información (JSON) de la Campaign. IPFS Cid.
     * @param _dacId Id de la Dac a la cual pertenece la Campaign.
     * @param _reviewer address del Campaign Reviewer
     *  @param _campaignId 0 para nueva campaign o el id del campaign en el caso de  modificación
     */
    function saveCampaign(
        string _infoCid,
        uint256 _dacId,
        address _reviewer,
        uint256 _campaignId
    ) external auth(CREATE_CAMPAIGN_ROLE) {
        DacLib.Dac storage dac = _getDac(_dacId); // Se comprueba que la Dac exista.
        uint256 entityId;

        if (_campaignId == 0) {
            entityId = _newEntity(EntityLib.EntityType.Campaign);
        } else {
            entityId = _campaignId;
            require(msg.sender == campaignData.getCampaign(entityId).manager, ERROR_AUTH_FAILED);
            ArrayLib.removeElement(_getDac(_getCampaign(entityId).dacIds[0]).campaignIds, entityId); //Borra la referencias desde las dac anterior, TODO: COMPROBAR SI CAMBIO
        }

        campaignData.save(
            entityId,
            _infoCid,
            _dacId,
            msg.sender,
            _reviewer,
            _campaignId
        );

        dac.campaignIds.push(entityId);
        emit SaveCampaign(entityId);
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
    function saveMilestone(
        string _infoCid,
        uint256 _campaignId,
        uint256 _fiatAmountTarget,
        address _reviewer,
        address _recipient,
        address _campaignReviewer,
        uint256 _milestoneId
    ) external auth(CREATE_MILESTONE_ROLE) {
        CampaignLib.Campaign storage campaign = _getCampaign(_campaignId);// Se comprueba que la Campaign exista.

        uint256 entityId;

        if (_milestoneId == 0) { //crear nuevo milestone
            entityId = _newEntity(EntityLib.EntityType.Milestone);
        } else {
            entityId = _milestoneId;
            require(msg.sender == milestoneData.getMilestone(_milestoneId).manager, ERROR_AUTH_FAILED);  
            ArrayLib.removeElement(_getCampaign(milestoneData.getMilestone(_milestoneId).campaignId).milestoneIds, entityId); //Borra la referencia de la camapaña anterior
        }
        milestoneData.save(
            entityId,
            _infoCid,
            _campaignId,
            _fiatAmountTarget,
            msg.sender,
            _reviewer,
            _recipient,
            _campaignReviewer,
            _milestoneId
        );
        campaign.milestoneIds.push(entityId);
        emit SaveMilestone(entityId);        
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
        require(
            donationData.isTokenEnabled(_token),
            ERROR_DONATE_TOKEN_NOT_ENABLED
        );
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

        // Se agrega a las donaciones de la entidad y su presupuesto.
        EntityLib.Entity storage entity = _getEntity(_entityId);
        entity.donationIds.push(donationId);
        entity.budgetDonationIds.push(donationId);

        emit NewDonation(donationId, _entityId, _token, _amount);
    }

    /**
     * @notice Realiza la transferencia de las donaciones `_donationIds` desde
     *  la entidad `_entityIdFrom` a la entidad `_entityIdTo`.
     * @dev Las donaciones se transfieren por completo y no fraccionadas.
     *  Previo a realiza la transferencia de las donaciones, se realizan validaciones
     *  de autorización, estructura y estados.
     * @param _entityIdFrom Id de la entidad de la cual las donaciones forman parte de su presupuesto.
     * @param _entityIdTo Id de la entidad a la cual se transfieren las donaciones para formar parte de su presupuesto.
     * @param _donationIds Ids de las donaciones a transferir de presupuesto.
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
     * @notice Marca el Milestone `_milestoneId` como completado.
     * @param _milestoneId Id del milestone que se marca como completado.
     * @param _activityInfoCid Content ID de las información (JSON) de la actividad
     * que prueba las completitud del Milestone. IPFS Cid.
     */
    function milestoneComplete(uint256 _milestoneId, string _activityInfoCid)
        external
        isInitialized
    {
        MilestoneLib.Milestone storage milestone = _getMilestone(_milestoneId);
        // Solamente el Milestone Manager puede marcar el Milestone como completado.
        require(milestone.manager == msg.sender, ERROR_AUTH_FAILED);
        // El Milestone debe estar Activo.
        require(
            milestone.status == MilestoneLib.Status.Active ||
                milestone.status == MilestoneLib.Status.Rejected,
            ERROR_MILESTONE_CANNOT_COMPLETE
        );
        // Registración de la actividad.
        uint256 activityId = activityData.insert(
            _activityInfoCid,
            msg.sender,
            _milestoneId
        );
        milestone.activityIds.push(activityId);
        milestone.status = MilestoneLib.Status.Completed;
        emit MilestoneComplete(_milestoneId);
    }

    /**
     * @notice Marca el Milestone `_milestoneId` como aprobado si `_approve` es true.
     *  Marca el Milestone como rechazado si `_approve` es false.
     * @param _milestoneId Id del milestone que se marca como aprobado o rechazado.
     * @param _approve Especifica si se aprueba o no el Milestone.
     * @param _activityInfoCid Content ID de las información (JSON) de la actividad
     * que comprueba la aprobación o no del Milestone. IPFS Cid.
     */
    function milestoneReview(
        uint256 _milestoneId,
        bool _approve,
        string _activityInfoCid
    ) external isInitialized {
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
            ERROR_MILESTONE_REVIEW_NOT_COMPLETED
        );
        // Registración de la actividad.
        uint256 activityId = activityData.insert(
            _activityInfoCid,
            msg.sender,
            _milestoneId
        );
        milestone.activityIds.push(activityId);
        if (_approve) {
            // Milestone Aprobado
            milestone.status = MilestoneLib.Status.Approved;
            emit MilestoneApprove(_milestoneId);
        } else {
            // Milestone Rechazado
            milestone.status = MilestoneLib.Status.Rejected;
            emit MilestoneReject(_milestoneId);
        }
    }

    /**
     * @notice Retira los fondos del Milestone `_milestoneId`.
     * @dev Implementación de Withdraw Pattern.
     * @param _milestoneId Id del milestone desde el cual se retiran los fondos.
     */
    function milestoneWithdraw(uint256 _milestoneId) external isInitialized {
        MilestoneLib.Milestone storage milestone = _getMilestone(_milestoneId);
        // Solamente el destinatario de los fondos o el manager pueden hacer el retiro.
        // Withdraw Pattern
        require(
            milestone.recipient == msg.sender ||
                milestone.manager == msg.sender,
            ERROR_AUTH_FAILED
        );
        // El Milestone debe estar Aprobado.
        require(
            milestone.status == MilestoneLib.Status.Approved,
            ERROR_WITHDRAW_NOT_APPROVED
        );
        // El retiro superó las validaciones del Milestones
        EntityLib.Entity storage entity = _getEntity(_milestoneId);
        uint256 fiatAmountTarget = milestone.fiatAmountTarget;
        for (uint256 i1 = 0; i1 < donationData.tokens.length; i1++) {
            // El retiro se realiza ordenado por token de las donaciones.
            address token = donationData.tokens[i1];
            uint256 tokenAmount = 0;
            uint256 tokenRate = exchangeRateProvider.getExchangeRate(token);
            for (uint256 i2 = 0; i2 < entity.budgetDonationIds.length; i2++) {
                DonationLib.Donation storage donation = _getDonation(
                    entity.budgetDonationIds[i2]
                );
                if (donation.token != token) {
                    // La donación no se realizó con el token analizado. Se omite su procesamiento.
                    // Es la solución para procesar las donaciones agrupadas por token.
                    continue;
                }
                // Se ajusta la donación según su relación con el monto objetivo del milestone.
                uint256 amountTarget = fiatAmountTarget.mul(tokenRate);
                if (amountTarget >= donation.amountRemainding) {
                    // No se superó el monto objetivo.
                    tokenAmount = tokenAmount.add(donation.amountRemainding);
                    donation.amountRemainding = 0;
                    donation.status = DonationLib.Status.Spent;
                    amountTarget = amountTarget.sub(donation.amountRemainding);
                } else {
                    // El monto restante de la donación es superior al objetivo.
                    if (amountTarget != 0) {
                        // Se calculan los Token para completar el objetivo.
                        tokenAmount = tokenAmount.add(amountTarget);
                        donation.amountRemainding = donation
                            .amountRemainding
                            .sub(amountTarget);
                        amountTarget = 0;
                    }
                    // Se transfiere el fondo restante de la Donación a la Campaign del Milestone.
                    _doTransfer(
                        _milestoneId,
                        milestone.campaignId,
                        donation.id
                    );
                }
                // El redondeo favorece a la retención de fondos en el smart contract.
                fiatAmountTarget = amountTarget.div(tokenRate);
            }
            // Se realiza el retiro del monto para el token.
            if (tokenAmount == 0) {
                // No se continúa con el retiro porque no hay monto por transferir.
                continue;
            }
            // Se realiza la transferencia desde el Vault al destinatario.
            vault.transfer(token, milestone.recipient, tokenAmount);
            emit MilestoneWithdraw(_milestoneId, token, tokenAmount);
        }
        milestone.status = MilestoneLib.Status.Paid;
    }

    /**
     * @notice Habilita el token `_token` para realizar donaciones.
     * @param _token token habilitado para realizar donaciones.
     */
    function enableToken(address _token) public auth(ENABLE_TOKEN_ROLE) {
        donationData.insertToken(_token);
    }

    function setExchangeRateProvider(ExchangeRateProvider _exchangeRateProvider) 
        public 
        auth(SET_EXCHANGE_RATE_PROVIDER){
        exchangeRateProvider = _exchangeRateProvider; 
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
     * @notice Obtiene la Dac cuyo identificador coincide con `_id`.
     * @return Datos de la Dac.
     */
    function getDac(uint256 _id)
        external
        view
        returns (
            uint256 id,
            string infoCid,
            address[] users,
            uint256[] campaignIds,
            uint256[] donationIds,
            uint256[] budgetDonationIds,
            DacLib.Status status
        )
    {
        EntityLib.Entity storage entity = _getEntity(_id);
        DacLib.Dac storage dac = _getDac(_id);
        id = dac.id;
        infoCid = dac.infoCid;
        users = new address[](1);
        users[0] = dac.delegate;
        campaignIds = dac.campaignIds;
        donationIds = entity.donationIds;
        budgetDonationIds = entity.budgetDonationIds;
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
            string infoCid,
            address[] users,
            uint256[] dacIds,
            uint256[] milestoneIds,
            uint256[] donationIds,
            uint256[] budgetDonationIds,
            CampaignLib.Status status
        )
    {
        EntityLib.Entity storage entity = _getEntity(_id);
        CampaignLib.Campaign storage campaign = _getCampaign(_id);
        id = campaign.id;
        infoCid = campaign.infoCid;
        users = new address[](2);
        users[0] = campaign.manager;
        users[1] = campaign.reviewer;
        dacIds = campaign.dacIds;
        milestoneIds = campaign.milestoneIds;
        donationIds = entity.donationIds;
        budgetDonationIds = entity.budgetDonationIds;
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
            string infoCid,
            uint256 fiatAmountTarget,
            uint256 campaignId,
            address[] users,
            uint256[] activityIds,
            uint256[] donationIds,
            uint256[] budgetDonationIds,
            MilestoneLib.Status status
        )
    {
        EntityLib.Entity storage entity = _getEntity(_id);
        MilestoneLib.Milestone storage milestone = _getMilestone(_id);
        id = milestone.id;
        infoCid = milestone.infoCid;
        fiatAmountTarget = milestone.fiatAmountTarget;
        users = new address[](4);
        users[0] = milestone.manager;
        users[1] = milestone.reviewer;
        users[2] = milestone.campaignReviewer;
        users[3] = milestone.recipient;
        campaignId = milestone.campaignId;
        activityIds = milestone.activityIds;
        donationIds = entity.donationIds;
        budgetDonationIds = entity.budgetDonationIds;
        status = milestone.status;
    }

    /**
     * @notice Obtiene la Activity cuyo identificador coincide con `_id`.
     * @return Datos de la Activity.
     */
    function getActivity(uint256 _id)
        external
        view
        returns (
            uint256 id,
            string infoCid,
            address user,
            uint256 createdAt,
            uint256 milestoneId
        )
    {
        ActivityLib.Activity storage activity = _getActivity(_id);
        id = activity.id;
        infoCid = activity.infoCid;
        user = activity.user;
        createdAt = activity.createdAt;
        milestoneId = activity.milestoneId;
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
            address giver,
            address token,
            uint256 amount,
            uint256 amountRemainding,
            uint256 createdAt,
            uint256 entityId,
            uint256 budgetEntityId,
            DonationLib.Status status
        )
    {
        DonationLib.Donation storage donation = _getDonation(_id);
        id = donation.id;
        giver = donation.giver;
        token = donation.token;
        amount = donation.amount;
        amountRemainding = donation.amountRemainding;
        createdAt = donation.createdAt;
        entityId = donation.entityId;
        budgetEntityId = donation.budgetEntityId;
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
     * @notice Realiza la transferencia de la donación `_donationId` desde
     *  el presupuesto de la entidad `_entityIdFrom` al presupuesto de la entidad `_entityIdTo`.
     * @dev La donación se transfiere por completo y no fraccionada.
     * @param _entityIdFrom Id de la entidad de la cual la donación forma parte de su presupuesto.
     * @param _entityIdTo Id de la entidad a la cual se transfiere la donación para formar parte de su presupuesto.
     * @param _donationId Id de las donación a transferir de presupuesto.
     */
    function _doTransfer(
        uint256 _entityIdFrom,
        uint256 _entityIdTo,
        uint256 _donationId
    ) internal {
        EntityLib.Entity storage entityFrom = _getEntity(_entityIdFrom);
        EntityLib.Entity storage entityTo = _getEntity(_entityIdTo);
        DonationLib.Donation storage donation = _getDonation(_donationId);
        // La donación debe estar disponible.
        require(
            donation.status == DonationLib.Status.Available,
            ERROR_TRANSFER_DONATION_NOT_AVAILABLE
        );
        // La donación debe pertenecer al presupuesto de la entidad origen.
        require(
            donation.budgetEntityId == _entityIdFrom,
            ERROR_TRANSFER_DONATION_NOT_BELONGS_BUDGET
        );
        // Se quita la donación del presupuesto de la entidad origen.
        ArrayLib.removeElement(entityFrom.budgetDonationIds, _donationId);
        // Se agrega la donación al presupuesto de la entidad destino.
        entityTo.budgetDonationIds.push(_donationId);
        // Se modifica la donación para que pertenezca al presupuesto de la entidad destino.
        donation.budgetEntityId = _entityIdTo;
        emit Transfer(_entityIdFrom, _entityIdTo, _donationId);
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

    function _getActivity(uint256 _id)
        private
        returns (ActivityLib.Activity storage)
    {
        return activityData.getActivity(_id);
    }

    function _getDonation(uint256 _id)
        private
        returns (DonationLib.Donation storage)
    {
        return donationData.getDonation(_id);
    }

}

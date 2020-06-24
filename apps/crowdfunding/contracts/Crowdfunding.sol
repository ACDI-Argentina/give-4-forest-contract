pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "./Constants.sol";
import "./EntityLib.sol";
import "./DacLib.sol";
import "./CampaignLib.sol";
import "./MilestoneLib.sol";

/**
 * @title Crowdfunding
 * @author Mauricio Coronel
 * @notice Contrato encargado de las principales operaciones de manejo de entidades y fondos.
 */
contract Crowdfunding is EtherTokenConstant, AragonApp, Constants {
    EntityLib.Data entityData;
    DacLib.Data dacData;
    CampaignLib.Data campaignData;
    MilestoneLib.Data milestoneData;

    modifier entityExists(uint256 entityId) {
        require(entityData.entities[entityId].id != 0, ERROR_ENTITY_NOT_EXISTS);
        _;
    }

    modifier dacExists(uint256 dacId) {
        require(dacData.dacs[dacId].id != 0, ERROR_DAC_NOT_EXISTS);
        _;
    }

    modifier campaignExists(uint256 campaignId) {
        require(
            campaignData.campaigns[campaignId].id != 0,
            ERROR_CAMPAIGN_NOT_EXISTS
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

    event CreateDac(uint256 id);
    event CreateCampaign(uint256 id);
    event CreateMilestone(uint256 id);
    event Donate(uint256 entityId, address token, uint256 amount);

    /**
     * @notice Crea la DAC `title`. Quien envía la transacción es el delegate de la Dac.
     * @param infoCid Content ID de las información (JSON) de la Dac. IPFS Cid.
     */
    function createDac(string infoCid) external auth(CREATE_DAC_ROLE) {
        uint256 entityId = EntityLib.createEntity(
            entityData,
            EntityLib.EntityType.Dac
        );
        DacLib.createDac(dacData, entityId, infoCid);
        emit CreateDac(entityId);
    }

    /**
     * @notice Crea la Campaign `title`. Quien envía la transacción es el manager de la Campaign.
     * @param infoCid Content ID de las información (JSON) de la Campaign. IPFS Cid.
     * @param dacId Id de la Dac a la cual pertenece la Campaign.
     * @param reviewer address del Campaign Reviewer
     */
    function createCampaign(
        string infoCid,
        uint256 dacId,
        address reviewer
    ) external auth(CREATE_CAMPAIGN_ROLE) dacExists(dacId) {
        uint256 entityId = EntityLib.createEntity(
            entityData,
            EntityLib.EntityType.Campaign
        );
        CampaignLib.createCampaign(
            campaignData,
            entityId,
            infoCid,
            dacId,
            reviewer
        );
        DacLib.associateCampaign(dacData, dacId, entityId);
        emit CreateCampaign(entityId);
    }

    /**
     * @notice Crea el Milestone `title`. Quien envía la transacción es el manager del Milestone.
     * @param infoCid Content ID de las información (JSON) del Milestone. IPFS Cid.
     * @param campaignId Id de la Campaign a la cual pertenece el Milestone.
     * @param maxAmount Monto máximo para financiar el Milestone.
     * @param reviewer address del Milestone Reviewer
     * @param recipient address del Milestone Recipient
     * @param campaignReviewer address del Campaign Reviewer del Milestone
     */
    function createMilestone(
        string infoCid,
        uint256 campaignId,
        uint256 maxAmount,
        address reviewer,
        address recipient,
        address campaignReviewer
    ) external auth(CREATE_MILESTONE_ROLE) campaignExists(campaignId) {
        uint256 entityId = EntityLib.createEntity(
            entityData,
            EntityLib.EntityType.Milestone
        );
        MilestoneLib.createMilestone(
            milestoneData,
            entityId,
            infoCid,
            campaignId,
            maxAmount,
            reviewer,
            recipient,
            campaignReviewer
        );
        CampaignLib.associateMilestone(campaignData, campaignId, entityId);
        emit CreateMilestone(entityId);
    }

    /**
     * @notice Realiza la donación de `_amount` del Token `_token`, destinados a la entidad con Id `_entityId`.
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
            // Asegura que la cantidad de RBTC enviada coincida con el valor
            require(msg.value == _amount, ERROR_RBTC_VALUE_MISMATCH);
            vault.deposit.value(_amount)(ETH, _amount);
        } else {
            vault.deposit(_token, _amount);
        }
        emit Donate(_entityId, _token, _amount);
    }

    /**
     * @notice Obtiene todas las Entities.
     * @dev Dado que no puede retornarse un mapping, las Entities son convertidas primeramente en una lista.
     * @return Lista con todas las Entities.
     */
    function getAllEntities() public view returns (EntityLib.Entity[] memory) {
        return EntityLib.getAll(entityData);
    }

    /**
     * @notice Obtiene todas las DAC.
     * @return Lista con todas las DACs.
     */
    function getAllDacs() public view returns (DacLib.Dac[] memory) {
        return DacLib.getAll(dacData);
    }

    /**
     * @notice Obtiene todas las Campaigns.
     * @return Lista con todas las Campaigns.
     */
    function getAllCampaigns()
        public
        view
        returns (CampaignLib.Campaign[] memory)
    {
        return CampaignLib.getAll(campaignData);
    }

    /**
     * @notice Obtiene todos los Milestones.
     * @return Lista con todos los Milestones.
     */
    function getAllMilestones()
        public
        view
        returns (MilestoneLib.Milestone[] memory)
    {
        return MilestoneLib.getAll(milestoneData);
    }
}

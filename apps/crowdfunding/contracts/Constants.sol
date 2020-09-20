pragma solidity ^0.4.24;

import "@aragon/os/contracts/common/EtherTokenConstant.sol";

/**
 * @title Constantes útiles del contrato Crowdfunding.
 * @author ACDI
 */
contract Constants is EtherTokenConstant {
    // Grupos
    bytes32 public constant GIVER_ROLE = keccak256("GIVER_ROLE");
    bytes32 public constant DELEGATE_ROLE = keccak256("DELEGATE_ROLE");
    bytes32 public constant CAMPAIGN_MANAGER_ROLE = keccak256(
        "CAMPAIGN_MANAGER_ROLE"
    );
    bytes32 public constant CAMPAIGN_REVIEWER_ROLE = keccak256(
        "CAMPAIGN_REVIEWER_ROLE"
    );
    bytes32 public constant MILESTONE_MANAGER_ROLE = keccak256(
        "MILESTONE_MANAGER_ROLE"
    );
    bytes32 public constant MILESTONE_REVIEWER_ROLE = keccak256(
        "MILESTONE_REVIEWER_ROLE"
    );
    bytes32 public constant RECIPIENT_ROLE = keccak256("RECIPIENT_ROLE");

    // Permisos

    bytes32 public constant CREATE_DAC_ROLE = keccak256("CREATE_DAC_ROLE");
    bytes32 public constant CREATE_CAMPAIGN_ROLE = keccak256(
        "CREATE_CAMPAIGN_ROLE"
    );
    bytes32 public constant CREATE_MILESTONE_ROLE = keccak256(
        "CREATE_MILESTONE_ROLE"
    );
    bytes32 public constant EXCHANGE_RATE_ROLE = keccak256(
        "EXCHANGE_RATE_ROLE"
    );
    bytes32 public constant ENABLE_TOKEN_ROLE = keccak256("ENABLE_TOKEN_ROLE");

    // Errores

    string internal constant ERROR_AUTH_FAILED = "CROWDFUNDING_AUTH_FAILED";
    string
        internal constant ERROR_VAULT_NOT_CONTRACT = "CROWDFUNDING_VAULT_NOT_CONTRACT";
    string
        internal constant ERROR_ENTITY_NOT_EXISTS = "CROWDFUNDING_ENTITY_NOT_EXIST";
    string
        internal constant ERROR_DONATE_TOKEN_NOT_ENABLED = "CROWDFUNDING_DONATE_TOKEN_NOT_ENABLED";
    string
        internal constant ERROR_DONATE_AMOUNT_ZERO = "CROWDFUNDING_DONATE_AMOUNT_ZERO";
    string
        internal constant ERROR_ETH_VALUE_MISMATCH = "CROWDFUNDING_ETH_VALUE_MISMATCH";
    string
        internal constant ERROR_TOKEN_TRANSFER_FROM_REVERTED = "CROWDFUNDING_TKN_TRANSFER_FROM_REVERT";
    string
        internal constant ERROR_TOKEN_APPROVE_FAILED = "CROWDFUNDING_TKN_APPROVE_FAILED";
    // Transfer
    string
        internal constant ERROR_TRANSFER_NOT_AUTHORIZED = "CROWDFUNDING_TRANSFER_NOT_AUTHORIZED";
    string
        internal constant ERROR_TRANSFER_INVALID = "CROWDFUNDING_TRANSFER_INVALID";
    string
        internal constant ERROR_TRANSFER_CAMPAIGN_NOT_BELONGS_DAC = "CROWDFUNDING_TRANSFER_CAMPAIGN_NOT_BELONGS_DAC";
    string
        internal constant ERROR_TRANSFER_MILESTONE_NOT_BELONGS_DAC = "CROWDFUNDING_TRANSFER_MILESTONE_NOT_BELONGS_DAC";
    string
        internal constant ERROR_TRANSFER_MILESTONE_NOT_BELONGS_CAMPAIGN = "CROWDFUNDING_TRANSFER_MILESTONE_NOT_BELONGS_CAMPAIGN";
    string
        internal constant ERROR_TRANSFER_DAC_NOT_ACTIVE = "CROWDFUNDING_TRANSFER_DAC_NOT_ACTIVE";
    string
        internal constant ERROR_TRANSFER_CAMPAIGN_NOT_ACTIVE = "CROWDFUNDING_TRANSFER_CAMPAIGN_NOT_ACTIVE";
    string
        internal constant ERROR_TRANSFER_MILESTONE_NOT_ACTIVE = "CROWDFUNDING_TRANSFER_MILESTONE_NOT_ACTIVE";
    string
        internal constant ERROR_TRANSFER_DONATION_NOT_AVAILABLE = "CROWDFUNDING_TRANSFER_DONATION_NOT_AVAILABLE";
    string
        internal constant ERROR_TRANSFER_DONATION_NOT_BELONGS_BUDGET = "CROWDFUNDING_TRANSFER_DONATION_NOT_BELONGS_BUDGET";
    // Withdraw
    string
        internal constant ERROR_WITHDRAW_NOT_APPROVED = "CROWDFUNDING_WITHDRAW_NOT_APPROVED";
    // Milestone Complete
    string
        internal constant ERROR_MILESTONE_COMPLETE_NOT_ACTIVE = "CROWDFUNDING_MILESTONE_COMPLETE_NOT_ACTIVE";
    // Milestone Review
    string
        internal constant ERROR_MILESTONE_REVIEW_NOT_COMPLETED = "CROWDFUNDING_MILESTONE_REVIEW_NOT_COMPLETED";
    // Exchange Rate
    string
        internal constant ERROR_EXCHANGE_RATE_NOT_EXISTS = "CROWDFUNDING_EXCHANGE_RATE_NOT_EXISTS";
}

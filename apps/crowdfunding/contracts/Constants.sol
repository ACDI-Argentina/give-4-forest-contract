pragma solidity ^0.4.24;

/**
 * @title Constantes útiles del contrato Crowdfunding.
 * @author Mauricio Coronel
 */
contract Constants {
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

    address internal constant ETH = address(0);
    string internal constant ERROR_AUTH_FAILED = "CROWDFUNDING_AUTH_FAILED";
    string
        internal constant ERROR_VAULT_NOT_CONTRACT = "CROWDFUNDING_VAULT_NOT_CONTRACT";
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
        internal constant ERROR_TRANSFER_DONATION_NOT_BELONGS_ORIGIN = "CROWDFUNDING_TRANSFER_DONATION_NOT_BELONGS_ORIGIN";
    // Withdraw
    string
        internal constant ERROR_WITHDRAW_NOT_APPROVED = "CROWDFUNDING_WITHDRAW_NOT_APPROVED";
    string
        internal constant ERROR_WITHDRAW_NOT_BUDGETED = "CROWDFUNDING_WITHDRAW_NOT_BUDGETED";
    // Milestone Complete
    string
        internal constant ERROR_MILESTONE_COMPLETE_NOT_ACTIVE = "CROWDFUNDING_MILESTONE_COMPLETE_NOT_ACTIVE";
    // Milestone Approve
    string
        internal constant ERROR_MILESTONE_APPROVE_NOT_COMPLETED = "CROWDFUNDING_MILESTONE_APPROVE_NOT_COMPLETED";
    // Milestone Approve
    string
        internal constant ERROR_MILESTONE_REJECT_NOT_COMPLETED = "CROWDFUNDING_MILESTONE_REJECT_NOT_COMPLETED";
    // Exchange Rate
    string
        internal constant ERROR_EXCHANGE_RATE_NOT_EXISTS = "CROWDFUNDING_EXCHANGE_RATE_NOT_EXISTS";
}

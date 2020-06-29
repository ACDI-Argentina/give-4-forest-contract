pragma solidity ^0.4.24;

import "@aragon/os/contracts/kernel/KernelConstants.sol";

/**
 * @title Constantes útiles del contrato Crowdfunding.
 * @author Mauricio Coronel
 */
contract Constants is KernelNamespaceConstants {
    bytes32 public constant CROWDFUNDING_APP_ID = keccak256("crowdfunding");

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

    string
        internal constant ERROR_VAULT_NOT_CONTRACT = "CROWDFUNDING_VAULT_NOT_CONTRACT";
    string
        internal constant ERROR_ENTITY_NOT_EXISTS = "CROWDFUNDING_ENTITY_NOT_EXIST";
    string
        internal constant ERROR_BUTGET_NOT_EXISTS = "CROWDFUNDING_BUTGET_NOT_EXIST";
    string
        internal constant ERROR_DAC_NOT_EXISTS = "CROWDFUNDING_DAC_NOT_EXIST";
    string
        internal constant ERROR_CAMPAIGN_NOT_EXISTS = "CROWDFUNDING_CAMPAIGN_NOT_EXIST";
    string
        internal constant ERROR_MILESTONE_NOT_EXISTS = "CROWDFUNDING_MILESTONE_NOT_EXIST";
    string
        internal constant ERROR_DONATION_NOT_EXISTS = "CROWDFUNDING_DONATION_NOT_EXIST";
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
    // Withdraw
    string
        internal constant ERROR_WITHDRAW_NOT_AUTHORIZED = "CROWDFUNDING_WITHDRAW_NOT_AUTHORIZED";
    string
        internal constant ERROR_WITHDRAW_NOT_APPROVED = "CROWDFUNDING_WITHDRAW_NOT_APPROVED";
    string
        internal constant ERROR_WITHDRAW_NOT_BUTGETED = "CROWDFUNDING_WITHDRAW_NOT_BUTGETED";
    // Exchange Rate
    string
        internal constant ERROR_EXCHANGE_RATE_NOT_EXISTS = "CROWDFUNDING_EXCHANGE_RATE_NOT_EXISTS";
}

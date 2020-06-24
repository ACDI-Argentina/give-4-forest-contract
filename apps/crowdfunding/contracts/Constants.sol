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

    string
        internal constant ERROR_VAULT_NOT_CONTRACT = "CROWDFUNDING_VAULT_NOT_CONTRACT";
    string
        internal constant ERROR_ENTITY_NOT_EXISTS = "CROWDFUNDING_ENTITY_NOT_EXIST";
    string
        internal constant ERROR_DAC_NOT_EXISTS = "CROWDFUNDING_DAC_NOT_EXIST";
    string
        internal constant ERROR_CAMPAIGN_NOT_EXISTS = "CROWDFUNDING_CAMPAIGN_NOT_EXIST";
    string
        internal constant ERROR_DONATE_AMOUNT_ZERO = "CROWDFUNDING_DONATE_AMOUNT_ZERO";
    string
        internal constant ERROR_RBTC_VALUE_MISMATCH = "CROWDFUNDING_RBTC_VALUE_MISMATCH";
}

const { makeErrorMappingProxy } = require('@aragon/test-helpers/utils')

const errors = makeErrorMappingProxy({
  // aragonOS errors
  APP_AUTH_FAILED: 'Returned error:  APP_AUTH_FAILED',
  INIT_ALREADY_INITIALIZED: 'Returned error:  INIT_ALREADY_INITIALIZED',
  INIT_NOT_INITIALIZED: 'INIT_NOT_INITIALIZED',
  RECOVER_DISALLOWED: 'RECOVER_DISALLOWED',

  // Crowdfunding errors
  CROWDFUNDING_DAC_NOT_EXIST: 'Returned error:  CROWDFUNDING_DAC_NOT_EXIST',
  CROWDFUNDING_CAMPAIGN_NOT_EXIST: 'Returned error:  CROWDFUNDING_CAMPAIGN_NOT_EXIST'
})

module.exports = {
  errors
}

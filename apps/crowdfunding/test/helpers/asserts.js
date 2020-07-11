const assertEntity = (entity, entityExpected) => {
  assert.equal(entity.id, entityExpected.id);
  assert.equal(entity.idIndex, entityExpected.idIndex);
  assert.equal(entity.entityType, entityExpected.entityType);
  assert.equal(entity.budgetIds.length, entityExpected.budgetIdsLength);
}
const assertDac = (dac, dacExpected) => {
  assert.equal(dac.id, dacExpected.id);
  assert.equal(dac.idIndex, dacExpected.idIndex);
  assert.equal(dac.infoCid, dacExpected.infoCid);
  assert.equal(dac.delegate, dacExpected.delegate);
  assert.equal(dac.campaignIds.length, dacExpected.campaignIds.length);
  for (i = 0; i < dac.campaignIds.length; i++) {
    assert.equal(dac.campaignIds[i], dacExpected.campaignIds[i]);
  }
  assert.equal(dac.budgetIds.length, dacExpected.budgetIdsLength);
  assert.equal(dac.status, dacExpected.status);
}

const assertCampaign = (campaign, campaignExpected) => {
  assert.equal(campaign.id, campaignExpected.id);
  assert.equal(campaign.idIndex, campaignExpected.idIndex);
  assert.equal(campaign.infoCid, campaignExpected.infoCid);
  assert.equal(campaign.manager, campaignExpected.manager);
  assert.equal(campaign.reviewer, campaignExpected.reviewer);
  assert.equal(campaign.dacIds.length, campaignExpected.dacIds.length);
  for (i = 0; i < campaign.dacIds.length; i++) {
    assert.equal(campaign.dacIds[i], campaignExpected.dacIds[i]);
  }
  assert.equal(campaign.milestoneIds.length, campaignExpected.milestoneIds.length);
  for (i = 0; i < campaign.milestoneIds.length; i++) {
    assert.equal(campaign.milestoneIds[i], campaignExpected.milestoneIds[i]);
  }
  assert.equal(campaign.budgetIds.length, campaignExpected.budgetIdsLength);
  assert.equal(campaign.status, campaignExpected.status);
}

const assertMilestone = (milestone, milestoneExpected) => {
  assert.equal(milestone.id, milestoneExpected.id);
  assert.equal(milestone.idIndex, milestoneExpected.idIndex);
  assert.equal(milestone.infoCid, milestoneExpected.infoCid);
  assert.equal(milestone.fiatAmountTarget, milestoneExpected.fiatAmountTarget);
  assert.equal(milestone.manager, milestoneExpected.manager);
  assert.equal(milestone.reviewer, milestoneExpected.reviewer);
  assert.equal(milestone.recipient, milestoneExpected.recipient);
  assert.equal(milestone.campaignReviewer, milestoneExpected.campaignReviewer);
  assert.equal(milestone.campaignId, milestoneExpected.campaignId);
  assert.equal(milestone.budgetIds.length, milestoneExpected.budgetIdsLength);
  assert.equal(milestone.status, milestoneExpected.status);
}

const assertDonation = (donation, donationExpected) => {
  assert.equal(donation.id, donationExpected.id);
  assert.equal(donation.idIndex, donationExpected.idIndex);
  assert.equal(donation.giver, donationExpected.giver);
  assert.equal(donation.token, donationExpected.token);
  assert.equal(donation.amount.toString(), donationExpected.amount.toString());
  assert.equal(donation.amountRemainding.toString(), donationExpected.amountRemainding.toString());
  assert.equal(donation.entityId, donationExpected.entityId);
  assert.equal(donation.status, donationExpected.status);
}

const assertBudget = (budget, budgetExpected) => {
  if (budgetExpected.id != undefined) {
    assert.equal(budget.id, budgetExpected.id);
  }
  if (budgetExpected.idIndex != undefined) {
    assert.equal(budget.idIndex, budgetExpected.idIndex);
  }
  assert.equal(budget.entityId, budgetExpected.entityId);
  assert.equal(budget.token, budgetExpected.token);
  assert.equal(budget.amount.toString(), budgetExpected.amount.toString());
  assert.equal(budget.donationIds.length, budgetExpected.donationIds.length);
  for (i = 0; i < budget.donationIds.length; i++) {
    assert.equal(budget.donationIds[i], budgetExpected.donationIds[i]);
  }
  assert.equal(budget.status, budgetExpected.status);
}

module.exports = {
  assertEntity,
  assertDac,
  assertCampaign,
  assertMilestone,
  assertDonation,
  assertBudget
}

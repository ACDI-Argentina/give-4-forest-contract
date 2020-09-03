const assertEntity = (entity, entityExpected) => {
  assert.equal(entity.id, entityExpected.id);
  assert.equal(entity.entityType, entityExpected.entityType);
  assert.equal(entity.budgetIds.length, entityExpected.budgetIdsLength);
}
const assertDac = (dac, dacExpected) => {
  assert.equal(dac.id, dacExpected.id);
  assert.equal(dac.infoCid, dacExpected.infoCid);
  for (let i = 0; i < dacExpected.users.length; i++) {
    assert.equal(dac.users[i], dacExpected.users[i]);
  }
  assert.equal(dac.campaignIds.length, dacExpected.campaignIds.length);
  for (i = 0; i < dac.campaignIds.length; i++) {
    assert.equal(dac.campaignIds[i], dacExpected.campaignIds[i]);
  }
  assert.equal(dac.budgetIds.length, dacExpected.budgetIdsLength);
  assert.equal(dac.status, dacExpected.status);
}

const assertCampaign = (campaign, campaignExpected) => {
  assert.equal(campaign.id, campaignExpected.id);
  assert.equal(campaign.infoCid, campaignExpected.infoCid);
  for (let i = 0; i < campaignExpected.users.length; i++) {
    assert.equal(campaign.users[i], campaignExpected.users[i]);
  }
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
  assert.equal(milestone.infoCid, milestoneExpected.infoCid);
  assert.equal(milestone.fiatAmountTarget, milestoneExpected.fiatAmountTarget);
  for (let i = 0; i < milestoneExpected.users.length; i++) {
    assert.equal(milestone.users[i], milestoneExpected.users[i]);
  }
  assert.equal(milestone.campaignId, milestoneExpected.campaignId);
  assert.equal(milestone.budgetIds.length, milestoneExpected.budgetIdsLength);
  assert.equal(milestone.activityIds.length, milestoneExpected.activityIdsLength);
  assert.equal(milestone.status, milestoneExpected.status);
}

const assertActivity = (activity, activityExpected) => {
  assert.equal(activity.id, activityExpected.id);
  assert.equal(activity.infoCid, activityExpected.infoCid);
  assert.equal(activity.user, activityExpected.user);
  assert.equal(activity.milestoneId, activityExpected.milestoneId);
}

const assertDonation = (donation, donationExpected) => {
  assert.equal(donation.id, donationExpected.id);
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
  assertActivity,
  assertDonation,
  assertBudget
}

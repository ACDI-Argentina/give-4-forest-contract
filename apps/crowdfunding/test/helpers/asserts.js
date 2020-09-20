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
  assert.equal(dac.budgetDonationIds.length, dacExpected.budgetDonationIdsLength);
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
  assert.equal(campaign.budgetDonationIds.length, campaignExpected.budgetDonationIdsLength);
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
  assert.equal(milestone.budgetDonationIds.length, milestoneExpected.budgetDonationIdsLength);
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
  assert.equal(donation.budgetEntityId, donationExpected.budgetEntityId);
  assert.equal(donation.status, donationExpected.status);
}

module.exports = {
  assertDac,
  assertCampaign,
  assertMilestone,
  assertActivity,
  assertDonation
}

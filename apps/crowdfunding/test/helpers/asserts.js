
const assertEntity = (entity, entityExpected) => {
  assert.equal(entity.id, entityExpected.id);
  assert.equal(entity.idIndex, entityExpected.idIndex);
  assert.equal(entity.entityType, entityExpected.entityType);
  assert.equal(entity.butgetIds.length, entityExpected.butgetIdsLength);
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
  assert.equal(milestone.status, milestoneExpected.status);
}

const assertDonation = (donation, donationExpected) => {
  assert.equal(donation.id, donationExpected.id);
  assert.equal(donation.idIndex, donationExpected.idIndex);
  assert.equal(donation.giver, donationExpected.giver);
  assert.equal(donation.token, donationExpected.token);
  assert.equal(donation.amount, donationExpected.amount);
  assert.equal(donation.amountRemainding, donationExpected.amountRemainding);
  assert.equal(donation.entityId, donationExpected.entityId);
  assert.equal(donation.status, donationExpected.status);
}

const assertButget = (butget, butgetExpected) => {
  if(butgetExpected.id != undefined) {
    assert.equal(butget.id, butgetExpected.id);
  }
  if(butgetExpected.idIndex != undefined) {
    assert.equal(butget.idIndex, butgetExpected.idIndex);
  }  
  assert.equal(butget.entityId, butgetExpected.entityId);
  assert.equal(butget.token, butgetExpected.token);
  //assert.equal(butget.amount, butgetExpected.amount);
  assert.equal(butget.amount.toString(), butgetExpected.amount.toString());
  assert.equal(butget.status, butgetExpected.status);
}

module.exports = {
  assertEntity,
  assertDac,
  assertCampaign,
  assertMilestone,
  assertDonation,
  assertButget
}

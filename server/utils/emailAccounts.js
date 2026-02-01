const Settings = require('../models/Settings');

const selectAccount = (accounts, predicate) => {
  if (!accounts || accounts.length === 0) return null;
  if (predicate) {
    const match = accounts.find(predicate);
    if (match) return match;
  }
  return accounts[0] || null;
};

const getEmailAccount = async ({ accountId, purpose } = {}) => {
  const settings = await Settings.findOne({});
  const accounts = settings?.emailAccounts || [];
  if (accounts.length === 0) return null;

  if (accountId) {
    return accounts.find(a => String(a.id) === String(accountId)) || null;
  }

  if (purpose === 'clients') {
    return selectAccount(accounts, a => a.useForClients);
  }

  if (purpose === 'campaigns') {
    return selectAccount(accounts, a => a.useForCampaigns);
  }

  return accounts[0];
};

module.exports = { getEmailAccount };

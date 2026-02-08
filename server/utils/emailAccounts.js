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
    const normalized = String(accountId);
    return (
      accounts.find((a) =>
        [a.id, a._id, a.email]
          .filter(Boolean)
          .map((v) => String(v))
          .includes(normalized)
      ) || null
    );
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

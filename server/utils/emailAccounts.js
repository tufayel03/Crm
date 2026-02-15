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
    const matchedById = accounts.find((a) =>
        [a.id, a._id, a.email]
          .filter(Boolean)
          .map((v) => String(v))
          .includes(normalized)
      );
    if (matchedById) return matchedById;
  }

  if (purpose === 'clients') {
    return selectAccount(accounts, a => a.useForClients);
  }

  if (purpose === 'leads') {
    // Prefer dedicated lead account; fallback to client account if lead routing is not configured.
    return selectAccount(accounts, a => a.useForLeads || a.useForClients);
  }

  if (purpose === 'campaigns') {
    return selectAccount(accounts, a => a.isVerified);
  }

  return accounts[0];
};

module.exports = { getEmailAccount };

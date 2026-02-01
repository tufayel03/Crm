const applyTemplateTokens = (input, data = {}) => {
  if (!input) return input;
  return Object.keys(data).reduce((acc, key) => {
    const value = data[key] === undefined || data[key] === null ? '' : String(data[key]);
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    return acc.replace(pattern, value);
  }, String(input));
};

module.exports = { applyTemplateTokens };

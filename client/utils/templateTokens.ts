type TokenMap = Record<string, string>;

export const applyTemplateTokens = (input: string, data: TokenMap = {}) => {
  if (!input) return input;
  return Object.keys(data).reduce((acc, key) => {
    const value = data[key] === undefined || data[key] === null ? '' : String(data[key]);
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    return acc.replace(pattern, value);
  }, String(input));
};

export const buildCompanyTokens = (general: any): TokenMap => {
  const logoUrl = general?.logoUrl || '';
  const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-width: 150px; height: auto;" />` : '';
  return {
    company_logo: logoHtml,
    company_logo_url: logoUrl,
    company_name: general?.companyName || '',
    company_address: general?.companyAddress || '',
    company_phone: general?.companyPhone || '',
    company_website: general?.companyWebsite || '',
    unsubscribe_link: general?.publicTrackingUrl || general?.companyWebsite || ''
  };
};

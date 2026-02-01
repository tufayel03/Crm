const parseDataUrl = (dataUrl) => {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(dataUrl || '');
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
};

const buildInlineLogo = (general) => {
  const logoUrl = general?.logoUrl || '';
  const parsed = parseDataUrl(logoUrl);
  if (!parsed) {
    return {
      logoHtml: logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-width: 150px; height: auto;" />` : '',
      attachments: []
    };
  }

  const buffer = Buffer.from(parsed.base64, 'base64');
  return {
    logoHtml: '<img src="cid:company_logo" alt="Logo" style="max-width: 150px; height: auto;" />',
    attachments: [{
      filename: 'company_logo',
      content: buffer,
      contentType: parsed.mime,
      cid: 'company_logo'
    }]
  };
};

const injectInlineLogo = (html, general) => {
  const { logoHtml, attachments } = buildInlineLogo(general);
  if (!html) return { html, attachments };

  let nextHtml = String(html);
  if (logoHtml) {
    nextHtml = nextHtml.replace(/{{\s*company_logo\s*}}/g, logoHtml);
  }

  const logoUrl = general?.logoUrl || '';
  if (attachments.length > 0 && logoUrl && nextHtml.includes(logoUrl)) {
    nextHtml = nextHtml.split(logoUrl).join('cid:company_logo');
  }

  return { html: nextHtml, attachments };
};

module.exports = { buildInlineLogo, injectInlineLogo };

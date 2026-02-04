
import { EditorBlock, GlobalStyle, Asset } from './types';
import { useSettingsStore } from '../../stores/settingsStore';

// Helper to replace {{asset_name}} with url and handle company logo
const processVariables = (text: string, assets: Asset[], logoUrl?: string) => {
  let processed = text;
  
  // We need to access store directly here or pass these values down.
  // For compiler.ts which is a pure utility, we should pass values.
  // However, getting values from store here for immediate usage in replacements:
  const settings = useSettingsStore.getState().generalSettings;

  // Replace Company Variables
  if (logoUrl) {
      const logoHtml = `<img src="${logoUrl}" alt="Company Logo" style="max-width: 150px; height: auto; display: inline-block; border: 0;" />`;
      processed = processed.replace(/{{company_logo}}/g, logoHtml);
  } else {
      processed = processed.replace(/{{company_logo}}/g, '');
  }

  processed = processed.replace(/{{company_name}}/g, settings.companyName || '');
  processed = processed.replace(/{{company_address}}/g, settings.companyAddress || '');
  processed = processed.replace(/{{company_phone}}/g, settings.companyPhone || '');
  processed = processed.replace(/{{company_website}}/g, settings.companyWebsite || '');

  // Replace Asset variables
  assets.forEach(asset => {
    const escapedName = asset.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`{{${escapedName}}}`, 'g');
    processed = processed.replace(regex, asset.url);
  });
  return processed;
};

const resolveAssetUrl = (value: string | undefined, assets: Asset[]) => {
  if (!value) return undefined;
  const match = value.match(/^{{\s*([^}]+)\s*}}$/);
  if (!match) return value;
  const name = match[1].trim();
  const asset = assets.find(a => a.name === name);
  return asset?.url || value;
};

export const renderBlockContent = (b: EditorBlock, globalStyle: GlobalStyle, assets: Asset[] = [], logoUrl?: string, blockId?: string): string => {
  const { style, content } = b;
  const padding = style.padding || '0';
  const fontFamily = style.fontFamily || globalStyle.fontFamily;
  const blockClass = blockId ? `ml-block-${blockId}` : '';
  const resolvedBackgroundImage = resolveAssetUrl(style.backgroundImage, assets);
  
  // Background Logic
  let backgroundStyle = `background-color: ${style.backgroundColor || 'transparent'};`;
  
  if (style.backgroundGradient) {
      backgroundStyle = `background: ${style.backgroundGradient};`;
  } else if (resolvedBackgroundImage) {
    backgroundStyle += `background-image: url('${resolvedBackgroundImage}'); background-size: ${style.backgroundSize || 'cover'}; background-position: ${style.backgroundPosition || 'center'}; background-repeat: ${style.backgroundRepeat || 'no-repeat'};`;
  }

  // Text Color Logic (Gradient Support)
  let colorStyle = `color: ${style.color || 'inherit'};`;
  if (style.textGradient) {
      colorStyle = `background: ${style.textGradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: transparent;`;
  }

  const marginParts = [
    style.marginTop,
    style.marginRight,
    style.marginBottom,
    style.marginLeft
  ].every(v => typeof v === 'number')
    ? `margin: ${style.marginTop}px ${style.marginRight}px ${style.marginBottom}px ${style.marginLeft}px;`
    : (style.margin ? `margin: ${style.margin};` : '');

  // Container Style
  let divStyle = `padding: ${padding}; ${backgroundStyle} ${marginParts}`;
  if (style.textAlign) divStyle += `text-align: ${style.textAlign};`;
  if (style.border) divStyle += `border: ${style.border};`;
  if (style.borderRadius !== undefined) divStyle += `border-radius: ${style.borderRadius}px;`;
  if (style.boxShadow) divStyle += `box-shadow: ${style.boxShadow};`;
  // Ensure box-sizing to handle padding correctly within width
  divStyle += `box-sizing: border-box;`;

  switch (b.type) {
    case 'text':
      return `<div class="${blockClass}" style="font-family: ${fontFamily}; ${divStyle} font-size: ${style.fontSize}px; ${colorStyle} line-height: 1.6;">${processVariables(content.text || '', assets, logoUrl)}</div>`;
    
    case 'image':
      const imgWidth = style.width || content.width || '100%';
      const imgHeight = style.height || 'auto';
      return `<div class="${blockClass}" style="${divStyle}">
        <img src="${processVariables(content.url || '', assets, logoUrl)}" alt="${content.alt || ''}" width="${imgWidth.replace('px','').replace('%','')}" style="width: ${imgWidth}; height: ${imgHeight}; max-width: 100%; border: 0; display: inline-block; object-fit: cover;" />
      </div>`;
    
    case 'button':
      // Button sizing logic
      const btnDisplay = style.width ? 'inline-block' : 'inline-block';
      const btnWidthStyle = style.width ? `width: ${style.width};` : '';
      const btnHeightStyle = style.height ? `height: ${style.height}; line-height: ${style.height};` : '';
      const btnPadding = style.height ? '0' : (style.padding || '15px 30px'); 
      
      // Button Background Gradient
      let btnBgStyle = `background-color: ${style.backgroundColor || '#000000'};`;
      if (style.backgroundGradient) {
          btnBgStyle = `background: ${style.backgroundGradient};`;
      }

      return `<div class="${blockClass}" style="padding: ${padding}; text-align: ${style.textAlign};">
        <a href="${processVariables(content.url || '#', assets, logoUrl)}" style="display: ${btnDisplay}; ${btnWidthStyle} ${btnHeightStyle} ${btnBgStyle} ${colorStyle} padding: ${btnPadding}; border-radius: ${style.borderRadius}px; text-decoration: none; font-weight: bold; font-family: ${fontFamily}; text-align: center; box-sizing: border-box;">${content.text}</a>
      </div>`;
    
    case 'spacer':
      return `<div class="${blockClass}" style="height: ${content.height}px; line-height: ${content.height}px; font-size: 0;">&nbsp;</div>`;
    
    case 'divider':
      return `<div class="${blockClass}" style="padding: ${padding};">
        <hr style="border: 0; border-top: 1px solid ${style.color}; margin: 0;" />
      </div>`;

    case 'badge':
      return `<div class="${blockClass}" style="${divStyle} display: inline-block;">
        <span style="display:inline-block; padding: 4px 10px; border-radius: 999px; background: ${style.backgroundColor || '#E2F5EA'}; color: ${style.color || '#166534'}; font-size: ${style.fontSize || 12}px; font-weight: 700; ${style.border ? `border:${style.border};` : ''}">
          ${processVariables(content.badgeText || 'Badge', assets, logoUrl)}
        </span>
      </div>`;

    case 'list':
      const listItems = (content.items || []).map(item => `<li style="margin-bottom: 6px;">${processVariables(item, assets, logoUrl)}</li>`).join('');
      const listTag = content.ordered ? 'ol' : 'ul';
      return `<div class="${blockClass}" style="${divStyle}">
        <${listTag} style="margin: 0; padding-left: 18px; font-family: ${fontFamily}; font-size: ${style.fontSize || 14}px; ${colorStyle}">
          ${listItems}
        </${listTag}>
      </div>`;

    case 'header':
      const logoRaw = processVariables(content.logoUrl || '', assets, logoUrl).trim();
      const logoHtml = logoRaw
        ? (logoRaw.includes('<') ? logoRaw : `<img src="${logoRaw}" alt="Logo" style="max-width:120px;height:auto;border:0;display:inline-block;" />`)
        : '';
      return `<div class="${blockClass}" style="${divStyle} display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:10px;">
          ${logoHtml ? `<div>${logoHtml}</div>` : ''}
          <div>
            <div style="font-size:${style.fontSize || 18}px; font-weight:700; color:${style.color || '#0f172a'};">${processVariables(content.title || '', assets, logoUrl)}</div>
            <div style="font-size:12px; color:#64748b;">${processVariables(content.subtitle || '', assets, logoUrl)}</div>
          </div>
        </div>
      </div>`;

    case 'footer':
      return `<div class="${blockClass}" style="${divStyle} font-size:12px; color:#94a3b8; text-align:center;">
        ${processVariables(content.footerText || '', assets, logoUrl)}
      </div>`;
      
    case 'social':
       // Reuse rendering logic for social icons
       return `<div class="${blockClass}" style="${divStyle}">
         ${renderSocialIcons(b)}
       </div>`;
    
    case 'html':
        return `<div class="${blockClass}" style="${divStyle}">${processVariables(content.html || '', assets, logoUrl)}</div>`;

    case 'div':
      if (style.height) divStyle += `height: ${style.height};`;
      if (style.width) divStyle += `width: ${style.width};`;
      
      return `
        <div class="${blockClass}" style="${divStyle}">
           <!--[if mso]>
           <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:${style.width || '100%'};height:${style.height || 'auto'};">
           <v:fill type="frame" src="${resolvedBackgroundImage || ''}" color="${style.backgroundColor || 'transparent'}" />
           <v:textbox inset="0,0,0,0">
           <![endif]-->
           ${(content.children || []).map(child => renderBlockContent(child, globalStyle, assets, logoUrl, child.id)).join('')}
           <!--[if mso]>
           </v:textbox>
           </v:rect>
           <![endif]-->
        </div>
      `;

    case 'columns':
      if (!content.columns || !content.layout) return '';
      const totalRatio = content.layout.reduce((a, b) => a + b, 0);
      const columnsOuterStyle = `${marginParts}${style.border ? `border: ${style.border};` : ''}${style.borderRadius !== undefined ? `border-radius: ${style.borderRadius}px;` : ''}${style.boxShadow ? `box-shadow: ${style.boxShadow};` : ''} box-sizing: border-box;`;
      
      return `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; table-layout: fixed; ${columnsOuterStyle}">
        <tr>
          <td style="padding: ${padding}; direction: ltr; font-size: 0; text-align: center; vertical-align: top; ${backgroundStyle}">
            <!--[if mso]>
            <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
            <tr>
            <![endif]-->
            ${content.columns.map((colBlocks, index) => {
               const widthPercent = (content.layout![index] / totalRatio) * 100;
               return `
               <!--[if mso]>
               <td valign="top" width="${widthPercent}%">
               <![endif]-->
               <div class="column" style="display: inline-block; width: ${widthPercent}%; vertical-align: top; max-width: 100%;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    ${colBlocks.map(subBlock => `<tr><td style="width: 100%;">${renderBlockContent(subBlock, globalStyle, assets, logoUrl, subBlock.id)}</td></tr>`).join('')}
                  </table>
               </div>
               <!--[if mso]>
               </td>
               <![endif]-->
               `;
            }).join('')}
            <!--[if mso]>
            </tr>
            </table>
            <![endif]-->
          </td>
        </tr>
      </table>
      `;

    default:
      return '';
  }
};

const renderSocialIcons = (block: EditorBlock) => {
    const { socialLinks, iconStyle } = block.content;
    const icons: Record<string, string> = {
      facebook: 'https://cdn-icons-png.flaticon.com/512/733/733547.png',
      instagram: 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png',
      twitter: 'https://cdn-icons-png.flaticon.com/512/733/733579.png',
      linkedin: 'https://cdn-icons-png.flaticon.com/512/3536/3536505.png',
      youtube: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png',
      tiktok: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png',
      website: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png',
      email: 'https://cdn-icons-png.flaticon.com/512/561/561127.png'
    };

    if (!socialLinks || socialLinks.length === 0) return '';
    const iconSize = 32;
    const borderRadius = iconStyle === 'circle' ? '50%' : iconStyle === 'rounded' ? '4px' : '0';

    return `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="display: inline-block;">
        <tr>
          ${socialLinks.map(link => `
            <td style="padding: 0 5px;">
              <a href="${link.url}" target="_blank">
                <img src="${icons[link.network] || icons.website}" alt="${link.network}" width="${iconSize}" style="display: block; border-radius: ${borderRadius}; width: ${iconSize}px;" />
              </a>
            </td>
          `).join('')}
        </tr>
      </table>
    `;
};

export const compileHtml = (blocks: EditorBlock[], globalStyle: GlobalStyle, assets: Asset[] = [], logoUrl?: string): string => {
  const bodyBackground = globalStyle.backgroundGradient || globalStyle.backgroundColor;
  const resolvedBodyBgImage = resolveAssetUrl(globalStyle.backgroundImage, assets);
  const bodyImageStyle = globalStyle.backgroundGradient ? '' : (resolvedBodyBgImage 
    ? `background-image: url('${resolvedBodyBgImage}'); background-repeat: repeat; background-position: top center;` 
    : '');

  const contentBackground = globalStyle.contentBackgroundGradient || globalStyle.contentBackgroundColor;
  const resolvedContentBgImage = resolveAssetUrl(globalStyle.contentBackgroundImage, assets);
  const contentImageStyle = globalStyle.contentBackgroundGradient ? '' : (resolvedContentBgImage
    ? `background-image: url('${resolvedContentBgImage}'); background-repeat: no-repeat; background-position: center; background-size: cover;`
    : '');
  const contentMaxWidth = globalStyle.contentFullWidth ? '100%' : `${globalStyle.contentWidth}px`;

  const buildMobileCss = (list: EditorBlock[]): string => {
    let css = '';
    list.forEach(b => {
      const rules: string[] = [];
      if (b.style.mobilePadding) rules.push(`padding:${b.style.mobilePadding} !important;`);
      if (b.style.mobileMargin) rules.push(`margin:${b.style.mobileMargin} !important;`);
      if (typeof b.style.mobileFontSize === 'number') rules.push(`font-size:${b.style.mobileFontSize}px !important;`);
      if (b.style.mobileTextAlign) rules.push(`text-align:${b.style.mobileTextAlign} !important;`);
      if (b.style.mobileWidth) rules.push(`width:${b.style.mobileWidth} !important;`);
      if (b.style.mobileHeight) rules.push(`height:${b.style.mobileHeight} !important;`);
      if (typeof b.style.mobileBorderRadius === 'number') rules.push(`border-radius:${b.style.mobileBorderRadius}px !important;`);

      if (rules.length > 0) {
        css += `.ml-block-${b.id}{${rules.join('')}}`;
      }

      if (b.type === 'columns' && b.content.columns) {
        b.content.columns.forEach(col => {
          css += buildMobileCss(col);
        });
      }
      if (b.type === 'div' && b.content.children) {
        css += buildMobileCss(b.content.children);
      }
    });
    return css;
  };

  const mobileCss = buildMobileCss(blocks);

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title></title>
<style>
  body { margin: 0; padding: 0; background: ${bodyBackground}; ${bodyImageStyle} font-family: ${globalStyle.fontFamily}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  @media only screen and (max-width: 600px) {
    .content-table { width: 100% !important; }
    .column { display: block !important; width: 100% !important; padding-bottom: 20px; }
    ${mobileCss}
  }
</style>
</head>
<body style="margin: 0; padding: 0; background: ${bodyBackground}; ${bodyImageStyle}">
  <center>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: ${bodyBackground}; ${bodyImageStyle}">
      <tr>
        <td align="center" style="padding: 0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="content-table" style="max-width: ${contentMaxWidth}; background: ${contentBackground}; ${contentImageStyle} border-radius: 0; overflow: hidden;">
            ${blocks.map(b => `<tr><td width="100%">${renderBlockContent(b, globalStyle, assets, logoUrl, b.id)}</td></tr>`).join('')}
          </table>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: ${globalStyle.contentWidth}px;"></table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
};

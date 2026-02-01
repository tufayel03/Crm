
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

export const renderBlockContent = (b: EditorBlock, globalStyle: GlobalStyle, assets: Asset[] = [], logoUrl?: string): string => {
  const { style, content } = b;
  const padding = style.padding || '10px';
  const fontFamily = style.fontFamily || globalStyle.fontFamily;
  
  // Background Logic
  let backgroundStyle = `background-color: ${style.backgroundColor || 'transparent'};`;
  
  if (style.backgroundGradient) {
      backgroundStyle = `background: ${style.backgroundGradient};`;
  } else if (style.backgroundImage) {
    backgroundStyle += `background-image: url('${style.backgroundImage}'); background-size: ${style.backgroundSize || 'cover'}; background-position: ${style.backgroundPosition || 'center'}; background-repeat: ${style.backgroundRepeat || 'no-repeat'};`;
  }

  // Text Color Logic (Gradient Support)
  let colorStyle = `color: ${style.color || 'inherit'};`;
  if (style.textGradient) {
      colorStyle = `background: ${style.textGradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: transparent;`;
  }

  // Container Style
  let divStyle = `padding: ${padding}; ${backgroundStyle}`;
  if (style.textAlign) divStyle += `text-align: ${style.textAlign};`;
  // Ensure box-sizing to handle padding correctly within width
  divStyle += `box-sizing: border-box;`;

  switch (b.type) {
    case 'text':
      return `<div style="font-family: ${fontFamily}; ${divStyle} font-size: ${style.fontSize}px; ${colorStyle} line-height: 1.6;">${processVariables(content.text || '', assets, logoUrl)}</div>`;
    
    case 'image':
      const imgWidth = style.width || content.width || '100%';
      const imgHeight = style.height || 'auto';
      return `<div style="${divStyle}">
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

      return `<div style="padding: ${padding}; text-align: ${style.textAlign};">
        <a href="${processVariables(content.url || '#', assets, logoUrl)}" style="display: ${btnDisplay}; ${btnWidthStyle} ${btnHeightStyle} ${btnBgStyle} ${colorStyle} padding: ${btnPadding}; border-radius: ${style.borderRadius}px; text-decoration: none; font-weight: bold; font-family: ${fontFamily}; text-align: center; box-sizing: border-box;">${content.text}</a>
      </div>`;
    
    case 'spacer':
      return `<div style="height: ${content.height}px; line-height: ${content.height}px; font-size: 0;">&nbsp;</div>`;
    
    case 'divider':
      return `<div style="padding: ${padding};">
        <hr style="border: 0; border-top: 1px solid ${style.color}; margin: 0;" />
      </div>`;
      
    case 'social':
       // Reuse rendering logic for social icons
       return `<div style="${divStyle}">
         ${renderSocialIcons(b)}
       </div>`;
    
    case 'html':
        return `<div style="${divStyle}">${processVariables(content.html || '', assets, logoUrl)}</div>`;

    case 'div':
      if (style.height) divStyle += `height: ${style.height};`;
      if (style.width) divStyle += `width: ${style.width};`;
      
      return `
        <div style="${divStyle}">
           <!--[if mso]>
           <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:${style.width || '100%'};height:${style.height || 'auto'};">
           <v:fill type="frame" src="${style.backgroundImage || ''}" color="${style.backgroundColor || 'transparent'}" />
           <v:textbox inset="0,0,0,0">
           <![endif]-->
           ${(content.children || []).map(child => renderBlockContent(child, globalStyle, assets, logoUrl)).join('')}
           <!--[if mso]>
           </v:textbox>
           </v:rect>
           <![endif]-->
        </div>
      `;

    case 'columns':
      if (!content.columns || !content.layout) return '';
      const totalRatio = content.layout.reduce((a, b) => a + b, 0);
      
      return `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; table-layout: fixed;">
        <tr>
          <td style="padding: ${padding}; direction: ltr; font-size: 0; text-align: center; vertical-align: top;">
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
                    ${colBlocks.map(subBlock => `<tr><td style="width: 100%;">${renderBlockContent(subBlock, globalStyle, assets, logoUrl)}</td></tr>`).join('')}
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
  const bgImageStyle = globalStyle.backgroundImage 
    ? `background-image: url('${globalStyle.backgroundImage}'); background-repeat: repeat; background-position: top center;` 
    : '';

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title></title>
<style>
  body { margin: 0; padding: 0; background-color: ${globalStyle.backgroundColor}; ${bgImageStyle} font-family: ${globalStyle.fontFamily}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  @media only screen and (max-width: 600px) {
    .content-table { width: 100% !important; }
    .column { display: block !important; width: 100% !important; padding-bottom: 20px; }
  }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: ${globalStyle.backgroundColor};">
  <center>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${globalStyle.backgroundColor}; ${bgImageStyle}">
      <tr>
        <td align="center" style="padding: 20px 0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="content-table" style="max-width: ${globalStyle.contentWidth}px; background-color: ${globalStyle.contentBackgroundColor}; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            ${blocks.map(b => `<tr><td width="100%">${renderBlockContent(b, globalStyle, assets, logoUrl)}</td></tr>`).join('')}
          </table>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: ${globalStyle.contentWidth}px;">
              <tr><td align="center" style="padding-top: 20px; color: #94a3b8; font-family: ${globalStyle.fontFamily}; font-size: 12px;">
                  <p>&copy; ${new Date().getFullYear()} Matlance. All rights reserved.</p>
                  <p><a href="#" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a></p>
              </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
};

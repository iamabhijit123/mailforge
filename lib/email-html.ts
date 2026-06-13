export interface EmailBlock {
  id: string
  type: 'header' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'columns' | 'social' | 'footer'
  props: Record<string, unknown>
}

export interface EmailSettings {
  backgroundColor?: string
  contentBackground?: string
  fontFamily?: string
  fontSize?: string
}

export function generateEmailHtml(
  blocks: EmailBlock[],
  settings: EmailSettings = {},
  unsubscribeUrl = '{{unsubscribe_url}}',
  companyInfo = ''
): string {
  const bg = settings.backgroundColor || '#f4f4f4'
  const contentBg = settings.contentBackground || '#ffffff'
  const font = settings.fontFamily || 'Arial, sans-serif'

  const blocksHtml = blocks.map(b => renderBlock(b, font)).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<title>Email</title>
<style>
body{margin:0;padding:0;background-color:${bg};font-family:${font};}
img{border:0;height:auto;line-height:100%;outline:none;text-decoration:none;}
table{border-collapse:collapse !important;}
@media only screen and (max-width:600px){
  .container{width:100% !important;}
  .col{display:block !important;width:100% !important;}
}
</style>
</head>
<body>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${bg};">
<tr><td align="center" style="padding:20px 10px;">
<table class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color:${contentBg};border-radius:4px;overflow:hidden;">
${blocksHtml}
</table>
</td></tr>
</table>
</body>
</html>`
}

function renderBlock(block: EmailBlock, font: string): string {
  switch (block.type) {
    case 'header': return renderHeader(block.props, font)
    case 'text': return renderText(block.props, font)
    case 'image': return renderImage(block.props)
    case 'button': return renderButton(block.props, font)
    case 'divider': return renderDivider(block.props)
    case 'spacer': return renderSpacer(block.props)
    case 'columns': return renderColumns(block.props, font)
    case 'social': return renderSocial(block.props, font)
    case 'footer': return renderFooter(block.props, font)
    default: return ''
  }
}

function renderHeader(props: Record<string, unknown>, font: string): string {
  const bg = (props.backgroundColor as string) || '#2563eb'
  const color = (props.color as string) || '#ffffff'
  const logo = props.logoUrl as string
  const title = (props.title as string) || 'Company Name'
  const align = (props.align as string) || 'center'

  return `<tr><td style="background-color:${bg};padding:24px 30px;text-align:${align};">
${logo ? `<img src="${escHtml(logo)}" alt="${escHtml(title)}" style="max-height:60px;max-width:200px;margin-bottom:${title ? '8px' : '0'};display:block;${align === 'center' ? 'margin-left:auto;margin-right:auto;' : ''}"/>` : ''}
${title && !logo ? `<h1 style="margin:0;color:${color};font-family:${font};font-size:24px;font-weight:700;">${escHtml(title)}</h1>` : ''}
${title && logo ? `<p style="margin:0;color:${color};font-family:${font};font-size:14px;">${escHtml(title)}</p>` : ''}
</td></tr>`
}

function renderText(props: Record<string, unknown>, font: string): string {
  const content = (props.content as string) || '<p>Your text here</p>'
  const padding = (props.padding as string) || '20px 30px'
  const align = (props.align as string) || 'left'
  const fontSize = (props.fontSize as string) || '16px'
  const color = (props.color as string) || '#333333'

  return `<tr><td style="padding:${padding};font-family:${font};font-size:${fontSize};color:${color};text-align:${align};line-height:1.6;">
${content}
</td></tr>`
}

function renderImage(props: Record<string, unknown>): string {
  const src = (props.src as string) || ''
  const alt = (props.alt as string) || ''
  const link = props.link as string
  const align = (props.align as string) || 'center'
  const width = (props.width as string) || '100%'
  const padding = (props.padding as string) || '20px 30px'

  if (!src) return `<tr><td style="padding:${padding};text-align:${align};color:#999;font-style:italic;">[ Image placeholder ]</td></tr>`

  const img = `<img src="${escHtml(src)}" alt="${escHtml(alt)}" width="${width}" style="max-width:100%;display:block;${align === 'center' ? 'margin:0 auto;' : ''}" />`
  return `<tr><td style="padding:${padding};text-align:${align};">${link ? `<a href="${escHtml(link)}">${img}</a>` : img}</td></tr>`
}

function renderButton(props: Record<string, unknown>, font: string): string {
  const text = (props.text as string) || 'Click Here'
  const url = (props.url as string) || '#'
  const bg = (props.backgroundColor as string) || '#2563eb'
  const color = (props.color as string) || '#ffffff'
  const align = (props.align as string) || 'center'
  const padding = (props.padding as string) || '20px 30px'
  const borderRadius = (props.borderRadius as string) || '4px'

  return `<tr><td style="padding:${padding};text-align:${align};">
<a href="${escHtml(url)}" style="background-color:${bg};color:${color};font-family:${font};font-size:16px;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:${borderRadius};display:inline-block;">${escHtml(text)}</a>
</td></tr>`
}

function renderDivider(props: Record<string, unknown>): string {
  const color = (props.color as string) || '#e5e7eb'
  const padding = (props.padding as string) || '10px 30px'
  const thickness = (props.thickness as string) || '1px'

  return `<tr><td style="padding:${padding};">
<hr style="border:none;border-top:${thickness} solid ${color};margin:0;" />
</td></tr>`
}

function renderSpacer(props: Record<string, unknown>): string {
  const height = (props.height as string) || '30px'
  return `<tr><td style="height:${height};line-height:${height};font-size:1px;">&nbsp;</td></tr>`
}

function renderColumns(props: Record<string, unknown>, font: string): string {
  const leftContent = (props.leftContent as string) || '<p>Left column</p>'
  const rightContent = (props.rightContent as string) || '<p>Right column</p>'
  const padding = (props.padding as string) || '20px 30px'
  const gap = (props.gap as string) || '20px'
  const color = (props.color as string) || '#333333'
  const fontSize = (props.fontSize as string) || '16px'

  return `<tr><td style="padding:${padding};">
<table border="0" cellpadding="0" cellspacing="0" width="100%">
<tr>
<td class="col" width="48%" style="vertical-align:top;font-family:${font};font-size:${fontSize};color:${color};line-height:1.6;">${leftContent}</td>
<td class="col" width="4%" style="width:${gap};"> </td>
<td class="col" width="48%" style="vertical-align:top;font-family:${font};font-size:${fontSize};color:${color};line-height:1.6;">${rightContent}</td>
</tr>
</table>
</td></tr>`
}

function renderSocial(props: Record<string, unknown>, font: string): string {
  const links = (props.links as Array<{ platform: string; url: string }>) || []
  const align = (props.align as string) || 'center'
  const padding = (props.padding as string) || '20px 30px'

  const icons: Record<string, string> = {
    facebook: 'FB',
    twitter: 'TW',
    instagram: 'IG',
    linkedin: 'LI',
    youtube: 'YT',
    tiktok: 'TK',
  }

  const linksHtml = links.map(l => `<a href="${escHtml(l.url)}" style="display:inline-block;margin:0 6px;background-color:#e5e7eb;color:#374151;font-family:${font};font-size:12px;font-weight:bold;text-decoration:none;padding:8px 12px;border-radius:4px;">${icons[l.platform.toLowerCase()] || l.platform}</a>`).join('')

  return `<tr><td style="padding:${padding};text-align:${align};">${linksHtml}</td></tr>`
}

function renderFooter(props: Record<string, unknown>, font: string): string {
  const text = (props.text as string) || 'Company Name · 123 Main St, City, ST 12345'
  const unsubscribeText = (props.unsubscribeText as string) || 'Unsubscribe'
  const bg = (props.backgroundColor as string) || '#f9fafb'
  const color = (props.color as string) || '#6b7280'
  const fontSize = (props.fontSize as string) || '12px'

  return `<tr><td style="background-color:${bg};padding:20px 30px;text-align:center;font-family:${font};font-size:${fontSize};color:${color};line-height:1.6;">
<p style="margin:0 0 8px;">${escHtml(text)}</p>
<p style="margin:0;"><a href="{{unsubscribe_url}}" style="color:${color};">${escHtml(unsubscribeText)}</a></p>
</td></tr>`
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function personalizeHtml(html: string, contact: { email: string; first_name?: string | null; last_name?: string | null }, unsubscribeUrl: string): string {
  return html
    .replace(/\{\{first_name\}\}/g, contact.first_name || '')
    .replace(/\{\{last_name\}\}/g, contact.last_name || '')
    .replace(/\{\{email\}\}/g, contact.email)
    .replace(/\{\{full_name\}\}/g, [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email)
    .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl)
}

export const DEFAULT_BLOCKS: EmailBlock[] = [
  {
    id: 'header-1',
    type: 'header',
    props: { title: 'Your Company', backgroundColor: '#2563eb', color: '#ffffff', align: 'center' },
  },
  {
    id: 'text-1',
    type: 'text',
    props: {
      content: '<p>Hello {{first_name}},</p><p>Thank you for being a subscriber! We have exciting news to share with you today.</p>',
      padding: '30px 30px 20px',
      fontSize: '16px',
      color: '#333333',
    },
  },
  {
    id: 'button-1',
    type: 'button',
    props: { text: 'Learn More', url: '#', backgroundColor: '#2563eb', color: '#ffffff', align: 'center', padding: '20px 30px' },
  },
  {
    id: 'footer-1',
    type: 'footer',
    props: { text: 'Your Company · 123 Main St, City, ST 12345', unsubscribeText: 'Unsubscribe', backgroundColor: '#f9fafb', color: '#6b7280' },
  },
]

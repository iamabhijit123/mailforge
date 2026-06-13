import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

// ── Selling points data (ported from email-template-maker) ──
const SELLING_POINTS: Record<string, {
  title: string; cares_about: string[]; selling_points: string[]; headline: string
  subheadline: string; core_message: string; important_notes?: string; eblast_cta?: string
}> = {
  leasing_agent: {
    title: 'Leasing Agent / Leasing Team',
    cares_about: ['More traffic', 'Faster move-ins', 'Easier communication with locators', 'Less time answering repetitive questions', 'Filling difficult floor plans'],
    selling_points: [
      'Reach More Apartment Locators — Connect with housing professionals actively searching for apartments for their clients',
      'Promote Specials Instantly — Share rent specials, concessions, and move-in incentives with thousands of industry professionals',
      'Fill Vacancies Faster — Get your available units in front of locators working with ready-to-move prospects',
      'Showcase Your Community — Highlight your amenities, floor plans, pet policies, and unique features',
      'Generate Qualified Referrals — Receive leads from apartment locators who have already discussed their clients needs',
      'Increase Visibility — Ensure your community is seen by locators actively searching for housing options daily',
      'Highlight Your Screening Criteria — Help locators identify whether their clients may be a fit before they contact your leasing office',
      'Save Time — Provide answers once and make them available to the locator network instead of responding to the same questions repeatedly',
      'Locator Events — Connect with locators through fun, relationship-building events',
    ],
    headline: 'Put Your Community in Front of Apartment Locators & Qualified Renters.',
    subheadline: 'Promote your property, share leasing specials, and connect with housing professionals actively searching for apartments for their clients.',
    core_message: 'Getting more tours, applications, and move-ins',
  },
  property_manager: {
    title: 'Property Manager',
    cares_about: ['Occupancy rates', 'Qualified leads', 'Marketing ROI', 'Vacancy reduction', 'Referral tracking'],
    selling_points: [
      'Fill Vacancies Faster — Get your available units in front of active locators with clients ready to lease',
      'More Qualified Leads — Receive referrals from professionals who have already pre-screened their clients',
      'Reduce Vacant Days — Shorten vacancy periods by reaching a network of locators actively searching for apartments every day',
      'Promote Specials Instantly — Broadcast rent specials, concessions, and limited-time offers directly to the locator community',
      'Increase Exposure — Showcase your property to thousands of locators looking for housing solutions',
      'Real-Time Communication — Respond quickly to locator inquiries and receive targeted prospects that match your property\'s criteria',
      'Locator Events — Host or participate in locator appreciation events to build strong referral relationships',
      'Lead Tracking — Only pay for valid referrals through our integration with Apartment Registration',
      'No Contract — Month-to-month, cancel anytime',
    ],
    eblast_cta: 'Start Your Trial — Send A Locator eBlast: https://forms.monday.com/forms/7ef60e90666eaf943321218a8a832528?r=use1',
    headline: 'More Exposure. More Qualified Leads. More Leases.',
    subheadline: 'Connect your community with apartment locators who are ready to lease.',
    core_message: 'How many additional leases will this generate? More leases, faster move-ins, lower vacancy loss, better exposure, qualified traffic.',
  },
  regional_manager: {
    title: 'Regional Manager',
    cares_about: ['Portfolio-wide occupancy', 'Marketing ROI across properties', 'Centralized marketing management', 'Competitive market intelligence', 'Performance reporting'],
    selling_points: [
      'Increase Portfolio Occupancy — Drive more traffic and leases across multiple communities from a single platform',
      'Maximize Marketing ROI — Reach leasing-ready prospects without increasing advertising spend',
      'Centralized Property Marketing — Manage property information, specials, and availability across your entire portfolio',
      'Competitive Market Intelligence — Monitor market activity, pricing, and concessions to stay competitive',
      'Expand Your Referral Network — Build relationships with apartment locators who can consistently send prospects',
      'Performance Reporting — Track leads, referrals, and leasing activity to measure results and optimize performance',
      'Apartment Registration Included — Get full access to ApartmentRegistration.com to automate lease verifications and track locator referrals',
      'Locator Events — Coordinate locator appreciation events across multiple properties',
      'No Contract — Month-to-month, cancel anytime',
    ],
    eblast_cta: 'Start Your Trial — Send A Locator eBlast: https://forms.monday.com/forms/7ef60e90666eaf943321218a8a832528?r=use1',
    headline: 'The Apartment Industry\'s Network for Occupancy Growth.',
    subheadline: 'Drive leases across your entire portfolio through professional locator referrals.',
    core_message: 'Portfolio-wide vacancy reduction and marketing efficiency',
  },
  realtor_locator: {
    title: 'Apartment Locator',
    cares_about: ['Current, accurate availability', 'Second chance options for clients', 'Professional email tools', 'Time savings', 'Better client service'],
    selling_points: [
      'Rents Updated Daily — Access accurate, up-to-date pricing and availability for your clients every single day',
      'Second Chance Properties — Find apartment communities that work with clients who have credit or rental history challenges',
      'Premium Client Tools — Send customized apartment lists, track when clients view them, and access interactive maps',
      '3rd Party Email for Better Deliverability — Send your client apartment lists through our platform for improved inbox delivery rates',
      'Online Chat with Apartments — Communicate directly with apartment communities in real time',
      'Save Time — Stop calling dozens of properties. Get all the information you need in one place',
      'Free to Join — Access our growing network of apartment communities at no cost',
    ],
    headline: 'The Tool Every Apartment Locator Needs.',
    subheadline: 'Current rents, second chance options, and better email deliverability — all in one place.',
    core_message: 'Awareness only — do NOT mention any paid membership or future fees',
    important_notes: 'DO NOT mention paid membership. Focus on free access and immediate value. Always use "locator" or "Locator" — never "agent", "realtor", or "Realtor".',
  },
}

const COMPANY_INFO = {
  name: 'ApartmentNetwork.com', website: 'ApartmentNetwork.com',
  email: 'info@aptnetwork.com', phone: '1-888-234-2696',
}

const BASE_SYSTEM = `You are a world-class HTML email and flyer designer. You create stunning, professional marketing materials using pure HTML and CSS — no images, no external files, no JavaScript. Everything is achieved through typography, color, layout, spacing, borders, gradients, and Unicode characters.

Company: ${COMPANY_INFO.name} — ApartmentNetwork.com
Website: ${COMPANY_INFO.website}
Email: ${COMPANY_INFO.email}

LANGUAGE RULES — STRICTLY ENFORCED:
- NEVER use the words "agent", "Agent", "realtor", or "Realtor" — always use "locator" or "Locator"
- NEVER use the word "smart" or "smarter"
- Always use "ApartmentNetwork.com" as the brand name

FOOTER RULE: The unsubscribe link text must ALWAYS be exactly: "Opt out of future emails"

DESIGN PHILOSOPHY:
- Dark or rich background colors with gold/teal/white accent text
- Bold all-caps section headers with letter-spacing
- Clean icon-style grids using Unicode symbols (✦ ★ → ✓ ▶)
- Generous padding and whitespace — strong visual hierarchy
- CTA buttons that look clickable and exciting
- Everything works in Outlook, Gmail, Apple Mail — no image downloads needed
- FONTS: Rotate between Arial, Helvetica, Verdana, Georgia, Trebuchet MS, Tahoma

TECHNICAL RULES — UNIVERSAL EMAIL COMPATIBILITY:
- Output ONLY raw HTML — no markdown, no code fences, zero explanations
- Start your response with <!DOCTYPE html>
- DUAL STYLING: put styles in BOTH a <style> block AND as inline style="..." on every element
- Use ONLY <table><tr><td> for ALL layout — never <div> for layout
- NEVER use CSS background-image
- For background colors: use BOTH bgcolor="..." AND style="background-color:..."
- Max width 600px: <table width="600" align="center" style="max-width:600px;width:100%;">
- ALL padding on <td> elements via inline style`

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(session.id) as Record<string, string> | null

  const apiKey = settings?.anthropic_api_key || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Anthropic API key not configured. Add it in Settings → AI Template Maker, or set ANTHROPIC_API_KEY in your .env file.' },
      { status: 400 }
    )
  }

  const body = await req.json()
  const { mode, audience, details, format, content, style, instructions, colors, count = 1 } = body

  const allText = `${details || ''} ${content || ''} ${instructions || ''} ${colors || ''}`.toLowerCase()
  const is4thOfJuly = /4th of july|fourth of july|independence day|july 4|patriotic/i.test(allText)

  const colorInstruction = is4thOfJuly
    ? `COLOR SCHEME: 4th of July theme. Use ONLY red (#B22234), white (#FFFFFF), and blue (#3C3B6E).`
    : colors
    ? `COLOR SCHEME: The user wants: "${colors}". Build the entire design around this palette.`
    : `COLOR SCHEME: Choose a creative, unexpected color palette. Consider deep emerald, rich burgundy, midnight purple, slate blue, forest green, burnt orange, rose gold, charcoal, coral, or teal. Vary each generation.`

  const outputFormat = format || (mode === 'custom' ? 'flyer' : 'email')

  let systemPrompt: string
  let userPrompt: string

  if (mode === 'custom') {
    if (!content) return NextResponse.json({ error: 'No content provided' }, { status: 400 })

    const styleGuides: Record<string, string> = {
      professional: `Dark navy (#0d1f33) background with gold (#d4a017) accents. White body text. Clean grid layout. Bold uppercase section labels.`,
      bold: `Near-black (#111) background with electric gold (#f0b429) or teal (#00bcd4). Huge headline font (48px+). High contrast.`,
      elegant: `Deep charcoal (#1a1a2e) or dark slate (#2c3e50). Rose gold (#c9a96e) or platinum accents. Generous whitespace. Refined serif headlines (Georgia).`,
      fun: `Vibrant background (deep purple to navy). Bright gold or coral accents. Festive Unicode decorations. Energetic, warm, celebratory.`,
    }

    systemPrompt = `${BASE_SYSTEM}

You are transforming raw content into a visually stunning HTML ${outputFormat}.
STYLE: ${style || 'professional'}
${styleGuides[style] || styleGuides.professional}
${colorInstruction}
${outputFormat === 'flyer' ? 'This is a FLYER — make it visually bold and scannable.' : 'This is an EMAIL — max 600px wide, structured sections, mobile-friendly.'}`

    userPrompt = `Create a stunning HTML ${outputFormat} using this content:

${content}

${instructions ? `EXTRA INSTRUCTIONS: ${instructions}\n` : ''}
Include in footer: ApartmentNetwork.com | ${COMPANY_INFO.email}
At the very bottom, add: "You received this email because you are a member of ApartmentNetwork.com. <a href='mailto:${COMPANY_INFO.email}?subject=Unsubscribe' style='color:#999;'>Opt out of future emails</a>"

Output complete HTML only, starting with <!DOCTYPE html>`
  } else {
    if (!audience || !SELLING_POINTS[audience]) {
      return NextResponse.json({ error: 'Invalid audience' }, { status: 400 })
    }
    const audienceData = SELLING_POINTS[audience]

    systemPrompt = `${BASE_SYSTEM}

You are creating a premium outbound marketing ${outputFormat === 'flyer' ? 'flyer' : 'email'} for ApartmentNetwork.com.
${colorInstruction}

DESIGN: Hero/header with rich gradient → bold headline → Unicode icon benefit grid → prominent CTA button → dark footer.
Make it look like it cost $500 to design.`

    userPrompt = `Create a stunning HTML ${outputFormat} targeting: ${audienceData.title}

WHAT THEY CARE ABOUT: ${audienceData.cares_about.join(', ')}
CORE MESSAGE: ${audienceData.core_message}
${audienceData.important_notes ? `⚠️ CRITICAL: ${audienceData.important_notes}` : ''}

HEADLINE: "${audienceData.headline}"
SUBHEADLINE: "${audienceData.subheadline}"

KEY BENEFITS (pick 3-5):
${audienceData.selling_points.map(p => `• ${p}`).join('\n')}

THEME: ${details || 'No theme — make it timeless'}

INCLUDE:
- Website: ${COMPANY_INFO.website}
- Email: ${COMPANY_INFO.email}
${audienceData.eblast_cta ? `- PRIMARY CTA: "${audienceData.eblast_cta}"` : `- PRIMARY CTA: Link to ApartmentNetwork.com`}
- Footer unsubscribe: "Opt out of future emails"

Output complete HTML only, starting with <!DOCTYPE html>`
  }

  const numVariations = Math.min(Math.max(1, parseInt(String(count)) || 1), 5)

  if (numVariations > 1) {
    userPrompt += `

═══════════════════════════════════════
IMPORTANT: Generate exactly ${numVariations} DIFFERENT variations.
Each must have a distinctly different color scheme, layout, and headline wording.
Separate each with exactly: ---VARIATION---

[Variation 1 HTML]
---VARIATION---
[Variation 2 HTML]
${numVariations >= 3 ? '---VARIATION---\n[Variation 3 HTML]' : ''}
${numVariations >= 4 ? '---VARIATION---\n[Variation 4 HTML]' : ''}
${numVariations >= 5 ? '---VARIATION---\n[Variation 5 HTML]' : ''}

Start immediately with <!DOCTYPE html>. No other text.`
  }

  try {
    const client = new Anthropic({ apiKey })
    const maxTokens = numVariations >= 5 ? 25000 : numVariations === 4 ? 20000 : numVariations === 3 ? 16000 : numVariations === 2 ? 10000 : 4096

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    let rawText = ''
    for (const block of message.content) {
      if (block.type === 'text') rawText += block.text
    }

    let variations: string[]
    if (numVariations > 1) {
      variations = rawText
        .split(/---VARIATION---/i)
        .map(p => p.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim())
        .filter(p => p.length > 0)
        .slice(0, numVariations)
      while (variations.length < numVariations) variations.push(variations[0] || '')
    } else {
      const html = rawText.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim()
      variations = [html]
    }

    return NextResponse.json({ variations, usage: message.usage })
  } catch (err) {
    const msg = (err as Error).message || 'Claude API error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

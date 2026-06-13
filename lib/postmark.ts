import * as postmark from 'postmark'
import { LinkTrackingOptions } from 'postmark/dist/client/models/message/SupportingTypes'

export function getPostmarkClient(apiKey: string) {
  return new postmark.ServerClient(apiKey)
}

export interface SendEmailOptions {
  apiKey: string
  from: string
  to: string
  subject: string
  htmlBody: string
  textBody?: string
  replyTo?: string
  messageStream?: string
  trackOpens?: boolean
  metadata?: Record<string, string>
}

export async function sendEmail(opts: SendEmailOptions) {
  const client = getPostmarkClient(opts.apiKey)
  return client.sendEmail({
    From: opts.from,
    To: opts.to,
    Subject: opts.subject,
    HtmlBody: opts.htmlBody,
    TextBody: opts.textBody || stripHtml(opts.htmlBody),
    ReplyTo: opts.replyTo,
    MessageStream: opts.messageStream || 'broadcast',
    TrackOpens: opts.trackOpens !== false,
    TrackLinks: LinkTrackingOptions.HtmlOnly,
    Metadata: opts.metadata,
  })
}

export interface BatchSendMessage {
  From: string
  To: string
  Subject: string
  HtmlBody: string
  TextBody?: string
  ReplyTo?: string
  MessageStream?: string
  TrackOpens?: boolean
  Metadata?: Record<string, string>
}

export async function sendBatch(apiKey: string, messages: BatchSendMessage[]) {
  const client = getPostmarkClient(apiKey)
  const chunks: BatchSendMessage[][] = []
  for (let i = 0; i < messages.length; i += 500) {
    chunks.push(messages.slice(i, i + 500))
  }
  const results = []
  for (const chunk of chunks) {
    const res = await client.sendEmailBatch(
      chunk.map(m => ({
        From: m.From,
        To: m.To,
        Subject: m.Subject,
        HtmlBody: m.HtmlBody,
        TextBody: m.TextBody || stripHtml(m.HtmlBody),
        ReplyTo: m.ReplyTo,
        MessageStream: m.MessageStream || 'broadcast',
        TrackOpens: m.TrackOpens !== false,
        TrackLinks: LinkTrackingOptions.HtmlOnly,
        Metadata: m.Metadata,
      }))
    )
    results.push(...res)
  }
  return results
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

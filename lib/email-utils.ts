export function cleanSubject(subject: string): string {
  return subject
    .replace(/^(Re|Fw|Fwd|RE|FW|FWD|re|fw|fwd):\s*/gi, '')
    .replace(/^\[Fwd:\s*(.*)\]$/i, '$1')
    .trim()
}

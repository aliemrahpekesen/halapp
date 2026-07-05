/**
 * Email provider abstraction. Phase 1 ships a mock that records sent messages
 * (so flows are testable) and logs them; a real SMTP/API provider implements the
 * same interface in Phase 2 without touching callers.
 *
 * IMPORTANT: reset tokens are delivered via this provider and never returned in
 * an API response.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  meta?: Record<string, unknown>;
}

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<void>;
}

export class MockEmailProvider implements EmailProvider {
  readonly name = 'MOCK_EMAIL';
  /** last messages per recipient — used by tests to assert delivery */
  readonly outbox: EmailMessage[] = [];
  async send(msg: EmailMessage): Promise<void> {
    this.outbox.push(msg);
    if (this.outbox.length > 200) this.outbox.shift();
    // eslint-disable-next-line no-console
    console.log(`[email:mock] to=${msg.to} subject=${msg.subject}`);
  }
  lastTo(to: string): EmailMessage | undefined {
    return [...this.outbox].reverse().find((m) => m.to === to);
  }
}

let _provider: EmailProvider = new MockEmailProvider();
export function getEmailProvider(): EmailProvider {
  return _provider;
}
export function setEmailProvider(p: EmailProvider) {
  _provider = p;
}

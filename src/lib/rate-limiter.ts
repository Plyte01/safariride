interface RateLimiterOptions {
  windowMs: number;
  max: number;
}

interface RateLimitResult {
  success: boolean;
  retryAfter?: number;
}

export class RateLimiter {
  private store: Map<string, { count: number; resetTime: number }>;
  private windowMs: number;
  private max: number;

  constructor(options: RateLimiterOptions) {
    this.store = new Map();
    this.windowMs = options.windowMs;
    this.max = options.max;
  }

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record) {
      this.store.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return { success: true };
    }

    if (now > record.resetTime) {
      this.store.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return { success: true };
    }

    if (record.count >= this.max) {
      return {
        success: false,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      };
    }

    record.count += 1;
    this.store.set(key, record);
    return { success: true };
  }

  // Clean up expired records periodically
  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
} 
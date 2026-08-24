interface Bucket {
  count: number;
  windowStartedAt: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly maxHits: number,
    private readonly windowMs: number,
  ) {}

  tryConsume(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now - bucket.windowStartedAt >= this.windowMs) {
      this.buckets.set(key, { count: 1, windowStartedAt: now });
      return true;
    }

    if (bucket.count >= this.maxHits) {
      return false;
    }

    bucket.count += 1;
    return true;
  }
}

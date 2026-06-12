const MAX_ENTRIES = parseInt(process.env.CACHE_MAX_ENTRIES, 10) || 500;

class MemoryCache {
  constructor() {
    this.map = new Map();
    this.generation = 0;
  }

  getGeneration() {
    return this.generation;
  }

  bumpGeneration() {
    this.generation += 1;
    return this.generation;
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs) {
    if (this.map.size >= MAX_ENTRIES) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  deleteByPrefix(prefix) {
    for (const key of this.map.keys()) {
      if (key.startsWith(prefix)) this.map.delete(key);
    }
  }

  clear() {
    this.map.clear();
  }

  publish() {
    return Promise.resolve();
  }
}

class RedisBackedCache extends MemoryCache {
  constructor(redisUrl) {
    super();
    const Redis = require('ioredis');
    this.client = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
    this.genKey = 'cache:generation';
    this.ready = this._initGen();
  }

  async _initGen() {
    const exists = await this.client.exists(this.genKey);
    if (!exists) await this.client.set(this.genKey, '0');
    this.generation = parseInt((await this.client.get(this.genKey)) || '0', 10);
  }

  async _ensureReady() {
    await this.ready;
  }

  getGeneration() {
    return this.generation;
  }

  async bumpGeneration() {
    await this._ensureReady();
    this.generation = await this.client.incr(this.genKey);
    return this.generation;
  }

  async get(key) {
    await this._ensureReady();
    const raw = await this.client.get(`cache:${key}`);
    if (!raw) return null;
    try {
      const entry = JSON.parse(raw);
      if (Date.now() > entry.expiresAt) {
        await this.client.del(`cache:${key}`);
        return null;
      }
      return entry.value;
    } catch {
      return null;
    }
  }

  async set(key, value, ttlMs) {
    await this._ensureReady();
    const entry = { value, expiresAt: Date.now() + ttlMs };
    await this.client.set(`cache:${key}`, JSON.stringify(entry), 'PX', ttlMs);
  }

  async deleteByPrefix(prefix) {
    await this._ensureReady();
    let cursor = '0';
    do {
      const [next, keys] = await this.client.scan(cursor, 'MATCH', `cache:${prefix}*`, 'COUNT', 100);
      cursor = next;
      if (keys.length) await this.client.del(...keys);
    } while (cursor !== '0');
  }

  async clear() {
    await this.deleteByPrefix('');
  }

  async publish(channel, message) {
    await this.client.publish(channel, JSON.stringify(message));
  }
}

let impl = null;

function getImpl() {
  if (!impl) {
    impl = process.env.REDIS_URL ? new RedisBackedCache(process.env.REDIS_URL) : new MemoryCache();
  }
  return impl;
}

function resolve(maybePromise) {
  return Promise.resolve(maybePromise);
}

module.exports = {
  async getGeneration() {
    const i = getImpl();
    if (i.ready) await i.ready;
    return i.getGeneration();
  },
  async bumpGeneration() {
    return resolve(getImpl().bumpGeneration());
  },
  async get(key) {
    return resolve(getImpl().get(key));
  },
  async set(key, value, ttlMs) {
    return resolve(getImpl().set(key, value, ttlMs));
  },
  async deleteByPrefix(prefix) {
    return resolve(getImpl().deleteByPrefix(prefix));
  },
  async clear() {
    return resolve(getImpl().clear());
  },
  async publish(channel, message) {
    return resolve(getImpl().publish(channel, message));
  },
};

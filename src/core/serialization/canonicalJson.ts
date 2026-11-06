export type JsonValue =
  null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/**
 * Serialize JSON-compatible data with recursively sorted object keys.
 * Arrays keep their declared order because palette colour order is meaningful.
 */
export function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Canonical JSON cannot encode a non-finite number.');
    }

    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const record = value as Readonly<Record<string, JsonValue | undefined>>;
    const keys = Object.keys(record).sort();
    const entries = keys.map((key) => {
      const entry = record[key];

      if (entry === undefined) {
        throw new TypeError(`Canonical JSON cannot encode undefined at key "${key}".`);
      }

      return `${JSON.stringify(key)}:${canonicalJson(entry)}`;
    });

    return `{${entries.join(',')}}`;
  }

  throw new TypeError(`Unsupported canonical JSON value type: ${typeof value}.`);
}

/** Property access via Reflect so callers avoid computed-member object-injection patterns. */

export const recordGet = <T extends object, K extends PropertyKey>(
  record: T,
  key: K,
): (K extends keyof T ? T[K] : unknown) | undefined => {
  if (!Object.hasOwn(record, key)) {
    return undefined;
  }
  return Reflect.get(record, key);
};

export const recordSet = <T extends object>(record: T, key: PropertyKey, value: unknown): void => {
  Reflect.set(record, key, value);
};

export const recordDelete = <T extends object>(record: T, key: PropertyKey): void => {
  Reflect.deleteProperty(record, key);
};

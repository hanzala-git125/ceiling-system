type SyncModel = {
  updateOne: (...args: any[]) => Promise<unknown>;
};

function removeMongoMetadata(record: Record<string, any>) {
  const { _id, __v, ...data } = record;
  return data;
}

export async function syncRecords(
  Model: SyncModel,
  rawData: unknown,
  updateExisting = false,
  idPrefix = 'id_'
): Promise<number> {
  const records = Array.isArray(rawData) ? rawData : rawData ? [rawData] : [];
  const recordsById = new Map<string, Record<string, any>>();

  for (const value of records) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const record = removeMongoMetadata(value as Record<string, any>);
    const id = record.id || `${idPrefix}${Math.random().toString(36).slice(2, 11)}`;
    record.id = id;
    recordsById.set(id, record);
  }

  for (const [id, record] of recordsById) {
    const update = updateExisting ? { $set: record } : { $setOnInsert: record };
    await Model.updateOne({ id }, update, { upsert: true, timestamps: updateExisting });
  }

  return recordsById.size;
}
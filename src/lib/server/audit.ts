import { connectDb } from './db';
import { AuditEvent, type AuditType } from './models';

/** Records a security-relevant event. Never throws: auditing must not break the request. */
export async function audit(type: AuditType, ipHash: string, detail?: string): Promise<void> {
  try {
    await connectDb();
    await AuditEvent.create({ type, ipHash, detail: detail?.slice(0, 200) });
  } catch (err) {
    console.error('[audit] failed to record', type, err);
  }
}

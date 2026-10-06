import { audit, type PathEntry } from './audit';
import { readZip } from './zip';
type Request = { entries: PathEntry[]; prefix: number; notes: string[] } | { zip: Blob; prefix: number };
self.onmessage = async (event: MessageEvent<Request>): Promise<void> => {
  try {
    const request = event.data;
    const input = 'zip' in request ? await readZip(request.zip) : request;
    self.postMessage({ report: audit(input.entries, request.prefix, input.notes) });
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'The check could not be completed.' }); }
};

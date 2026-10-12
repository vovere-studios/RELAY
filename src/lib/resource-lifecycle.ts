import { requireSupabase } from './supabase';
export type ResourceKind = 'document' | 'requirement' | 'shared_document';
export async function resourceLifecycle<T = { saved: boolean }>(action: string, organizationId: string, resource: ResourceKind, extra: { id?: string; supplier_id?: string; page?: number; note?: string } = {}, signal?: AbortSignal) {
  const request = requireSupabase().rpc('relay_resource_lifecycle', { action, payload: { organization_id: organizationId, resource, ...extra } });
  const { data, error } = await (signal ? request.abortSignal(signal) : request);
  if (error) throw error;
  return data as T;
}
export function documentStatus(status: string) {
  return status === 'rejected' ? 'Rejected' : status === 'verified' ? 'Reviewed' : 'Awaiting review';
}

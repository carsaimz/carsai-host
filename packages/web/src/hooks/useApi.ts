/**
 * useApi — helpers TanStack Query (v5) para CRUD tipado.
 */
import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import { api, apiRequest, type ApiError } from '@/lib/api';

/** Helper para queries GET tipadas. */
export function useApiQuery<TData = unknown>(
  key: unknown[],
  path: string,
  options?: Omit<UseQueryOptions<TData, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<TData, ApiError>({
    queryKey: key,
    queryFn: () => api.get<TData>(path),
    ...options,
  });
}

/** Helper para mutations POST/PUT/PATCH/DELETE tipados. */
export function useApiMutation<TData = unknown, TBody = unknown>(
  path: string | ((body: TBody) => string),
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  options?: Omit<UseMutationOptions<TData, ApiError, TBody>, 'mutationFn'>,
) {
  const qc = useQueryClient();
  return useMutation<TData, ApiError, TBody>({
    mutationFn: (body: TBody) => {
      const url = typeof path === 'function' ? path(body) : path;
      if (method === 'DELETE') return api.delete<TData>(url);
      return apiRequest<TData>(url, { method, body });
    },
    ...options,
    onSuccess: (...args) => {
      // Invalida tudo por defeito — pode ser afinado por quem usa
      qc.invalidateQueries();
      options?.onSuccess?.(...args);
    },
  });
}

export { useQuery, useMutation, useQueryClient };
export default useApiQuery;

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ACTIVITY_QUERY_KEYS,
  TEMPLATE_QUERY_KEYS,
  TIME_ENTRY_QUERY_KEYS,
} from '../constants';
import {
  loadTasksFromJsonFile,
  persistTasksJsonSnapshot,
  reloadSampleDataFromPublic,
  saveTasksToJsonFile,
} from '../repository/jsonBackup';

async function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ACTIVITY_QUERY_KEYS.all }),
    queryClient.invalidateQueries({ queryKey: TIME_ENTRY_QUERY_KEYS.all }),
    queryClient.invalidateQueries({ queryKey: TEMPLATE_QUERY_KEYS.all }),
  ]);
}

export async function syncTasksJsonSnapshot(): Promise<void> {
  await persistTasksJsonSnapshot();
}

export function useJsonBackup() {
  const queryClient = useQueryClient();

  const saveToFile = useMutation({
    mutationFn: () => saveTasksToJsonFile(),
  });

  const loadFromFile = useMutation({
    mutationFn: (file: File) => loadTasksFromJsonFile(file),
    onSuccess: async () => {
      await invalidateAll(queryClient);
    },
  });

  const loadSamples = useMutation({
    mutationFn: () => reloadSampleDataFromPublic(),
    onSuccess: async () => {
      await invalidateAll(queryClient);
    },
  });

  return { saveToFile, loadFromFile, loadSamples };
}

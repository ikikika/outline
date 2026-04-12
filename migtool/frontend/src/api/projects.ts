import { request } from './client'

export type Project = {
  id: number
  name: string
  note: string | null
  status: string
  source_cms: string | null
  created_at: string
  updated_at: string
  target_count: number
  upload_count: number
  source_file_count: number
  migration?: ProjectMigrationSummary | null
}

export type PhaseMigrationStatus = {
  status: string
  detail: string | null
  run_id: number | null
  run_status: string | null
}

export type ProjectMigrationSummary = {
  target_id: number
  target_name: string
  data_models: PhaseMigrationStatus
  assets: PhaseMigrationStatus
  collections: PhaseMigrationStatus
}

export type DirectusTarget = {
  id: number
  project_id: number
  name: string
  url: string
  is_active: boolean
  summary: string | null
  token_hint: string
  last_test_ok: boolean | null
  last_test_detail: string | null
  last_tested_at: string | null
  created_at: string
}

export type ProjectUpload = {
  id: number
  project_id: number
  original_name: string
  stored_name: string
  size_bytes: number
  content_type: string | null
  status: string
  error_detail: string | null
  extracted_at: string | null
  created_at: string
}

export type ProjectSourceFile = {
  id: number
  project_id: number
  upload_id: number
  relative_path: string
  original_name: string
  kind: string
  size_bytes: number
  created_at: string
}

export type ProjectDetail = Project & {
  targets: DirectusTarget[]
  uploads: ProjectUpload[]
  source_files: ProjectSourceFile[]
}

export type ProjectCreatePayload = {
  name: string
  note?: string | null
  source_cms?: string | null
}

export type DirectusTargetCreatePayload = {
  name: string
  url: string
  token: string
  make_active?: boolean
}

export type PrepareMode = 'directus' | 'map' | 'generate'

export type PrepareAssetsPayload = {
  upload_id: number
  folder_path: string
  mode: PrepareMode
  placeholders?: boolean
  metadata_file_id?: number | null
  /** Directus field → source key or sentinel (__skip__, __generate_uuid__, …) */
  field_map?: Record<string, string> | null
}

export type PrepareAssetsResult = {
  output_path: string
  mode: string
  records: number
  copied: number
  placeholders: number
  skipped: number
  missing: number
  folders: number
  id_map_entries?: number
  id_map_path?: string | null
}

export type PrepareGapRow = {
  id: string
  name: string
  path: string
  missing: boolean
  source?: string | null
}

export type PrepareGapsResult = {
  records: number
  on_disk: number
  missing: number
  rows: PrepareGapRow[]
}

export type MetadataKeyRow = {
  key: string
  type: string
}

export type DirectusFileFieldRow = {
  key: string
  type: string
  required: string
  specials: { value: string; label: string }[]
}

export type MetadataKeysResult = {
  records: number
  keys: MetadataKeyRow[]
  directus_fields: DirectusFileFieldRow[]
  suggested_map: Record<string, string>
}

export type PrepareSchemaPayload = {
  upload_id: number
  folder_path: string
  dry_run?: boolean
}

export type SchemaFileRow = {
  name: string
  role: string
  detail: string
  status: string
}

export type PrepareSchemaResult = {
  compatible: boolean
  json_files: number
  schema_folder: string | null
  collections: number
  fields: number
  relations: number
  schema_files: SchemaFileRow[]
  deferred_files: SchemaFileRow[]
  source_label: string
  output_path: string | null
  copied_files: string[]
  copied: number
}

export type PrepareDataPayload = {
  upload_id: number
  folder_path: string
  dry_run?: boolean
}

export type DataFileRow = {
  name: string
  role: string
  detail: string
  status: string
  rows: number
}

export type PrepareDataResult = {
  compatible: boolean
  json_files: number
  data_folder: string | null
  collections: number
  rows: number
  data_files: DataFileRow[]
  deferred_files: DataFileRow[]
  source_label: string
  output_path: string | null
  copied_files: string[]
  copied: number
}

export type PreparedStatus = {
  path: string
  exists: boolean
  has_schema: boolean
  has_data: boolean
  has_files: boolean
  has_flows: boolean
  schema_files: number
  data_files: number
  data_file_names: string[]
  collections: number
  rows: number
  asset_files?: number
}

export type MigrationStartPayload = {
  schema?: boolean
  data?: boolean
  files?: boolean
  flows?: boolean
  /** start = scratch; resume = skip ok files, retry-upsert failed; restart = all */
  mode?: 'start' | 'resume' | 'restart'
}

export type MigrationProgress = {
  phase?: string
  total?: number
  processed?: number
  uploaded?: number
  failed?: number
  skipped?: number
  placeholders?: number
  folders_created?: number
  folders_failed?: number
  completed_files?: string[]
  /** Data JSON files that finished with row failures (retry-upsert targets). */
  failed_files?: string[]
  current_file?: string | null
  current_collection?: string | null
  current_items_done?: number
  current_items_total?: number
  current_file_id?: string | null
  mode?: string
  updated_at?: string
}

export type MigrationRun = {
  id: number
  project_id: number
  target_id: number
  status: string
  phases: string
  error_detail: string | null
  summary: Record<string, unknown> | null
  progress: MigrationProgress | null
  /** Captured stdout/stderr from the import process. */
  log: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export function listProjects(): Promise<Project[]> {
  return request<Project[]>('/projects')
}

export function createProject(
  payload: ProjectCreatePayload,
): Promise<ProjectDetail> {
  return request<ProjectDetail>('/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getProject(projectId: number): Promise<ProjectDetail> {
  return request<ProjectDetail>(`/projects/${projectId}`)
}

export function createTarget(
  projectId: number,
  payload: DirectusTargetCreatePayload,
): Promise<DirectusTarget> {
  return request<DirectusTarget>(`/projects/${projectId}/targets`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function uploadProjectFiles(
  projectId: number,
  files: File[],
): Promise<ProjectUpload[]> {
  const body = new FormData()
  for (const file of files) {
    body.append('files', file)
  }
  return request<ProjectUpload[]>(`/projects/${projectId}/uploads`, {
    method: 'POST',
    body,
  })
}

export function reextractUpload(
  projectId: number,
  uploadId: number,
): Promise<ProjectUpload> {
  return request<ProjectUpload>(
    `/projects/${projectId}/uploads/${uploadId}/extract`,
    { method: 'POST' },
  )
}

export function deleteUpload(
  projectId: number,
  uploadId: number,
): Promise<void> {
  return request<void>(`/projects/${projectId}/uploads/${uploadId}`, {
    method: 'DELETE',
  })
}

export function activateTarget(
  projectId: number,
  targetId: number,
): Promise<DirectusTarget> {
  return request<DirectusTarget>(
    `/projects/${projectId}/targets/${targetId}/activate`,
    { method: 'POST' },
  )
}

export function deleteTarget(
  projectId: number,
  targetId: number,
): Promise<void> {
  return request<void>(`/projects/${projectId}/targets/${targetId}`, {
    method: 'DELETE',
  })
}

export function testTarget(
  projectId: number,
  targetId: number,
): Promise<DirectusTarget> {
  return request<DirectusTarget>(
    `/projects/${projectId}/targets/${targetId}/test`,
    { method: 'POST' },
  )
}

export function prepareTargetAssets(
  projectId: number,
  targetId: number,
  payload: PrepareAssetsPayload,
): Promise<PrepareAssetsResult> {
  return request<PrepareAssetsResult>(
    `/projects/${projectId}/targets/${targetId}/prepare`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export function previewPrepareGaps(
  projectId: number,
  targetId: number,
  payload: PrepareAssetsPayload,
): Promise<PrepareGapsResult> {
  return request<PrepareGapsResult>(
    `/projects/${projectId}/targets/${targetId}/prepare-gaps`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export function getMetadataKeys(
  projectId: number,
  fileId: number,
): Promise<MetadataKeysResult> {
  return request<MetadataKeysResult>(
    `/projects/${projectId}/source-files/${fileId}/metadata-keys`,
  )
}

export function prepareTargetSchema(
  projectId: number,
  targetId: number,
  payload: PrepareSchemaPayload,
): Promise<PrepareSchemaResult> {
  return request<PrepareSchemaResult>(
    `/projects/${projectId}/targets/${targetId}/prepare-schema`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export function prepareTargetData(
  projectId: number,
  targetId: number,
  payload: PrepareDataPayload,
): Promise<PrepareDataResult> {
  return request<PrepareDataResult>(
    `/projects/${projectId}/targets/${targetId}/prepare-data`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export function getPreparedStatus(
  projectId: number,
  targetId: number,
): Promise<PreparedStatus> {
  return request<PreparedStatus>(
    `/projects/${projectId}/targets/${targetId}/prepared`,
  )
}

export function startMigrate(
  projectId: number,
  targetId: number,
  payload?: MigrationStartPayload,
): Promise<MigrationRun> {
  return request<MigrationRun>(
    `/projects/${projectId}/targets/${targetId}/migrate`,
    {
      method: 'POST',
      body: JSON.stringify(
        payload ?? { schema: true, data: true, files: true, flows: true },
      ),
    },
  )
}

export function getLatestMigrate(
  projectId: number,
  targetId: number,
): Promise<MigrationRun | null> {
  return request<MigrationRun | null>(
    `/projects/${projectId}/targets/${targetId}/migrate`,
  )
}

export function getMigrateRun(
  projectId: number,
  targetId: number,
  runId: number,
): Promise<MigrationRun> {
  return request<MigrationRun>(
    `/projects/${projectId}/targets/${targetId}/migrate/${runId}`,
  )
}

export function stopMigrate(
  projectId: number,
  targetId: number,
  runId: number,
): Promise<MigrationRun> {
  return request<MigrationRun>(
    `/projects/${projectId}/targets/${targetId}/migrate/${runId}/stop`,
    { method: 'POST' },
  )
}

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

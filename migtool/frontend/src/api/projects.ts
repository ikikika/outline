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

export type ProjectDetail = Project & {
  targets: DirectusTarget[]
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

export function activateTarget(
  projectId: number,
  targetId: number,
): Promise<DirectusTarget> {
  return request<DirectusTarget>(
    `/projects/${projectId}/targets/${targetId}/activate`,
    { method: 'POST' },
  )
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

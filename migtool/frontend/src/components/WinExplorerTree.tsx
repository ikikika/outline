import { useEffect, useMemo, useState } from 'react'
import type { ProjectSourceFile, ProjectUpload } from '../api/projects'

type TreeFile = {
  type: 'file'
  name: string
  path: string
  file: ProjectSourceFile
}

type TreeFolder = {
  type: 'folder'
  name: string
  path: string
  children: TreeNode[]
}

type TreeNode = TreeFolder | TreeFile

type Pack = {
  uploadId: number
  name: string
  rootPath: string
  tree: TreeNode[]
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}

function ensureFolder(
  map: Map<string, TreeFolder>,
  parentChildren: TreeNode[],
  path: string,
  name: string,
): TreeFolder {
  const existing = map.get(path)
  if (existing) return existing
  const folder: TreeFolder = { type: 'folder', name, path, children: [] }
  map.set(path, folder)
  parentChildren.push(folder)
  return folder
}

function buildTreeForUpload(files: ProjectSourceFile[]): TreeNode[] {
  const root: TreeNode[] = []
  const folders = new Map<string, TreeFolder>()

  for (const file of files) {
    const parts = file.relative_path.split('/').filter(Boolean)
    if (parts.length === 0) continue

    let parentChildren = root
    let pathSoFar = ''

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part
      const folder = ensureFolder(folders, parentChildren, pathSoFar, part)
      parentChildren = folder.children
    }

    const name = parts[parts.length - 1]
    const path = pathSoFar ? `${pathSoFar}/${name}` : name
    parentChildren.push({ type: 'file', name, path, file })
  }

  const sortRecursive = (nodes: TreeNode[]): TreeNode[] =>
    sortNodes(
      nodes.map((node) =>
        node.type === 'folder'
          ? { ...node, children: sortRecursive(node.children) }
          : node,
      ),
    )

  return sortRecursive(root)
}

function namespaceTree(nodes: TreeNode[], packRoot: string): TreeNode[] {
  return nodes.map((node) => {
    if (node.type === 'file') {
      return { ...node, path: `${packRoot}/${node.path}` }
    }
    return {
      ...node,
      path: `${packRoot}/${node.path}`,
      children: namespaceTree(node.children, packRoot),
    }
  })
}

function displayPath(path: string, packs: Pack[]): string {
  const pack = packs.find((p) => path === p.rootPath || path.startsWith(`${p.rootPath}/`))
  if (!pack) return path.replace(/\//g, '\\')
  const rest = path === pack.rootPath ? '' : path.slice(pack.rootPath.length + 1)
  const parts = ['extracted', pack.name, ...(rest ? rest.split('/') : [])]
  return parts.join('\\')
}

function WinNodes({
  nodes,
  openPaths,
  selectedPath,
  onToggle,
  onSelect,
}: {
  nodes: TreeNode[]
  openPaths: Set<string>
  selectedPath: string | null
  onToggle: (path: string) => void
  onSelect: (node: TreeNode) => void
}) {
  return (
    <ul className="win-children">
      {nodes.map((node, index) => {
        const isLast = index === nodes.length - 1
        if (node.type === 'folder') {
          const open = openPaths.has(node.path)
          const selected = selectedPath === node.path
          return (
            <li
              key={`d:${node.path}`}
              className={`win-node${open ? ' open' : ''}${isLast ? ' last' : ''}`}
            >
              <div
                className={`win-row${selected ? ' selected' : ''}`}
                onClick={() => onSelect(node)}
              >
                <button
                  type="button"
                  className="win-twist"
                  aria-label={open ? 'Collapse' : 'Expand'}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggle(node.path)
                  }}
                />
                <span
                  className={`win-ico win-ico-folder${open ? ' open' : ''}`}
                  aria-hidden="true"
                />
                <button type="button" className="win-label">
                  <b>{node.name}</b>
                </button>
              </div>
              {open ? (
                <WinNodes
                  nodes={node.children}
                  openPaths={openPaths}
                  selectedPath={selectedPath}
                  onToggle={onToggle}
                  onSelect={onSelect}
                />
              ) : null}
            </li>
          )
        }

        const selected = selectedPath === node.path
        return (
          <li
            key={`f:${node.file.id}`}
            className={`win-node${isLast ? ' last' : ''}`}
          >
            <div
              className={`win-row${selected ? ' selected' : ''}`}
              onClick={() => onSelect(node)}
            >
              <span className="win-twist spacer" />
              <span className="win-ico win-ico-file" aria-hidden="true" />
              <button type="button" className="win-label">
                <b>{node.name}</b>
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export type ExplorerSelection = {
  path: string
  kind: 'folder' | 'file'
  name: string
  file?: ProjectSourceFile
}

type WinExplorerTreeProps = {
  files: ProjectSourceFile[]
  uploads: ProjectUpload[]
  selectedPath: string | null
  onSelect: (selection: ExplorerSelection) => void
}

export function WinExplorerTree({
  files,
  uploads,
  selectedPath,
  onSelect,
}: WinExplorerTreeProps) {
  const packs: Pack[] = useMemo(() => {
    const byUpload = new Map<number, ProjectSourceFile[]>()
    for (const file of files) {
      const list = byUpload.get(file.upload_id) ?? []
      list.push(file)
      byUpload.set(file.upload_id, list)
    }

    const uploadName = new Map(uploads.map((u) => [u.id, u.original_name]))

    return [...byUpload.entries()]
      .map(([uploadId, packFiles]) => {
        const rootPath = `upload:${uploadId}`
        return {
          uploadId,
          name: uploadName.get(uploadId) ?? `upload_${uploadId}`,
          rootPath,
          tree: namespaceTree(buildTreeForUpload(packFiles), rootPath),
        }
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      )
  }, [files, uploads])

  const [openPaths, setOpenPaths] = useState<Set<string>>(new Set())
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (packs.length === 0) return
    if (!initialized) {
      setOpenPaths(new Set(packs.map((p) => p.rootPath)))
      setInitialized(true)
    }
  }, [packs, initialized])

  const barPath = selectedPath
    ? displayPath(selectedPath, packs)
    : packs[0]
      ? displayPath(packs[0].rootPath, packs)
      : 'extracted'

  function toggle(path: string) {
    setOpenPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function handleSelect(node: TreeNode) {
    onSelect({
      path: node.path,
      kind: node.type,
      name: node.name,
      file: node.type === 'file' ? node.file : undefined,
    })
  }

  if (packs.length === 0) {
    return (
      <div className="win-explorer">
        <div className="win-explorer-bar">
          <span className="win-explorer-label">This PC</span>
          <span className="mono win-explorer-path">extracted</span>
        </div>
        <div className="meta" style={{ padding: 14 }}>
          No extracted files yet. Upload a pack on Source files first.
        </div>
      </div>
    )
  }

  return (
    <div className="win-explorer">
      <div className="win-explorer-bar">
        <span className="win-explorer-label">This PC</span>
        <span className="mono win-explorer-path">{barPath}</span>
      </div>
      <ul className="win-tree">
        {packs.map((pack) => {
          const open = openPaths.has(pack.rootPath)
          const selected = selectedPath === pack.rootPath
          return (
            <li
              key={pack.uploadId}
              className={`win-node${open ? ' open' : ''}`}
            >
              <div
                className={`win-row${selected ? ' selected' : ''}`}
                onClick={() =>
                  onSelect({
                    path: pack.rootPath,
                    kind: 'folder',
                    name: pack.name,
                  })
                }
              >
                <button
                  type="button"
                  className="win-twist"
                  aria-label={open ? 'Collapse' : 'Expand'}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(pack.rootPath)
                  }}
                />
                <span
                  className={`win-ico win-ico-folder${open ? ' open' : ''}`}
                  aria-hidden="true"
                />
                <button type="button" className="win-label">
                  <b>{pack.name}</b>
                </button>
              </div>
              {open ? (
                <WinNodes
                  nodes={pack.tree}
                  openPaths={openPaths}
                  selectedPath={selectedPath}
                  onToggle={toggle}
                  onSelect={handleSelect}
                />
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function folderDisplayPath(
  path: string,
  uploads: ProjectUpload[],
): string {
  const upload = uploads.find((u) => path === `upload:${u.id}` || path.startsWith(`upload:${u.id}/`))
  if (!upload) return path
  const rest =
    path === `upload:${upload.id}`
      ? ''
      : path.slice(`upload:${upload.id}/`.length)
  const parts = ['extracted', upload.original_name, ...(rest ? rest.split('/') : [])]
  return parts.join('/')
}

export function filesInFolder(
  folderPath: string,
  files: ProjectSourceFile[],
): ProjectSourceFile[] {
  const prefix = folderPath.startsWith('upload:')
    ? folderPath.replace(/^upload:\d+\/?/, '')
    : folderPath
  const uploadMatch = folderPath.match(/^upload:(\d+)/)
  const uploadId = uploadMatch ? Number(uploadMatch[1]) : null

  return files.filter((f) => {
    if (uploadId != null && f.upload_id !== uploadId) return false
    if (!prefix) return true
    return (
      f.relative_path === prefix ||
      f.relative_path.startsWith(`${prefix}/`)
    )
  })
}

export function jsonOptionsNearFolder(
  folderPath: string,
  files: ProjectSourceFile[],
): ProjectSourceFile[] {
  const inFolder = filesInFolder(folderPath, files)
  const json = inFolder.filter(
    (f) =>
      f.kind === 'json' ||
      f.kind === 'ndjson' ||
      /\.json$/i.test(f.original_name),
  )
  if (json.length > 0) return json

  // Also surface JSON siblings one level up (export root).
  const parent = folderPath.includes('/')
    ? folderPath.slice(0, folderPath.lastIndexOf('/'))
    : folderPath
  return filesInFolder(parent, files).filter(
    (f) =>
      f.kind === 'json' ||
      f.kind === 'ndjson' ||
      /\.json$/i.test(f.original_name),
  )
}

export function guessMetaMode(name: string): 'directus' | 'map' | 'generate' {
  const lower = name.toLowerCase()
  if (lower.includes('files_metadata')) return 'directus'
  if (lower.endsWith('.json') || lower.endsWith('.ndjson')) return 'map'
  return 'generate'
}

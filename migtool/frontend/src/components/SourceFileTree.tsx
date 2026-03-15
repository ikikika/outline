import { useEffect, useMemo, useState } from 'react'
import type { ProjectSourceFile, ProjectUpload } from '../api/projects'

type TreeFile = {
  type: 'file'
  name: string
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
  fileCount: number
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function kindBadge(kind: string): string {
  if (kind === 'json' || kind === 'ndjson') return 'badge badge-map'
  if (kind === 'media') return 'badge badge-ok'
  return 'badge badge-draft'
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

    parentChildren.push({
      type: 'file',
      name: parts[parts.length - 1],
      file,
    })
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
    if (node.type === 'file') return node
    return {
      ...node,
      path: `${packRoot}/${node.path}`,
      children: namespaceTree(node.children, packRoot),
    }
  })
}

function collectFolderPaths(nodes: TreeNode[], into: Set<string>) {
  for (const node of nodes) {
    if (node.type === 'folder') {
      into.add(node.path)
      collectFolderPaths(node.children, into)
    }
  }
}

function countFiles(node: TreeFolder): number {
  let n = 0
  for (const child of node.children) {
    if (child.type === 'file') n += 1
    else n += countFiles(child)
  }
  return n
}

function FolderGlyph({ open }: { open: boolean }) {
  return (
    <svg
      className="tree-glyph"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      {open ? (
        <path
          d="M2.5 6.5h5.2l1.3 1.5H17.5v7.2a1.3 1.3 0 0 1-1.3 1.3H3.8a1.3 1.3 0 0 1-1.3-1.3V6.5Z"
          fill="currentColor"
          opacity="0.9"
        />
      ) : (
        <path
          d="M2.5 5.8A1.3 1.3 0 0 1 3.8 4.5h4.1l1.4 1.5h7.2A1.3 1.3 0 0 1 17.8 7.3v7.4a1.3 1.3 0 0 1-1.3 1.3H3.8a1.3 1.3 0 0 1-1.3-1.3V5.8Z"
          fill="currentColor"
          opacity="0.85"
        />
      )}
    </svg>
  )
}

function FileGlyph() {
  return (
    <svg
      className="tree-glyph tree-glyph-file"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5.5 2.5h6.2L15.5 6.3V16.2A1.3 1.3 0 0 1 14.2 17.5H5.5A1.3 1.3 0 0 1 4.2 16.2V3.8A1.3 1.3 0 0 1 5.5 2.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M11.5 2.6V6.5H15.3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`tree-chevron${open ? ' open' : ''}`}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 4.5 9.5 8 6 11.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TreeNodes({
  nodes,
  depth,
  openPaths,
  onToggle,
}: {
  nodes: TreeNode[]
  depth: number
  openPaths: Set<string>
  onToggle: (path: string) => void
}) {
  return (
    <ul className="tree-list" role={depth === 0 ? 'tree' : 'group'}>
      {nodes.map((node) => {
        if (node.type === 'folder') {
          const open = openPaths.has(node.path)
          const fileCount = countFiles(node)
          return (
            <li key={`d:${node.path}`} role="treeitem" aria-expanded={open}>
              <button
                type="button"
                className="tree-row tree-folder"
                style={{ paddingLeft: 10 + depth * 18 }}
                onClick={() => onToggle(node.path)}
              >
                <Chevron open={open} />
                <FolderGlyph open={open} />
                <span className="tree-name">{node.name}</span>
                <span className="tree-meta">
                  {fileCount} item{fileCount === 1 ? '' : 's'}
                </span>
              </button>
              {open ? (
                <TreeNodes
                  nodes={node.children}
                  depth={depth + 1}
                  openPaths={openPaths}
                  onToggle={onToggle}
                />
              ) : null}
            </li>
          )
        }

        return (
          <li key={`f:${node.file.id}`} role="treeitem">
            <div
              className="tree-row tree-file"
              style={{ paddingLeft: 10 + depth * 18 + 22 }}
            >
              <FileGlyph />
              <span className="tree-name" title={node.file.relative_path}>
                {node.name}
              </span>
              <span className={kindBadge(node.file.kind)}>{node.file.kind}</span>
              <span className="tree-meta">
                {formatSize(node.file.size_bytes)}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

type SourceFileTreeProps = {
  files: ProjectSourceFile[]
  uploads: ProjectUpload[]
}

export function SourceFileTree({ files, uploads }: SourceFileTreeProps) {
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
          fileCount: packFiles.length,
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
      return
    }
    setOpenPaths((prev) => {
      const next = new Set(prev)
      let changed = false
      for (const pack of packs) {
        if (!next.has(pack.rootPath)) {
          next.add(pack.rootPath)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [packs, initialized])

  function toggle(path: string) {
    setOpenPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function expandAll() {
    const all = new Set<string>()
    for (const pack of packs) {
      all.add(pack.rootPath)
      collectFolderPaths(pack.tree, all)
    }
    setOpenPaths(all)
  }

  function collapseAll() {
    setOpenPaths(new Set())
  }

  if (packs.length === 0) return null

  return (
    <div className="folder-tree">
      <div className="folder-tree-toolbar">
        <span className="meta mono">Extracted</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-sm btn-ghost" type="button" onClick={expandAll}>
            Expand all
          </button>
          <button
            className="btn btn-sm btn-ghost"
            type="button"
            onClick={collapseAll}
          >
            Collapse all
          </button>
        </div>
      </div>

      <div className="folder-tree-pane">
        {packs.map((pack) => {
          const open = openPaths.has(pack.rootPath)
          return (
            <div key={pack.uploadId} className="tree-pack">
              <button
                type="button"
                className="tree-row tree-folder tree-pack-root"
                onClick={() => toggle(pack.rootPath)}
              >
                <Chevron open={open} />
                <FolderGlyph open={open} />
                <span className="tree-name">{pack.name}</span>
                <span className="tree-meta">
                  {pack.fileCount} file{pack.fileCount === 1 ? '' : 's'}
                </span>
              </button>
              {open ? (
                <TreeNodes
                  nodes={pack.tree}
                  depth={1}
                  openPaths={openPaths}
                  onToggle={toggle}
                />
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

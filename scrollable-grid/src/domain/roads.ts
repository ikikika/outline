import { cellKey } from './board'
import { getNeighborCoordinate, getOppositeDirection } from '../geometry/hex'
import { isRoadType } from './placement'
import type {
  AxialCoordinate,
  BoardModel,
  BridgeTransition,
  HexDirection,
  RoadObject,
} from './types'

export interface RoadGraphNode {
  id: string
  coordinate: AxialCoordinate
  ports: HexDirection[]
  bridgeTransitions: BridgeTransition[]
}

export interface RoadGraphEdge {
  from: AxialCoordinate
  to: AxialCoordinate
  direction: HexDirection
}

export interface RoadGraph {
  nodes: Map<string, RoadGraphNode>
  edges: RoadGraphEdge[]
}

export interface RoadConnectionIssue {
  objectId: string
  coordinate: AxialCoordinate
  direction: HexDirection
  neighbor: AxialCoordinate
  reason: 'outside-board' | 'no-reciprocal-connection' | 'invalid-bridge-transition'
}

export function getRoadPortStatus(
  board: BoardModel,
  coordinate: AxialCoordinate,
  direction: HexDirection,
): 'unconfigured' | 'connected' | 'unconnected' {
  const nodes = getDrivableNodes(board)
  const node = nodes.get(cellKey(coordinate))
  if (!node || !node.ports.includes(direction)) return 'unconfigured'
  return getConnectionIssue(board, nodes, node, direction)
    ? 'unconnected'
    : 'connected'
}

export function getRoadConnectionIssues(board: BoardModel): RoadConnectionIssue[] {
  const issues: RoadConnectionIssue[] = []
  const nodes = getDrivableNodes(board)
  for (const node of nodes.values()) {
    for (const direction of node.ports) {
      const issue = getConnectionIssue(board, nodes, node, direction)
      if (issue) issues.push(issue)
    }
  }
  return issues
}

export function getUnconnectedRoadPorts(
  board: BoardModel,
  coordinate: AxialCoordinate,
): HexDirection[] {
  const nodes = getDrivableNodes(board)
  const node = nodes.get(cellKey(coordinate))
  if (!node) return []
  return node.ports.filter((direction) =>
    getConnectionIssue(board, nodes, node, direction),
  )
}

export function getRoadGraph(board: BoardModel): RoadGraph {
  const nodes = getDrivableNodes(board)
  const edges: RoadGraphEdge[] = []
  const edgeKeys = new Set<string>()

  for (const node of nodes.values()) {
    for (const direction of node.ports) {
      if (getConnectionIssue(board, nodes, node, direction)) continue
      const neighbor = getNeighborCoordinate(node.coordinate, direction)
      const currentKey = cellKey(node.coordinate)
      const neighborKey = cellKey(neighbor)
      const stableKey = [currentKey, neighborKey].sort().join('|')
      if (edgeKeys.has(stableKey)) continue
      edgeKeys.add(stableKey)
      edges.push({ from: node.coordinate, to: neighbor, direction })
    }
  }

  return { nodes, edges }
}

export function getRoadObjectAt(
  board: BoardModel,
  coordinate: AxialCoordinate,
): RoadObject | null {
  const object = board.objects.find(
    (candidate) =>
      candidate.anchor.q === coordinate.q &&
      candidate.anchor.r === coordinate.r,
  )
  return object && isRoadType(object.type) && 'connections' in object
    ? object
    : null
}

function getDrivableNodes(board: BoardModel): Map<string, RoadGraphNode> {
  const nodes = new Map<string, RoadGraphNode>()
  const roadsByCell = new Map<string, RoadObject>()
  for (const object of board.objects) {
    if (isRoadType(object.type) && 'connections' in object) {
      roadsByCell.set(cellKey(object.anchor), object)
    }
  }

  for (const cell of Object.values(board.cells)) {
    const key = cellKey(cell.coordinate)
    if (cell.terrain.type === 'bridge') {
      nodes.set(key, {
        id: `bridge:${key}`,
        coordinate: cell.coordinate,
        ports: [...new Set(cell.terrain.ports)],
        bridgeTransitions: cell.terrain.transitions,
      })
      continue
    }

    if (cell.terrain.type !== 'ground') continue
    const road = roadsByCell.get(key)
    if (!road) continue
    nodes.set(key, {
      id: road.id,
      coordinate: cell.coordinate,
      ports: [...new Set(road.connections)],
      bridgeTransitions: [],
    })
  }

  return nodes
}

function getConnectionIssue(
  board: BoardModel,
  nodes: ReadonlyMap<string, RoadGraphNode>,
  node: RoadGraphNode,
  direction: HexDirection,
): RoadConnectionIssue | null {
  const neighbor = getNeighborCoordinate(node.coordinate, direction)
  const source = board.cells[cellKey(node.coordinate)]
  const sourceId = node.id

  const issue = (
    reason: RoadConnectionIssue['reason'],
  ): RoadConnectionIssue => ({
    objectId: sourceId,
    coordinate: node.coordinate,
    direction,
    neighbor,
    reason,
  })

  if (!board.cells[cellKey(neighbor)]) return issue('outside-board')

  const neighborNode = nodes.get(cellKey(neighbor))
  if (!neighborNode?.ports.includes(getOppositeDirection(direction))) {
    return issue('no-reciprocal-connection')
  }

  if (
    source?.terrain.type === 'bridge' &&
    !hasTransitionThrough(source.terrain.transitions, direction)
  ) {
    return issue('invalid-bridge-transition')
  }

  const neighborCell = board.cells[cellKey(neighbor)]
  if (
    neighborCell?.terrain.type === 'bridge' &&
    !hasTransitionThrough(
      neighborCell.terrain.transitions,
      getOppositeDirection(direction),
    )
  ) {
    return issue('invalid-bridge-transition')
  }

  return null
}

function hasTransitionThrough(
  transitions: readonly BridgeTransition[],
  direction: HexDirection,
): boolean {
  return transitions.some(
    ({ entry, exit }) =>
      entry !== exit && (entry === direction || exit === direction),
  )
}
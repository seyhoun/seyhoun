import {
  Square, Diamond, Circle, ArrowRight, Play, Minus,
  User, Ellipsis, LayoutTemplate, AlignCenter,
  MessageSquare, Users, Activity, Share2,
  Database, Layers, Send, Inbox, StickyNote, Frame,
  FileText, Hexagon, GitBranch, History, Package,
  List, Type, UserCheck,
  type LucideIcon,
} from 'lucide-react'
import type { DiagramType, ElementKind, DiagramNodeData } from '../types/diagram'
import type { TechColors } from './techRegistry'

// ── Element palette definition ────────────────────────────────────────

export interface ElementDef {
  elementKind: ElementKind
  diagramTypes: DiagramType[]
  label: string
  description: string
  Icon: LucideIcon
  colors: TechColors
  defaultData: Partial<DiagramNodeData>
}

const mk = (
  border: string, ring: string, icon: string, tag: string, dot: string
): TechColors => ({ border, ring, icon, tag, dot })

// Color palettes per diagram family
const flowColors    = mk('border-sky-500/40',    'ring-sky-500/50',    'text-sky-400',    'bg-sky-500/10 border-sky-500/30 text-sky-300',    'bg-sky-400')
const decisionColors= mk('border-amber-500/40',  'ring-amber-500/50',  'text-amber-400',  'bg-amber-500/10 border-amber-500/30 text-amber-300', 'bg-amber-400')
const terminalColors= mk('border-emerald-500/40','ring-emerald-500/50','text-emerald-400','bg-emerald-500/10 border-emerald-500/30 text-emerald-300','bg-emerald-400')
const stateColors   = mk('border-violet-500/40', 'ring-violet-500/50', 'text-violet-400', 'bg-violet-500/10 border-violet-500/30 text-violet-300', 'bg-violet-400')
const classColors   = mk('border-indigo-500/40', 'ring-indigo-500/50', 'text-indigo-400', 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300', 'bg-indigo-400')
const entityColors  = mk('border-teal-500/40',   'ring-teal-500/50',   'text-teal-400',   'bg-teal-500/10 border-teal-500/30 text-teal-300',   'bg-teal-400')
const actorColors   = mk('border-orange-500/40', 'ring-orange-500/50', 'text-orange-400', 'bg-orange-500/10 border-orange-500/30 text-orange-300', 'bg-orange-400')
const usecaseColors = mk('border-pink-500/40',   'ring-pink-500/50',   'text-pink-400',   'bg-pink-500/10 border-pink-500/30 text-pink-300',   'bg-pink-400')
const activityColors= mk('border-cyan-500/40',   'ring-cyan-500/50',   'text-cyan-400',   'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',   'bg-cyan-400')
const seqColors     = mk('border-rose-500/40',   'ring-rose-500/50',   'text-rose-400',   'bg-rose-500/10 border-rose-500/30 text-rose-300',   'bg-rose-400')

export const ELEMENT_REGISTRY: ElementDef[] = [
  // ── Flowchart ────────────────────────────────────────────────────
  {
    elementKind: 'process',
    diagramTypes: ['flowchart'],
    label: 'Process',
    description: 'A step or operation in the flow',
    Icon: Square,
    colors: flowColors,
    defaultData: { kind: 'flowchart', label: 'Process', elementKind: 'process' },
  },
  {
    elementKind: 'decision',
    diagramTypes: ['flowchart'],
    label: 'Decision',
    description: 'A yes/no branch point',
    Icon: Diamond,
    colors: decisionColors,
    defaultData: { kind: 'flowchart', label: 'Decision?', elementKind: 'decision' },
  },
  {
    elementKind: 'terminal',
    diagramTypes: ['flowchart'],
    label: 'Terminal',
    description: 'Start or end of the flow',
    Icon: Circle,
    colors: terminalColors,
    defaultData: { kind: 'flowchart', label: 'Start', elementKind: 'terminal' },
  },
  {
    elementKind: 'io-box',
    diagramTypes: ['flowchart'],
    label: 'Input / Output',
    description: 'Data input or output step',
    Icon: ArrowRight,
    colors: flowColors,
    defaultData: { kind: 'flowchart', label: 'Input / Output', elementKind: 'io-box' },
  },
  {
    elementKind: 'predefined-process',
    diagramTypes: ['flowchart'],
    label: 'Predefined Process',
    description: 'A subprocess or named routine',
    Icon: Square,
    colors: flowColors,
    defaultData: { kind: 'flowchart', label: 'Subprocess', elementKind: 'predefined-process' },
  },
  {
    elementKind: 'document',
    diagramTypes: ['flowchart'],
    label: 'Document',
    description: 'A document or report produced/consumed',
    Icon: FileText,
    colors: flowColors,
    defaultData: { kind: 'flowchart', label: 'Document', elementKind: 'document' },
  },
  {
    elementKind: 'preparation',
    diagramTypes: ['flowchart'],
    label: 'Preparation',
    description: 'Initialization or setup step',
    Icon: Hexagon,
    colors: decisionColors,
    defaultData: { kind: 'flowchart', label: 'Prepare', elementKind: 'preparation' },
  },
  {
    elementKind: 'connector',
    diagramTypes: ['flowchart'],
    label: 'Connector',
    description: 'Off-page or section connector',
    Icon: Circle,
    colors: flowColors,
    defaultData: { kind: 'flowchart', label: 'A', elementKind: 'connector' },
  },

  // ── State Machine ─────────────────────────────────────────────────
  {
    elementKind: 'state',
    diagramTypes: ['state_machine'],
    label: 'State',
    description: 'A stable condition in the state machine',
    Icon: Square,
    colors: stateColors,
    defaultData: { kind: 'state', label: 'State', elementKind: 'state' },
  },
  {
    elementKind: 'initial-state',
    diagramTypes: ['state_machine'],
    label: 'Initial State',
    description: 'Starting pseudo-state',
    Icon: Play,
    colors: stateColors,
    defaultData: { kind: 'state', label: '', elementKind: 'initial-state' },
  },
  {
    elementKind: 'final-state',
    diagramTypes: ['state_machine'],
    label: 'Final State',
    description: 'Terminating pseudo-state',
    Icon: Circle,
    colors: stateColors,
    defaultData: { kind: 'state', label: '', elementKind: 'final-state' },
  },
  {
    elementKind: 'composite-state',
    diagramTypes: ['state_machine'],
    label: 'Composite State',
    description: 'A state containing nested sub-states',
    Icon: Layers,
    colors: stateColors,
    defaultData: { kind: 'state', label: 'Composite', elementKind: 'composite-state' },
  },
  {
    elementKind: 'choice',
    diagramTypes: ['state_machine'],
    label: 'Choice',
    description: 'A dynamic choice pseudo-state',
    Icon: GitBranch,
    colors: decisionColors,
    defaultData: { kind: 'state', label: '', elementKind: 'choice' },
  },
  {
    elementKind: 'history',
    diagramTypes: ['state_machine'],
    label: 'History',
    description: 'Shallow history pseudo-state',
    Icon: History,
    colors: stateColors,
    defaultData: { kind: 'state', label: 'H', elementKind: 'history' },
  },

  // ── Class Diagram ─────────────────────────────────────────────────
  {
    elementKind: 'class-box',
    diagramTypes: ['class'],
    label: 'Class',
    description: 'An object-oriented class with attributes and methods',
    Icon: Share2,
    colors: classColors,
    defaultData: {
      kind: 'class',
      label: 'ClassName',
      stereotype: '',
      attributes: [],
      methods: [],
    },
  },
  {
    elementKind: 'interface-box',
    diagramTypes: ['class'],
    label: 'Interface',
    description: 'An interface or abstract type',
    Icon: AlignCenter,
    colors: classColors,
    defaultData: {
      kind: 'class',
      label: 'IName',
      stereotype: 'interface',
      attributes: [],
      methods: [],
    },
  },
  {
    elementKind: 'abstract-class',
    diagramTypes: ['class'],
    label: 'Abstract Class',
    description: 'An abstract class that cannot be instantiated',
    Icon: Type,
    colors: classColors,
    defaultData: {
      kind: 'class',
      label: 'AbstractName',
      stereotype: 'abstract',
      attributes: [],
      methods: [],
    },
  },
  {
    elementKind: 'enum-box',
    diagramTypes: ['class'],
    label: 'Enumeration',
    description: 'A fixed set of named constants',
    Icon: List,
    colors: classColors,
    defaultData: {
      kind: 'class',
      label: 'EnumName',
      stereotype: 'enumeration',
      attributes: [],
      methods: [],
    },
  },
  {
    elementKind: 'package',
    diagramTypes: ['class'],
    label: 'Package',
    description: 'A namespace grouping classes',
    Icon: Package,
    colors: classColors,
    defaultData: {
      kind: 'class',
      label: 'pkg',
      stereotype: 'package',
      attributes: [],
      methods: [],
    },
  },

  // ── ER Diagram ────────────────────────────────────────────────────
  {
    elementKind: 'entity',
    diagramTypes: ['er'],
    label: 'Entity',
    description: 'A database entity with attributes',
    Icon: Database,
    colors: entityColors,
    defaultData: {
      kind: 'entity',
      label: 'Entity',
      isWeak: false,
      attributes: [],
    },
  },
  {
    elementKind: 'weak-entity',
    diagramTypes: ['er'],
    label: 'Weak Entity',
    description: 'An entity that depends on another entity',
    Icon: Database,
    colors: entityColors,
    defaultData: {
      kind: 'entity',
      label: 'WeakEntity',
      isWeak: true,
      attributes: [],
    },
  },
  {
    elementKind: 'relationship',
    diagramTypes: ['er'],
    label: 'Relationship',
    description: 'A relationship diamond between entities',
    Icon: Diamond,
    colors: entityColors,
    defaultData: {
      kind: 'entity',
      label: 'relates',
      isWeak: false,
      elementKind: 'relationship',
      attributes: [],
    },
  },

  // ── Activity Diagram ──────────────────────────────────────────────
  {
    elementKind: 'action',
    diagramTypes: ['activity'],
    label: 'Action',
    description: 'An action or activity step',
    Icon: Activity,
    colors: activityColors,
    defaultData: { kind: 'activity', label: 'Action', elementKind: 'action' },
  },
  {
    elementKind: 'decision-merge',
    diagramTypes: ['activity'],
    label: 'Decision / Merge',
    description: 'A decision or merge point',
    Icon: Diamond,
    colors: decisionColors,
    defaultData: { kind: 'activity', label: '', elementKind: 'decision-merge' },
  },
  {
    elementKind: 'fork-join',
    diagramTypes: ['activity'],
    label: 'Fork / Join',
    description: 'Fork or join concurrent flows',
    Icon: Minus,
    colors: activityColors,
    defaultData: { kind: 'activity', label: '', elementKind: 'fork-join' },
  },
  {
    elementKind: 'initial-state',
    diagramTypes: ['activity'],
    label: 'Start',
    description: 'Starting node',
    Icon: Play,
    colors: activityColors,
    defaultData: { kind: 'activity', label: '', elementKind: 'initial-state' },
  },
  {
    elementKind: 'final-state',
    diagramTypes: ['activity'],
    label: 'End',
    description: 'Activity end node',
    Icon: Circle,
    colors: activityColors,
    defaultData: { kind: 'activity', label: '', elementKind: 'final-state' },
  },
  {
    elementKind: 'swim-lane',
    diagramTypes: ['activity'],
    label: 'Swim Lane',
    description: 'A partition grouping related activities',
    Icon: LayoutTemplate,
    colors: activityColors,
    defaultData: { kind: 'activity', label: 'Lane', elementKind: 'swim-lane' },
  },
  {
    elementKind: 'signal-send',
    diagramTypes: ['activity'],
    label: 'Send Signal',
    description: 'Sends a signal to another activity',
    Icon: Send,
    colors: activityColors,
    defaultData: { kind: 'activity', label: 'Send Signal', elementKind: 'signal-send' },
  },
  {
    elementKind: 'signal-receive',
    diagramTypes: ['activity'],
    label: 'Receive Signal',
    description: 'Waits for an incoming signal',
    Icon: Inbox,
    colors: activityColors,
    defaultData: { kind: 'activity', label: 'Receive Signal', elementKind: 'signal-receive' },
  },
  {
    elementKind: 'note',
    diagramTypes: ['activity', 'class', 'er', 'use_case', 'sequence', 'state_machine'],
    label: 'Note',
    description: 'A comment or annotation',
    Icon: StickyNote,
    colors: activityColors,
    defaultData: { kind: 'activity', label: 'Note', elementKind: 'note' },
  },

  // ── Use Case Diagram ──────────────────────────────────────────────
  {
    elementKind: 'actor',
    diagramTypes: ['use_case'],
    label: 'Actor',
    description: 'An external actor or stakeholder',
    Icon: User,
    colors: actorColors,
    defaultData: { kind: 'use-case', label: 'Actor', elementKind: 'actor', actorType: 'primary' },
  },
  {
    elementKind: 'use-case',
    diagramTypes: ['use_case'],
    label: 'Use Case',
    description: 'A system use case or feature',
    Icon: Ellipsis,
    colors: usecaseColors,
    defaultData: { kind: 'use-case', label: 'Use Case', elementKind: 'use-case' },
  },
  {
    elementKind: 'system-boundary',
    diagramTypes: ['use_case'],
    label: 'System Boundary',
    description: 'A boundary grouping related use cases',
    Icon: LayoutTemplate,
    colors: usecaseColors,
    defaultData: { kind: 'use-case', label: 'System', elementKind: 'system-boundary' },
  },

  // ── Sequence Diagram ──────────────────────────────────────────────
  {
    elementKind: 'lifeline',
    diagramTypes: ['sequence'],
    label: 'Object Lifeline',
    description: 'A participant object in the sequence',
    Icon: Users,
    colors: seqColors,
    defaultData: { kind: 'sequence', label: 'Object', elementKind: 'lifeline', participantType: 'object' },
  },
  {
    elementKind: 'actor',
    diagramTypes: ['sequence'],
    label: 'Actor Lifeline',
    description: 'A human actor participant',
    Icon: User,
    colors: actorColors,
    defaultData: { kind: 'sequence', label: 'Actor', elementKind: 'actor', participantType: 'actor' },
  },
  {
    elementKind: 'boundary-lifeline',
    diagramTypes: ['sequence'],
    label: 'Boundary',
    description: 'A boundary (UI, API) participant',
    Icon: UserCheck,
    colors: seqColors,
    defaultData: { kind: 'sequence', label: 'UI', elementKind: 'boundary-lifeline', participantType: 'boundary' },
  },
  {
    elementKind: 'control-lifeline',
    diagramTypes: ['sequence'],
    label: 'Control',
    description: 'A control (service, controller) participant',
    Icon: Activity,
    colors: seqColors,
    defaultData: { kind: 'sequence', label: 'Controller', elementKind: 'control-lifeline', participantType: 'control' },
  },
  {
    elementKind: 'entity-lifeline',
    diagramTypes: ['sequence'],
    label: 'Entity',
    description: 'A persistent data entity participant',
    Icon: Database,
    colors: seqColors,
    defaultData: { kind: 'sequence', label: 'Entity', elementKind: 'entity-lifeline', participantType: 'entity' },
  },
  {
    elementKind: 'message',
    diagramTypes: ['sequence'],
    label: 'Message (sync)',
    description: 'A synchronous call message',
    Icon: MessageSquare,
    colors: seqColors,
    defaultData: { kind: 'sequence', label: 'message()', elementKind: 'message', messageType: 'sync' },
  },
  {
    elementKind: 'fragment',
    diagramTypes: ['sequence'],
    label: 'Fragment',
    description: 'A combined fragment (alt, loop, opt, break, par)',
    Icon: Frame,
    colors: seqColors,
    defaultData: { kind: 'sequence', label: 'alt', elementKind: 'fragment', fragmentType: 'alt', fragmentCondition: '' },
  },
]

// ── ELEMENT_MAP: keyed by diagramType+elementKind to avoid collisions ────

/**
 * Lookup a default ElementDef for a given elementKind in the context of a specific diagram type.
 * Falls back to the first match by elementKind alone if no type-specific match exists.
 */
export function getElementForDiagram(kind: ElementKind, diagramType: DiagramType): ElementDef {
  const match = ELEMENT_REGISTRY.find(
    (e) => e.elementKind === kind && e.diagramTypes.includes(diagramType)
  )
  return match ?? ELEMENT_REGISTRY.find((e) => e.elementKind === kind) ?? ELEMENT_REGISTRY[0]
}

/** Fallback for contexts where diagramType is not available (e.g. existing code). */
export const ELEMENT_MAP = new Map<ElementKind, ElementDef>(
  ELEMENT_REGISTRY.map((e) => [e.elementKind, e])
)

export function getElement(kind: ElementKind): ElementDef {
  return ELEMENT_MAP.get(kind) ?? ELEMENT_REGISTRY[0]
}

export function getElementsForDiagramType(type: DiagramType): ElementDef[] {
  return ELEMENT_REGISTRY.filter((e) => e.diagramTypes.includes(type))
}

// ── UML sidebar category groups ───────────────────────────────────────

export interface UmlCategory {
  id: string
  label: string
  diagramTypes: DiagramType[]
  elementKinds: ElementKind[]
}

export const UML_CATEGORIES: UmlCategory[] = [
  // ── Flowchart ───────────────────────────────────────────────────
  {
    id: 'flowchart-shapes',
    label: 'Shapes',
    diagramTypes: ['flowchart'],
    elementKinds: ['process', 'predefined-process', 'decision', 'terminal', 'io-box', 'document', 'preparation', 'connector'],
  },

  // ── State Machine ───────────────────────────────────────────────
  {
    id: 'state-elements',
    label: 'States',
    diagramTypes: ['state_machine'],
    elementKinds: ['state', 'composite-state', 'initial-state', 'final-state', 'choice', 'history'],
  },
  {
    id: 'state-notes',
    label: 'Annotations',
    diagramTypes: ['state_machine'],
    elementKinds: ['note'],
  },

  // ── Class Diagram ───────────────────────────────────────────────
  {
    id: 'class-classifiers',
    label: 'Classifiers',
    diagramTypes: ['class'],
    elementKinds: ['class-box', 'abstract-class', 'interface-box', 'enum-box', 'package'],
  },
  {
    id: 'class-notes',
    label: 'Annotations',
    diagramTypes: ['class'],
    elementKinds: ['note'],
  },

  // ── ER Diagram ──────────────────────────────────────────────────
  {
    id: 'er-elements',
    label: 'Entities',
    diagramTypes: ['er'],
    elementKinds: ['entity', 'weak-entity', 'relationship'],
  },
  {
    id: 'er-notes',
    label: 'Annotations',
    diagramTypes: ['er'],
    elementKinds: ['note'],
  },

  // ── Activity Diagram ────────────────────────────────────────────
  {
    id: 'activity-control',
    label: 'Control Flow',
    diagramTypes: ['activity'],
    elementKinds: ['action', 'decision-merge', 'fork-join', 'initial-state', 'final-state'],
  },
  {
    id: 'activity-signals',
    label: 'Signals',
    diagramTypes: ['activity'],
    elementKinds: ['signal-send', 'signal-receive'],
  },
  {
    id: 'activity-layout',
    label: 'Layout',
    diagramTypes: ['activity'],
    elementKinds: ['swim-lane', 'note'],
  },

  // ── Use Case ────────────────────────────────────────────────────
  {
    id: 'usecase-elements',
    label: 'Elements',
    diagramTypes: ['use_case'],
    elementKinds: ['actor', 'use-case', 'system-boundary'],
  },
  {
    id: 'usecase-notes',
    label: 'Annotations',
    diagramTypes: ['use_case'],
    elementKinds: ['note'],
  },

  // ── Sequence ────────────────────────────────────────────────────
  {
    id: 'sequence-participants',
    label: 'Participants',
    diagramTypes: ['sequence'],
    elementKinds: ['lifeline', 'actor', 'boundary-lifeline', 'control-lifeline', 'entity-lifeline'],
  },
  {
    id: 'sequence-messages',
    label: 'Messages',
    diagramTypes: ['sequence'],
    elementKinds: ['message'],
  },
  {
    id: 'sequence-fragments',
    label: 'Fragments',
    diagramTypes: ['sequence'],
    elementKinds: ['fragment'],
  },
  {
    id: 'sequence-notes',
    label: 'Annotations',
    diagramTypes: ['sequence'],
    elementKinds: ['note'],
  },
]

export function getUmlCategoriesForType(type: DiagramType): UmlCategory[] {
  return UML_CATEGORIES.filter((c) => c.diagramTypes.includes(type))
}

// ── Diagram family helpers ─────────────────────────────────────────────

const INFRA_TYPES = new Set<DiagramType>([
  'architecture', 'network', 'platform', 'deployment', 'component',
])

export function isInfraDiagramType(type: DiagramType): boolean {
  return INFRA_TYPES.has(type)
}

// ── UML edge type key ──────────────────────────────────────────────────

export const UML_EDGE_TYPE = 'uml-edge'

// ── Per-diagram edge kinds ─────────────────────────────────────────────

export type UmlEdgeKind =
  | 'association'
  | 'inheritance'
  | 'composition'
  | 'aggregation'
  | 'dependency'
  | 'realization'
  | 'include'
  | 'extend'
  | 'transition'

export const ALL_UML_EDGE_KINDS: { value: UmlEdgeKind; label: string }[] = [
  { value: 'association',  label: 'Association' },
  { value: 'inheritance',  label: 'Inheritance / Generalization' },
  { value: 'composition',  label: 'Composition' },
  { value: 'aggregation',  label: 'Aggregation' },
  { value: 'dependency',   label: 'Dependency' },
  { value: 'realization',  label: 'Realization' },
  { value: 'include',      label: '«include»' },
  { value: 'extend',       label: '«extend»' },
  { value: 'transition',   label: 'Transition' },
]

/** Which edge kinds are meaningful for each diagram type, and which is the default. */
export const DIAGRAM_EDGE_CONFIG: Record<DiagramType, {
  kinds: UmlEdgeKind[]
  default: UmlEdgeKind
}> = {
  architecture: { kinds: ['association'], default: 'association' },
  network:      { kinds: ['association'], default: 'association' },
  platform:     { kinds: ['association'], default: 'association' },
  deployment:   { kinds: ['association'], default: 'association' },
  component:    { kinds: ['association', 'dependency', 'realization'], default: 'association' },
  flowchart:    { kinds: ['association'], default: 'association' },
  state_machine: { kinds: ['transition'], default: 'transition' },
  activity:     { kinds: ['association'], default: 'association' },
  class:        { kinds: ['association', 'inheritance', 'composition', 'aggregation', 'dependency', 'realization'], default: 'association' },
  er:           { kinds: ['association'], default: 'association' },
  use_case:     { kinds: ['association', 'include', 'extend', 'inheritance'], default: 'association' },
  sequence:     { kinds: ['association'], default: 'association' }, // sequence uses messageType, not edgeKind
}

export function getEdgeKindsForDiagram(type: DiagramType): { value: UmlEdgeKind; label: string }[] {
  const cfg = DIAGRAM_EDGE_CONFIG[type]
  if (!cfg) return ALL_UML_EDGE_KINDS
  return ALL_UML_EDGE_KINDS.filter((k) => cfg.kinds.includes(k.value))
}

export function getDefaultEdgeKind(type: DiagramType): UmlEdgeKind {
  return DIAGRAM_EDGE_CONFIG[type]?.default ?? 'association'
}

// ── UML_EDGE_KINDS kept for backward compatibility ─────────────────────
export const UML_EDGE_KINDS = ALL_UML_EDGE_KINDS

// ── Message types for sequence diagrams ───────────────────────────────

export const SEQUENCE_MESSAGE_TYPES = [
  { value: 'sync',    label: 'Synchronous call' },
  { value: 'async',   label: 'Asynchronous call' },
  { value: 'return',  label: 'Return' },
  { value: 'create',  label: 'Create' },
  { value: 'destroy', label: 'Destroy' },
] as const

import {
  Square, Diamond, Circle, ArrowRight, Play, Minus,
  User, Ellipsis, LayoutTemplate, AlignCenter,
  MessageSquare, Users, Activity, Share2,
  Database, type LucideIcon,
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
    diagramTypes: ['flowchart', 'activity'],
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
    description: 'An entity that depends on another',
    Icon: Database,
    colors: entityColors,
    defaultData: {
      kind: 'entity',
      label: 'WeakEntity',
      isWeak: true,
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

  // ── Use Case Diagram ──────────────────────────────────────────────
  {
    elementKind: 'actor',
    diagramTypes: ['use_case', 'sequence'],
    label: 'Actor',
    description: 'An external actor or participant',
    Icon: User,
    colors: actorColors,
    defaultData: { kind: 'use-case', label: 'Actor', elementKind: 'actor' },
  },
  {
    elementKind: 'use-case',
    diagramTypes: ['use_case'],
    label: 'Use Case',
    description: 'A system use case',
    Icon: Ellipsis,
    colors: usecaseColors,
    defaultData: { kind: 'use-case', label: 'Use Case', elementKind: 'use-case' },
  },
  {
    elementKind: 'system-boundary',
    diagramTypes: ['use_case'],
    label: 'System Boundary',
    description: 'System boundary grouping use cases',
    Icon: LayoutTemplate,
    colors: usecaseColors,
    defaultData: { kind: 'use-case', label: 'System', elementKind: 'system-boundary' },
  },

  // ── Sequence Diagram ──────────────────────────────────────────────
  {
    elementKind: 'lifeline',
    diagramTypes: ['sequence'],
    label: 'Lifeline',
    description: 'A participant in the sequence',
    Icon: Users,
    colors: seqColors,
    defaultData: { kind: 'sequence', label: 'Participant', elementKind: 'lifeline', participantType: 'object' },
  },
  {
    elementKind: 'message',
    diagramTypes: ['sequence'],
    label: 'Message',
    description: 'A message between lifelines',
    Icon: MessageSquare,
    colors: seqColors,
    defaultData: { kind: 'sequence', label: 'message()', elementKind: 'message', messageType: 'sync' },
  },
]

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
  {
    id: 'flowchart-shapes',
    label: 'Shapes',
    diagramTypes: ['flowchart'],
    elementKinds: ['process', 'decision', 'terminal', 'io-box', 'connector'],
  },
  {
    id: 'state-elements',
    label: 'States',
    diagramTypes: ['state_machine'],
    elementKinds: ['state', 'initial-state', 'final-state'],
  },
  {
    id: 'class-elements',
    label: 'Classifiers',
    diagramTypes: ['class'],
    elementKinds: ['class-box', 'interface-box'],
  },
  {
    id: 'er-elements',
    label: 'Entities',
    diagramTypes: ['er'],
    elementKinds: ['entity', 'weak-entity'],
  },
  {
    id: 'activity-elements',
    label: 'Activities',
    diagramTypes: ['activity'],
    elementKinds: ['action', 'decision-merge', 'fork-join', 'initial-state', 'final-state'],
  },
  {
    id: 'usecase-elements',
    label: 'Elements',
    diagramTypes: ['use_case'],
    elementKinds: ['actor', 'use-case', 'system-boundary'],
  },
  {
    id: 'sequence-elements',
    label: 'Participants',
    diagramTypes: ['sequence'],
    elementKinds: ['lifeline', 'actor'],
  },
  {
    id: 'sequence-messages',
    label: 'Messages',
    diagramTypes: ['sequence'],
    elementKinds: ['message'],
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


// UML edge type keys
export const UML_EDGE_TYPE = 'uml-edge'

// Edge types for display in inspector
export const UML_EDGE_KINDS = [
  { value: 'association',  label: 'Association' },
  { value: 'inheritance',  label: 'Inheritance / Generalization' },
  { value: 'composition',  label: 'Composition' },
  { value: 'aggregation',  label: 'Aggregation' },
  { value: 'dependency',   label: 'Dependency' },
  { value: 'realization',  label: 'Realization' },
  { value: 'include',      label: '«include»' },
  { value: 'extend',       label: '«extend»' },
  { value: 'transition',   label: 'Transition' },
] as const

// Message types for sequence diagrams
export const SEQUENCE_MESSAGE_TYPES = [
  { value: 'sync',    label: 'Synchronous call' },
  { value: 'async',   label: 'Asynchronous call' },
  { value: 'return',  label: 'Return' },
  { value: 'create',  label: 'Create' },
  { value: 'destroy', label: 'Destroy' },
] as const

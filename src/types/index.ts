// =============================================================================
// BK-CRM — tipos de dominio
// Los tipos definitivos vienen de Prisma (@prisma/client).
// Los tipos legacy de la versión Firebase se mantienen temporalmente
// para que las páginas existentes no rompan mientras se migran en Fase 1.
// =============================================================================

// --- Prisma types (fuente de verdad) ----------------------------------------
export type {
  Organization, User, Role, RolePermission, UserProjectAssignment,
  ProjectType, PipelineStage, StageRule,
  Client, Opportunity, OpportunityStageHistory,
  Message, Task, CalendarBlock, Appointment,
  Document, AgentRun, AgentHandoff, AiUsageMeter,
  AuditLog, Webhook, ApiKey, Subscription,
} from '@prisma/client';

// Re-export Project with alias to avoid conflict with legacy type below
export type { Project as BkProject } from '@prisma/client';

export type {
  ActorType, OrgPlan, OrgStatus, UserStatus, PermissionAction,
  BusinessLine, ProjectStatus, AiMode, ClientType, LeadOrigin,
  OpportunityStatus, MessageChannel, MessageDirection,
  AppointmentType, AppointmentStatus, HandoffReason, AuditAction,
} from '@prisma/client';

// --- UI helpers -------------------------------------------------------------
export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  orgId: string;
  orgSlug: string;
  orgName: string;
};

export type OpportunityWithRelations = import('@prisma/client').Opportunity & {
  client: import('@prisma/client').Client;
  project: import('@prisma/client').Project;
  stage: import('@prisma/client').PipelineStage;
  messages: import('@prisma/client').Message[];
  tasks: import('@prisma/client').Task[];
  appointments: import('@prisma/client').Appointment[];
};

export type KanbanColumn = {
  stage: import('@prisma/client').PipelineStage;
  opportunities: OpportunityWithRelations[];
};

// --- Legacy types (Firebase era) — se eliminan en Fase 1 -------------------
export type LeadStatus = 'Nuevo' | 'Contactado' | 'Seguimiento' | 'Venta' | 'Perdido';

export type Interaction = {
  id: string;
  type: 'whatsapp' | 'call' | 'email' | 'meeting' | 'note';
  date: string;
  notes: string;
};

export type Reminder = {
  id: string;
  task: string;
  dueDate: string;
  completed: boolean;
};

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  entryDate: string;
  status: LeadStatus;
  preferences: string;
  appointmentDate?: string;
  avatarUrl: string;
  avatarHint: string;
  projectIds: string[];
  salesperson?: string;
  interactions: Interaction[];
  reminders: Reminder[];
  interestScore?: number;
  scoreRationale?: string;
};

export type Project = {
  id: string;
  name: string;
  price: number;
  type: string;
  status: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  address?: string;
  funnelQuestions?: string[];
  salespeople?: string[];
};

export const ITEM_TYPES = ["Door", "Storefront", "Curtainwall", "Window wall"] as const;
export const STATUSES = ["Draft", "Issued", "In Progress", "On Hold", "Complete"] as const;
export const ITEM_STATUSES = ["In Progress", "On Hold", "Complete"] as const;
export const HOLD_REASONS = [
  "Material Issues",
  "Short Material",
  "Waiting on Answers",
  "PM/Super Requested",
] as const;

export const SYSTEMS = ["System A", "System B", "System C"] as const;
export const SCOPES = ["Kit", "Assemble", "Hardware"] as const;

export type ItemType = typeof ITEM_TYPES[number];
export type Status = typeof STATUSES[number];
export type ItemStatus = typeof ITEM_STATUSES[number];
export type HoldReason = typeof HOLD_REASONS[number];
export type System = typeof SYSTEMS[number];
export type Scope = typeof SCOPES[number];

export type WorkOrderItem = {
  id: string;
  scope: Scope;
  type: ItemType;
  elevation: string;
  quantity: number;
  completionDates: string[]; // ISO dates, one or many
  status: ItemStatus;
  holdReason?: HoldReason | "";
};

export type WorkOrder = {
  id: string;
  // Summary fields
  jobNumber: string;
  division: string;
  jobName: string;
  jobPM: string;
  jobAddress: string;
  jobSuperintendent: string;
  system: System;
  notes: string;
  dateIssued: string; // ISO date
  workOrderNumber: string; // system generated
  materialDeliveryDate: string; // ISO date
  completionDate: string; // aggregated completion
  completionVaries: boolean;
  // Content
  items: WorkOrderItem[];
  status: Status;
  createdAt: number | string;
  updatedAt: number | string;
};

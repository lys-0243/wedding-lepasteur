export type EventRole = "OWNER" | "PROTOCOLE" | "SCANNER";

export type Permission =
  | "event:read"
  | "event:write"
  | "event:delete"
  | "guests:read"
  | "guests:write"
  | "tables:read"
  | "tables:write"
  | "drinks:read"
  | "drinks:write"
  | "checkin:read"
  | "checkin:write"
  | "gallery:read"
  | "gallery:write"
  | "team:manage";

const ROLE_PERMISSIONS: Record<EventRole, readonly Permission[]> = {
  OWNER: [
    "event:read",
    "event:write",
    "event:delete",
    "guests:read",
    "guests:write",
    "tables:read",
    "tables:write",
    "drinks:read",
    "drinks:write",
    "checkin:read",
    "checkin:write",
    "gallery:read",
    "gallery:write",
    "team:manage",
  ],
  PROTOCOLE: [
    "event:read",
    "guests:read",
    "tables:read",
    "drinks:read",
    "drinks:write",
    "checkin:read",
    "checkin:write",
    "gallery:read",
    "gallery:write",
  ],
  SCANNER: [
    "event:read",
    "guests:read",
    "tables:read",
    "checkin:read",
    "checkin:write",
  ],
};

export function can(role: EventRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getPermissions(role: EventRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export const EVENT_ROLE_LABELS: Record<EventRole, string> = {
  OWNER: "Admin",
  PROTOCOLE: "Protocole",
  SCANNER: "Scanner",
};

export const STAFF_ROLES: EventRole[] = ["PROTOCOLE", "SCANNER"];

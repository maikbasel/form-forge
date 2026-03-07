export interface ActionTypeMetadata {
  actionLabel: string;
  id: string;
  roles: FieldRoleMetadata[];
}

export interface FieldRoleMetadata {
  isTarget: boolean;
  key: string;
  required: boolean;
}

export interface AttachActionRequest {
  actionLabel: string;
  mapping: Record<string, string | null>;
}

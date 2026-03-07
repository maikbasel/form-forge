import z from "zod";

export type FieldRoleMetadataDto = z.infer<typeof FieldRoleMetadataDto>;
export const FieldRoleMetadataDto = z.object({
  isTarget: z.boolean(),
  key: z.string(),
  required: z.boolean(),
});

export type ActionTypeMetadataDto = z.infer<typeof ActionTypeMetadataDto>;
export const ActionTypeMetadataDto = z.object({
  actionLabel: z.string(),
  id: z.string(),
  roles: z.array(FieldRoleMetadataDto),
});

export type AttachedActionResponse = z.infer<typeof AttachedActionResponse>;
export const AttachedActionResponse = z.object({
  actionType: z.string(),
  id: z.string(),
  mapping: z.unknown(),
  targetField: z.string(),
});

export type CalculationActionSchema = z.infer<typeof CalculationActionSchema>;
export const CalculationActionSchema = z.union([
  z.object({
    AbilityModifier: z.object({
      abilityModifierFieldName: z.string(),
      abilityScoreFieldName: z.string(),
    }),
  }),
  z.object({
    SavingThrowModifier: z.object({
      abilityModifierFieldName: z.string(),
      proficiencyBonusFieldName: z.string(),
      proficiencyFieldName: z.string(),
      savingThrowModifierFieldName: z.string(),
    }),
  }),
  z.object({
    SkillModifier: z.object({
      abilityModifierFieldName: z.string(),
      expertiseFieldName: z.union([z.string(), z.null(), z.undefined()]).optional(),
      halfProfFieldName: z.union([z.string(), z.null(), z.undefined()]).optional(),
      proficiencyBonusFieldName: z.string(),
      proficiencyFieldName: z.string(),
      skillModifierFieldName: z.string(),
    }),
  }),
]);

export type DownloadSheetResponse = z.infer<typeof DownloadSheetResponse>;
export const DownloadSheetResponse = z.object({
  filename: z.string(),
  url: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponse>;
export const HealthResponse = z.object({
  status: z.string(),
  version: z.string(),
});

export type SheetFieldDto = z.infer<typeof SheetFieldDto>;
export const SheetFieldDto = z.object({
  name: z.string(),
});

export type ListSheetFieldsResponse = z.infer<typeof ListSheetFieldsResponse>;
export const ListSheetFieldsResponse = z.object({
  fields: z.array(SheetFieldDto),
});

export type ProblemDetails = z.infer<typeof ProblemDetails>;
export const ProblemDetails = z.object({
  detail: z.union([z.string(), z.null(), z.undefined()]).optional(),
  instance: z.union([z.string(), z.null(), z.undefined()]).optional(),
  status: z.number(),
  title: z.string(),
  type: z.string(),
});

export type UploadSheetRequest = z.infer<typeof UploadSheetRequest>;
export const UploadSheetRequest = z.object({
  sheet: z.string(),
});

export type UploadSheetResponse = z.infer<typeof UploadSheetResponse>;
export const UploadSheetResponse = z.object({
  id: z.string(),
});

export type get_ListActionTypes = typeof get_ListActionTypes;
export const get_ListActionTypes = {
  method: z.literal("GET"),
  path: z.literal("/dnd5e/action-types"),
  parameters: z.never(),
  response: z.array(ActionTypeMetadataDto),
};

export type get_ListAttachedActions = typeof get_ListAttachedActions;
export const get_ListAttachedActions = {
  method: z.literal("GET"),
  path: z.literal("/dnd5e/{sheet_id}/actions"),
  parameters: z.object({
    path: z.object({
      sheet_id: z.string(),
    }),
  }),
  response: z.array(AttachedActionResponse),
};

export type put_AttachCalculationAction = typeof put_AttachCalculationAction;
export const put_AttachCalculationAction = {
  method: z.literal("PUT"),
  path: z.literal("/dnd5e/{sheet_id}/actions"),
  parameters: z.object({
    path: z.object({
      sheet_id: z.string(),
    }),
    body: CalculationActionSchema,
  }),
  response: z.unknown(),
};

export type get_Health_check = typeof get_Health_check;
export const get_Health_check = {
  method: z.literal("GET"),
  path: z.literal("/health"),
  parameters: z.never(),
  response: HealthResponse,
};

export type post_UploadSheet = typeof post_UploadSheet;
export const post_UploadSheet = {
  method: z.literal("POST"),
  path: z.literal("/sheets"),
  parameters: z.object({
    body: UploadSheetRequest,
  }),
  response: UploadSheetResponse,
};

export type get_DownloadSheet = typeof get_DownloadSheet;
export const get_DownloadSheet = {
  method: z.literal("GET"),
  path: z.literal("/sheets/{sheet_id}"),
  parameters: z.object({
    path: z.object({
      sheet_id: z.string(),
    }),
  }),
  response: DownloadSheetResponse,
};

export type get_GetSheetFormFields = typeof get_GetSheetFormFields;
export const get_GetSheetFormFields = {
  method: z.literal("GET"),
  path: z.literal("/sheets/{sheet_id}/fields"),
  parameters: z.object({
    path: z.object({
      sheet_id: z.string(),
    }),
  }),
  response: ListSheetFieldsResponse,
};

// <EndpointByMethod>
export const EndpointByMethod = {
  get: {
    "/dnd5e/action-types": get_ListActionTypes,
    "/dnd5e/{sheet_id}/actions": get_ListAttachedActions,
    "/health": get_Health_check,
    "/sheets/{sheet_id}": get_DownloadSheet,
    "/sheets/{sheet_id}/fields": get_GetSheetFormFields,
  },
  put: {
    "/dnd5e/{sheet_id}/actions": put_AttachCalculationAction,
  },
  post: {
    "/sheets": post_UploadSheet,
  },
};
export type EndpointByMethod = typeof EndpointByMethod;
// </EndpointByMethod>

// <EndpointByMethod.Shorthands>
export type GetEndpoints = EndpointByMethod["get"];
export type PutEndpoints = EndpointByMethod["put"];
export type PostEndpoints = EndpointByMethod["post"];
export type AllEndpoints = EndpointByMethod[keyof EndpointByMethod];
// </EndpointByMethod.Shorthands>

// <ApiClientTypes>
export type EndpointParameters = {
  body?: unknown;
  query?: Record<string, unknown>;
  header?: Record<string, unknown>;
  path?: Record<string, unknown>;
};

export type MutationMethod = "post" | "put" | "patch" | "delete";
export type Method = "get" | "head" | MutationMethod;

export type DefaultEndpoint = {
  parameters?: EndpointParameters | undefined;
  response: unknown;
};

export type Endpoint<TConfig extends DefaultEndpoint = DefaultEndpoint> = {
  operationId: string;
  method: Method;
  path: string;
  parameters?: TConfig["parameters"];
  meta: {
    alias: string;
    hasParameters: boolean;
    areParametersRequired: boolean;
  };
  response: TConfig["response"];
};

type Fetcher = (
  method: Method,
  url: string,
  parameters?: EndpointParameters | undefined,
) => Promise<Endpoint["response"]>;

type RequiredKeys<T> = {
  [P in keyof T]-?: undefined extends T[P] ? never : P;
}[keyof T];

type MaybeOptionalArg<T> = RequiredKeys<T> extends never ? [config?: T] : [config: T];

// </ApiClientTypes>

// <ApiClient>
export class ApiClient {
  baseUrl: string = "";

  constructor(public fetcher: Fetcher) {}

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
    return this;
  }

  // <ApiClient.get>
  get<Path extends keyof GetEndpoints, TEndpoint extends GetEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<z.infer<TEndpoint["parameters"]>>
  ): Promise<z.infer<TEndpoint["response"]>> {
    return this.fetcher("get", this.baseUrl + path, params[0]) as Promise<z.infer<TEndpoint["response"]>>;
  }
  // </ApiClient.get>

  // <ApiClient.put>
  put<Path extends keyof PutEndpoints, TEndpoint extends PutEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<z.infer<TEndpoint["parameters"]>>
  ): Promise<z.infer<TEndpoint["response"]>> {
    return this.fetcher("put", this.baseUrl + path, params[0]) as Promise<z.infer<TEndpoint["response"]>>;
  }
  // </ApiClient.put>

  // <ApiClient.post>
  post<Path extends keyof PostEndpoints, TEndpoint extends PostEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<z.infer<TEndpoint["parameters"]>>
  ): Promise<z.infer<TEndpoint["response"]>> {
    return this.fetcher("post", this.baseUrl + path, params[0]) as Promise<z.infer<TEndpoint["response"]>>;
  }
  // </ApiClient.post>
}

export function createApiClient(fetcher: Fetcher, baseUrl?: string) {
  return new ApiClient(fetcher).setBaseUrl(baseUrl ?? "");
}

/**
 Example usage:
 const api = createApiClient((method, url, params) =>
   fetch(url, { method, body: JSON.stringify(params) }).then((res) => res.json()),
 );
 api.get("/users").then((users) => console.log(users));
 api.post("/users", { body: { name: "John" } }).then((user) => console.log(user));
 api.put("/users/:id", { path: { id: 1 }, body: { name: "John" } }).then((user) => console.log(user));
*/

// </ApiClient

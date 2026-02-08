import z from "zod";

export type ApiErrorResponse = z.infer<typeof ApiErrorResponse>;
export const ApiErrorResponse = z.object({
  message: z.string(),
});

export type AttachAbilityModCalcScriptRequest = z.infer<typeof AttachAbilityModCalcScriptRequest>;
export const AttachAbilityModCalcScriptRequest = z.object({
  abilityModifierFieldName: z.string(),
  abilityScoreFieldName: z.string(),
});

export type AttachSavingThrowModifierCalculationScriptRequest = z.infer<
  typeof AttachSavingThrowModifierCalculationScriptRequest
>;
export const AttachSavingThrowModifierCalculationScriptRequest = z.object({
  abilityModifierFieldName: z.string(),
  proficiencyBonusFieldName: z.string(),
  proficiencyFieldName: z.string(),
  savingThrowModifierFieldName: z.string(),
});

export type AttachSkillModifierCalculationScriptRequest = z.infer<typeof AttachSkillModifierCalculationScriptRequest>;
export const AttachSkillModifierCalculationScriptRequest = z.object({
  abilityModifierFieldName: z.string(),
  expertiseFieldName: z.union([z.string(), z.null(), z.undefined()]).optional(),
  halfProfFieldName: z.union([z.string(), z.null(), z.undefined()]).optional(),
  proficiencyBonusFieldName: z.string(),
  proficiencyFieldName: z.string(),
  skillModifierFieldName: z.string(),
});

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

export type UploadSheetRequest = z.infer<typeof UploadSheetRequest>;
export const UploadSheetRequest = z.object({
  sheet: z.string(),
});

export type UploadSheetResponse = z.infer<typeof UploadSheetResponse>;
export const UploadSheetResponse = z.object({
  id: z.string(),
});

export type put_AttachAbilityModifierCalculationScript = typeof put_AttachAbilityModifierCalculationScript;
export const put_AttachAbilityModifierCalculationScript = {
  method: z.literal("PUT"),
  path: z.literal("/dnd5e/{sheet_id}/ability-modifier"),
  parameters: z.object({
    path: z.object({
      sheet_id: z.string(),
    }),
    body: AttachAbilityModCalcScriptRequest,
  }),
  response: z.unknown(),
};

export type put_AttachSavingThrowModifierCalculationScript = typeof put_AttachSavingThrowModifierCalculationScript;
export const put_AttachSavingThrowModifierCalculationScript = {
  method: z.literal("PUT"),
  path: z.literal("/dnd5e/{sheet_id}/saving-throw-modifier"),
  parameters: z.object({
    path: z.object({
      sheet_id: z.string(),
    }),
    body: AttachSavingThrowModifierCalculationScriptRequest,
  }),
  response: z.unknown(),
};

export type put_AttachSkillModifierCalculationScript = typeof put_AttachSkillModifierCalculationScript;
export const put_AttachSkillModifierCalculationScript = {
  method: z.literal("PUT"),
  path: z.literal("/dnd5e/{sheet_id}/skill-modifier"),
  parameters: z.object({
    path: z.object({
      sheet_id: z.string(),
    }),
    body: AttachSkillModifierCalculationScriptRequest,
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
  put: {
    "/dnd5e/{sheet_id}/ability-modifier": put_AttachAbilityModifierCalculationScript,
    "/dnd5e/{sheet_id}/saving-throw-modifier": put_AttachSavingThrowModifierCalculationScript,
    "/dnd5e/{sheet_id}/skill-modifier": put_AttachSkillModifierCalculationScript,
  },
  get: {
    "/health": get_Health_check,
    "/sheets/{sheet_id}": get_DownloadSheet,
    "/sheets/{sheet_id}/fields": get_GetSheetFormFields,
  },
  post: {
    "/sheets": post_UploadSheet,
  },
};
export type EndpointByMethod = typeof EndpointByMethod;
// </EndpointByMethod>

// <EndpointByMethod.Shorthands>
export type PutEndpoints = EndpointByMethod["put"];
export type GetEndpoints = EndpointByMethod["get"];
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

  // <ApiClient.put>
  put<Path extends keyof PutEndpoints, TEndpoint extends PutEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<z.infer<TEndpoint["parameters"]>>
  ): Promise<z.infer<TEndpoint["response"]>> {
    return this.fetcher("put", this.baseUrl + path, params[0]) as Promise<z.infer<TEndpoint["response"]>>;
  }
  // </ApiClient.put>

  // <ApiClient.get>
  get<Path extends keyof GetEndpoints, TEndpoint extends GetEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<z.infer<TEndpoint["parameters"]>>
  ): Promise<z.infer<TEndpoint["response"]>> {
    return this.fetcher("get", this.baseUrl + path, params[0]) as Promise<z.infer<TEndpoint["response"]>>;
  }
  // </ApiClient.get>

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

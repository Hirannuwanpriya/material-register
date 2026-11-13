import type { RouterInputs } from "./trpc";

// The input is optional on the server (prefault), so tRPC types it as `... | void`; strip that.
export type MaterialsListInput = Exclude<RouterInputs["materials"]["list"], void | undefined>;
export type MaterialType = NonNullable<MaterialsListInput["types"]>[number];
export type MaterialStatus = NonNullable<MaterialsListInput["statuses"]>[number];
export type SortBy = NonNullable<MaterialsListInput["sortBy"]>;
export type SortDir = NonNullable<MaterialsListInput["sortDir"]>;

// A Record keyed by the API's union fails the typecheck if the API adds or renames a value,
// so these runtime lists cannot drift from the server's enums.
const materialTypeKeys: Record<MaterialType, true> = {
  "Spare Part": true,
  Consumable: true,
  "Raw Material": true,
  Tool: true,
};
const materialStatusKeys: Record<MaterialStatus, true> = {
  Active: true,
  Obsolete: true,
  "Pending Review": true,
};
const sortByKeys: Record<SortBy, true> = {
  materialNumber: true,
  description: true,
  unitPrice: true,
  stockQty: true,
  updatedAt: true,
};

export const MATERIAL_TYPES = Object.keys(materialTypeKeys) as MaterialType[];
export const MATERIAL_STATUSES = Object.keys(materialStatusKeys) as MaterialStatus[];
export const SORT_KEYS = Object.keys(sortByKeys) as SortBy[];

// Fixed for now: page size is not part of the URL contract (CLAUDE.md Section 8).
export const PAGE_SIZE = 25;

export type TableState = {
  search: string;
  types: MaterialType[];
  statuses: MaterialStatus[];
  plantIds: number[];
  sortBy: SortBy;
  sortDir: SortDir;
  page: number;
};

export const DEFAULT_STATE: TableState = {
  search: "",
  types: [],
  statuses: [],
  plantIds: [],
  sortBy: "materialNumber",
  sortDir: "asc",
  page: 1,
};

// Matches the API's max search length, so a long shared URL cannot cause a 400.
const MAX_SEARCH_LENGTH = 100;
// Matches the API's cap on values per filter.
const MAX_FILTER_VALUES = 50;
// plant_id is a Postgres int4, so the API rejects larger ids; drop them instead of failing the request.
const MAX_PLANT_ID = 2_147_483_647;

function isOneOf<T extends string>(allowed: readonly T[], value: string): value is T {
  return (allowed as readonly string[]).includes(value);
}

function parsePositiveInt(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

// Keeps only allowed values, drops duplicates, and caps the count.
function parseList<T extends string>(values: string[], allowed: readonly T[]): T[] {
  const valid = values.filter((v): v is T => isOneOf(allowed, v));
  return [...new Set(valid)].slice(0, MAX_FILTER_VALUES);
}

// Defensive: anything unknown or malformed falls back to the default instead of throwing.
export function parseTableState(params: URLSearchParams): TableState {
  const sort = params.get("sort") ?? "";
  const dir = params.get("dir") ?? "";

  const plantIds = params
    .getAll("plant")
    .map(parsePositiveInt)
    .filter((n): n is number => n !== null && n <= MAX_PLANT_ID);

  return {
    // Postgres text cannot hold NUL, so a pasted `%00` would fail the request; strip it first.
    search: (params.get("q") ?? "").replaceAll("\u0000", "").trim().slice(0, MAX_SEARCH_LENGTH),
    types: parseList(params.getAll("type"), MATERIAL_TYPES),
    statuses: parseList(params.getAll("status"), MATERIAL_STATUSES),
    plantIds: [...new Set(plantIds)].slice(0, MAX_FILTER_VALUES),
    sortBy: isOneOf(SORT_KEYS, sort) ? sort : DEFAULT_STATE.sortBy,
    sortDir: dir === "asc" || dir === "desc" ? dir : DEFAULT_STATE.sortDir,
    page: parsePositiveInt(params.get("page")) ?? DEFAULT_STATE.page,
  };
}

// Defaults are left out so the plain page has a clean URL.
export function toSearchParams(state: TableState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.search) params.set("q", state.search);
  for (const type of state.types) params.append("type", type);
  for (const status of state.statuses) params.append("status", status);
  for (const plantId of state.plantIds) params.append("plant", String(plantId));
  if (state.sortBy !== DEFAULT_STATE.sortBy) params.set("sort", state.sortBy);
  if (state.sortDir !== DEFAULT_STATE.sortDir) params.set("dir", state.sortDir);
  if (state.page !== DEFAULT_STATE.page) params.set("page", String(state.page));
  return params;
}

export function toQueryInput(state: TableState): MaterialsListInput {
  return {
    search: state.search,
    types: state.types,
    statuses: state.statuses,
    plantIds: state.plantIds,
    sortBy: state.sortBy,
    sortDir: state.sortDir,
    page: state.page,
    pageSize: PAGE_SIZE,
  };
}

export function hasActiveFilters(state: TableState): boolean {
  return (
    state.search !== "" ||
    state.types.length > 0 ||
    state.statuses.length > 0 ||
    state.plantIds.length > 0
  );
}

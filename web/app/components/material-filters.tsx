import { useRef } from "react";
import { IconFilterOff, IconSearch } from "@tabler/icons-react";
import { Button, CloseButton, Group, MultiSelect, TextInput } from "@mantine/core";

import type { RouterOutputs } from "../lib/trpc";
import {
  MATERIAL_STATUSES,
  MATERIAL_TYPES,
  type MaterialStatus,
  type MaterialType,
} from "../lib/table-state";

// Matches the API and table-state.ts cap, so the box cannot hold text the server would reject.
const MAX_SEARCH_LENGTH = 100;

type Plant = RouterOutputs["plants"]["list"][number];

type MaterialFiltersProps = {
  search: string;
  onSearchChange: (search: string) => void;
  onSearchClear: () => void;
  types: MaterialType[];
  onTypesChange: (types: MaterialType[]) => void;
  statuses: MaterialStatus[];
  onStatusesChange: (statuses: MaterialStatus[]) => void;
  plants: Plant[];
  plantsLoading: boolean;
  plantsError: boolean;
  plantIds: number[];
  onPlantIdsChange: (plantIds: number[]) => void;
  filtersActive: boolean;
  onClearAll: () => void;
};

// Mantine hands back plain strings; keep only values from the allowed list so the callback stays typed.
function pickAllowed<T extends string>(values: string[], allowed: readonly T[]): T[] {
  return values.filter((v): v is T => (allowed as readonly string[]).includes(v));
}

// Mantine option values must be strings, so plant ids are converted here, at the edge, and nowhere else.
function toPlantIds(values: string[]): number[] {
  return values.map(Number).filter((n) => Number.isSafeInteger(n) && n > 0);
}

// Presentational: the page owns the search text and the URL. The ref is only used to keep
// focus in the input after the clear button is clicked.
export function MaterialFilters({
  search,
  onSearchChange,
  onSearchClear,
  types,
  onTypesChange,
  statuses,
  onStatusesChange,
  plants,
  plantsLoading,
  plantsError,
  plantIds,
  onPlantIdsChange,
  filtersActive,
  onClearAll,
}: MaterialFiltersProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = () => {
    onSearchClear();
    inputRef.current?.focus();
  };

  // A plant id from the URL that has no option yet (still loading, or not a real plant) still gets
  // a pill, so the user can see why results are filtered and remove it.
  const plantOptions = plants.map((p) => ({ value: String(p.id), label: `${p.code} · ${p.name}` }));
  const knownPlantValues = new Set(plantOptions.map((o) => o.value));
  const unknownPlantOptions = plantIds
    .map(String)
    .filter((value) => !knownPlantValues.has(value))
    .map((value) => ({ value, label: `Plant ${value}` }));

  const plantPlaceholder = plantsError
    ? "Plants unavailable"
    : plantsLoading
      ? "Loading plants..."
      : "All plants";

  return (
    <Group align="flex-end" gap="sm">
      <TextInput
        ref={inputRef}
        label="Search"
        description="Material number, description or MPN"
        placeholder="e.g. bearing"
        value={search}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
        maxLength={MAX_SEARCH_LENGTH}
        leftSection={<IconSearch size={16} />}
        rightSection={
          search !== "" && <CloseButton size="sm" aria-label="Clear search" onClick={clear} />
        }
        rightSectionPointerEvents="all"
        flex={2}
        miw={260}
      />
      <MultiSelect
        label="Type"
        placeholder={types.length === 0 ? "All types" : undefined}
        data={MATERIAL_TYPES}
        value={types}
        onChange={(values) => onTypesChange(pickAllowed(values, MATERIAL_TYPES))}
        clearable
        flex={1}
        miw={200}
      />
      <MultiSelect
        label="Status"
        placeholder={statuses.length === 0 ? "All statuses" : undefined}
        data={MATERIAL_STATUSES}
        value={statuses}
        onChange={(values) => onStatusesChange(pickAllowed(values, MATERIAL_STATUSES))}
        clearable
        flex={1}
        miw={200}
      />
      <MultiSelect
        label="Plant"
        placeholder={plantIds.length === 0 ? plantPlaceholder : undefined}
        data={[...plantOptions, ...unknownPlantOptions]}
        value={plantIds.map(String)}
        onChange={(values) => onPlantIdsChange(toPlantIds(values))}
        disabled={plantsLoading || plantsError}
        clearable
        searchable
        nothingFoundMessage="No plants found"
        flex={1}
        miw={220}
      />
      <Button
        variant="subtle"
        leftSection={<IconFilterOff size={16} />}
        onClick={onClearAll}
        disabled={!filtersActive}
      >
        Clear all
      </Button>
    </Group>
  );
}

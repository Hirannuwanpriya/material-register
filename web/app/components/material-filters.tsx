import { useRef } from "react";
import { IconSearch } from "@tabler/icons-react";
import { CloseButton, Group, TextInput } from "@mantine/core";

// Matches the API and table-state.ts cap, so the box cannot hold text the server would reject.
const MAX_SEARCH_LENGTH = 100;

type MaterialFiltersProps = {
  search: string;
  onSearchChange: (search: string) => void;
  onSearchClear: () => void;
};

// Presentational: the page owns the search text and the URL. The ref is only used to keep
// focus in the input after the clear button is clicked.
export function MaterialFilters({ search, onSearchChange, onSearchClear }: MaterialFiltersProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = () => {
    onSearchClear();
    inputRef.current?.focus();
  };

  return (
    <Group align="flex-end">
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
        flex={1}
        maw={480}
      />
    </Group>
  );
}

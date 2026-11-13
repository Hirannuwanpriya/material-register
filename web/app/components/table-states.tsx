import { IconAlertCircle, IconSearchOff } from "@tabler/icons-react";
import { Alert, Button, Stack, Text, ThemeIcon } from "@mantine/core";

type TableErrorProps = {
  message: string;
  retrying: boolean;
  onRetry: () => void;
};

// R6.3: shown in place of the table when the query failed and there is no data to fall back on.
export function TableError({ message, retrying, onRetry }: TableErrorProps) {
  return (
    <Alert
      color="red"
      variant="light"
      title="Could not load materials"
      icon={<IconAlertCircle aria-hidden />}
    >
      <Stack gap="sm" align="flex-start">
        <Text size="sm">{message}</Text>
        <Button color="red" variant="light" size="xs" loading={retrying} onClick={onRetry}>
          Try again
        </Button>
      </Stack>
    </Alert>
  );
}

type TableEmptyProps = {
  filtersActive: boolean;
  onClear: () => void;
};

// R6.2: shown in place of the table when the query succeeded with zero rows.
export function TableEmpty({ filtersActive, onClear }: TableEmptyProps) {
  return (
    <Stack align="center" gap="xs" py="xl" px="md">
      <ThemeIcon variant="light" color="gray" size={48} radius="xl">
        <IconSearchOff size={28} aria-hidden />
      </ThemeIcon>
      <Text fw={600}>{filtersActive ? "No materials match" : "No materials yet"}</Text>
      <Text size="sm" c="dimmed" ta="center">
        {filtersActive
          ? "Try a different search term or remove some filters."
          : "The register is empty. Materials will show here once they are loaded."}
      </Text>
      {filtersActive && (
        <Button variant="light" mt="xs" onClick={onClear}>
          Clear search and filters
        </Button>
      )}
    </Stack>
  );
}

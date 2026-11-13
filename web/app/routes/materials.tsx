import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Container, Group, Loader, Pagination, Paper, Stack, Text, Title } from "@mantine/core";

import type { Route } from "./+types/materials";
import { MaterialsTable } from "../components/materials-table";
import { formatNumber } from "../lib/format";
import { useTRPC, type RouterOutputs } from "../lib/trpc";
import {
  parseTableState,
  toQueryInput,
  toSearchParams,
  type TableState,
} from "../lib/table-state";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Material Register" }];
}

export default function MaterialsPage() {
  const trpc = useTRPC();
  const [searchParams, setSearchParams] = useSearchParams();

  // The URL is the single source of table state; depend on searchParams so it re-parses on change.
  const state = useMemo(() => parseTableState(searchParams), [searchParams]);

  // Any change except an explicit page change sends the user back to page 1,
  // so a new sort or filter never lands on a page that no longer exists.
  const update = (patch: Partial<TableState>, options?: { replace?: boolean }) => {
    const next: TableState = { ...state, page: 1, ...patch };
    setSearchParams(toSearchParams(next), { replace: options?.replace });
  };

  // staleTime (30s) is set globally on the QueryClient in root.tsx.
  // keepPreviousData keeps the old page on screen while the next one loads, so the table never flashes.
  const { data, isPending, isError, isFetching, isPlaceholderData, error } = useQuery(
    trpc.materials.list.queryOptions(toQueryInput(state), { placeholderData: keepPreviousData }),
  );

  // A shared link may point past the last page (e.g. ?page=9999). Only act on real data for
  // this exact input, not placeholder data from the previous query, and replace the history
  // entry so Back does not return to the broken page.
  const pageCount = data?.pageCount;
  const pastLastPage = !isPlaceholderData && pageCount !== undefined && state.page > pageCount;
  useEffect(() => {
    if (pastLastPage && pageCount !== undefined) {
      setSearchParams(toSearchParams({ ...state, page: pageCount }), { replace: true });
    }
  }, [pastLastPage, pageCount, state, setSearchParams]);

  return (
    <Container size="xl" py="lg">
      <Stack gap="md">
        <div>
          <Title order={2}>Material Register</Title>
          <Text c="dimmed">Search, filter and sort the material catalogue.</Text>
        </div>

        {/* Minimal for now; the full error and empty states are Phase 5 (R6.1 to R6.3). */}
        {isError && !data ? (
          <Text c="red">Could not load materials: {error.message}</Text>
        ) : data?.total === 0 ? (
          <Text c="dimmed">No materials match.</Text>
        ) : (
          <>
            <Paper withBorder radius="md">
              <MaterialsTable
                items={data?.items ?? []}
                sortBy={state.sortBy}
                sortDir={state.sortDir}
                onSort={(sortBy, sortDir) => update({ sortBy, sortDir })}
                loading={isPending}
                refetching={isPlaceholderData}
              />
            </Paper>

            <Group justify="space-between">
              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  {data ? resultRange(data) : "Loading materials..."}
                </Text>
                {isFetching && !isPending && <Loader size="xs" />}
              </Group>
              <Pagination
                total={data?.pageCount ?? 1}
                value={state.page}
                onChange={(page) => update({ page })}
                disabled={!data}
              />
            </Group>
          </>
        )}
      </Stack>
    </Container>
  );
}

// e.g. "26–50 of 20,000"
function resultRange(data: RouterOutputs["materials"]["list"]): string {
  if (data.items.length === 0) return `0 of ${formatNumber(data.total)}`;
  const first = (data.page - 1) * data.pageSize + 1;
  const last = first + data.items.length - 1;
  return `${formatNumber(first)}–${formatNumber(last)} of ${formatNumber(data.total)}`;
}

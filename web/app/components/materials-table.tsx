import type { ReactNode } from "react";
import { IconChevronDown, IconChevronUp, IconSelector } from "@tabler/icons-react";
import { Badge, Group, Skeleton, Table, Text, UnstyledButton } from "@mantine/core";

import type { RouterOutputs } from "../lib/trpc";
import type { SortBy, SortDir } from "../lib/table-state";
import { formatDate, formatNumber, formatPrice } from "../lib/format";

export type Material = RouterOutputs["materials"]["list"]["items"][number];

// Keyed by the API's status union, so a new status fails the typecheck until it has a colour.
const STATUS_COLORS: Record<Material["status"], string> = {
  Active: "green",
  Obsolete: "gray",
  "Pending Review": "yellow",
};

const COLUMN_COUNT = 9;
const SKELETON_ROWS = 10;

type SortableThProps = {
  column: SortBy;
  sortBy: SortBy;
  sortDir: SortDir;
  onSort: (sortBy: SortBy, sortDir: SortDir) => void;
  align?: "left" | "right";
  children: ReactNode;
};

function SortableTh({ column, sortBy, sortDir, onSort, align = "left", children }: SortableThProps) {
  const active = column === sortBy;
  const Icon = !active ? IconSelector : sortDir === "asc" ? IconChevronUp : IconChevronDown;
  const ariaSort = !active ? "none" : sortDir === "asc" ? "ascending" : "descending";

  // The active column flips direction; a newly chosen column starts ascending.
  const handleClick = () => onSort(column, active && sortDir === "asc" ? "desc" : "asc");

  return (
    <Table.Th aria-sort={ariaSort} ta={align}>
      <UnstyledButton onClick={handleClick} fw={700} fz="sm">
        <Group gap={4} wrap="nowrap" justify={align === "right" ? "flex-end" : "flex-start"}>
          {children}
          <Icon size={14} stroke={1.5} aria-hidden />
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}

type MaterialsTableProps = {
  items: Material[];
  sortBy: SortBy;
  sortDir: SortDir;
  onSort: (sortBy: SortBy, sortDir: SortDir) => void;
  // First load, no rows yet: show skeleton rows.
  loading: boolean;
  // Old rows still on screen while the next page or sort loads: fade them.
  refetching: boolean;
};

export function MaterialsTable({
  items,
  sortBy,
  sortDir,
  onSort,
  loading,
  refetching,
}: MaterialsTableProps) {
  const sortProps = { sortBy, sortDir, onSort };

  return (
    <Table.ScrollContainer minWidth={1100}>
      <Table striped highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <SortableTh column="materialNumber" {...sortProps}>
              Material #
            </SortableTh>
            <SortableTh column="description" {...sortProps}>
              Description
            </SortableTh>
            <Table.Th>Type</Table.Th>
            <Table.Th>Manufacturer / MPN</Table.Th>
            <Table.Th>Plant</Table.Th>
            <Table.Th>Status</Table.Th>
            <SortableTh column="unitPrice" align="right" {...sortProps}>
              Unit price
            </SortableTh>
            <SortableTh column="stockQty" align="right" {...sortProps}>
              Stock
            </SortableTh>
            <SortableTh column="updatedAt" {...sortProps}>
              Last updated
            </SortableTh>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody opacity={refetching ? 0.6 : 1}>
          {loading
            ? Array.from({ length: SKELETON_ROWS }, (_, row) => (
                <Table.Tr key={row}>
                  {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
                    <Table.Td key={cell}>
                      <Skeleton height={14} radius="sm" />
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            : items.map((material) => (
                <Table.Tr key={material.id}>
                  <Table.Td ff="monospace">{material.materialNumber}</Table.Td>
                  <Table.Td>{material.description}</Table.Td>
                  <Table.Td>{material.type}</Table.Td>
                  <Table.Td>
                    <Text size="sm">{material.manufacturer.name}</Text>
                    <Text size="xs" c="dimmed" ff="monospace">
                      {material.mpn}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {material.plant.code} · {material.plant.name}
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={STATUS_COLORS[material.status]}>
                      {material.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td ta="right">{formatPrice(material.unitPrice)}</Table.Td>
                  <Table.Td ta="right">
                    {formatNumber(material.stockQty)} {material.uom}
                  </Table.Td>
                  <Table.Td>{formatDate(material.updatedAt)}</Table.Td>
                </Table.Tr>
              ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

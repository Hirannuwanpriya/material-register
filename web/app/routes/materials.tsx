import { Container, Stack, Text, Title } from "@mantine/core";

import type { Route } from "./+types/materials";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Material Register" }];
}

export default function MaterialsPage() {
  return (
    <Container size="xl" py="lg">
      <Stack gap="md">
        <div>
          <Title order={2}>Material Register</Title>
          <Text c="dimmed">Search, filter and sort the material catalogue.</Text>
        </div>
      </Stack>
    </Container>
  );
}

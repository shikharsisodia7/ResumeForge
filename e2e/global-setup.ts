import type { FullConfig } from "@playwright/test";
import { assertExpectedServer } from "@/lib/dev/assert-expected-server";

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (!baseURL) return;
  await assertExpectedServer(baseURL);
}

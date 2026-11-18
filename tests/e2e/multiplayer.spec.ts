import { expect, test, type Page } from "@playwright/test";

interface DebugSnapshot {
  local: { x: number; z: number } | null;
  authoritative: { x: number; z: number } | null;
  remote: Array<{ sessionId: string; x: number; z: number }>;
}

type DebugWindow = Window & {
  __islandCasesDebug?: { getSnapshot: () => DebugSnapshot };
};

function trackErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  return errors;
}

async function join(page: Page, name: string): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Nombre de investigador").fill(name);
  await page.getByRole("button", { name: "Entrar en la isla" }).click();
  await expect(page.getByText("EN LÍNEA", { exact: true })).toBeVisible();
}

async function readyUp(page: Page): Promise<void> {
  await page.getByTestId("ready-button").click();
  await expect(page.getByTestId("ready-button")).toHaveAttribute("aria-pressed", "true");
}

function distanceTo(point: { x: number; z: number }, target: { x: number; z: number }): number {
  return Math.hypot(target.x - point.x, target.z - point.z);
}

async function moveTowards(page: Page, target: { x: number; z: number }): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const point = (await readSnapshot(page)).authoritative;

    if (!point) {
      throw new Error("El jugador autoritativo aún no está disponible.");
    }

    if (distanceTo(point, target) < 1) {
      return;
    }

    const deltaX = target.x - point.x;
    const deltaZ = target.z - point.z;
    const key =
      Math.abs(deltaZ) >= Math.abs(deltaX) ? (deltaZ > 0 ? "w" : "s") : deltaX > 0 ? "d" : "a";

    await page.keyboard.down(key);
    await page.waitForTimeout(80);
    await page.keyboard.up(key);
    await page.waitForTimeout(200);
  }
}

async function readSnapshot(page: Page): Promise<DebugSnapshot> {
  const snapshot = await page.evaluate(() =>
    (window as DebugWindow).__islandCasesDebug?.getSnapshot(),
  );

  if (!snapshot) {
    throw new Error("La escena de juego aún no está disponible.");
  }

  return snapshot;
}

test("dos investigadores forman pareja, registran una pista y sincronizan movimiento", async ({
  browser,
}) => {
  test.setTimeout(90_000);

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const errorsA = trackErrors(pageA);
  const errorsB = trackErrors(pageB);

  await join(pageA, "Ada");
  await expect(pageA.getByTestId("player-panel")).toHaveAttribute("data-players", "1");

  await join(pageB, "Borges");
  await expect(pageA.getByTestId("player-panel")).toHaveAttribute("data-players", "2");
  await expect(pageB.getByTestId("player-panel")).toHaveAttribute("data-players", "2");

  await expect(pageA.getByTestId("lobby")).toHaveAttribute("data-phase", "WAITING");
  await expect(pageB.getByTestId("lobby")).toHaveAttribute("data-phase", "WAITING");
  await expect(pageA.getByTestId("lobby")).toContainText("Ada");
  await expect(pageA.getByTestId("lobby")).toContainText("Borges");
  await expect(pageA.getByTestId("lobby")).toContainText("EQUIPO 01");

  await readyUp(pageA);
  await readyUp(pageB);

  await expect
    .poll(async () => pageA.getByTestId("match-phase").getAttribute("data-phase"), {
      timeout: 10_000,
    })
    .toBe("PLAYING");
  await expect(pageB.getByTestId("match-phase")).toHaveAttribute("data-phase", "PLAYING");
  await expect(pageA.getByTestId("lobby")).toHaveCount(0);
  await expect(pageB.getByTestId("lobby")).toHaveCount(0);
  await expect(pageA.getByTestId("dossier")).toHaveAttribute("data-clues", "0");

  const before = await readSnapshot(pageB);
  expect(before.remote).toHaveLength(1);

  await moveTowards(pageA, { x: -6, z: -2.2 });
  await pageA.waitForTimeout(200);

  await expect
    .poll(
      async () => {
        const after = await readSnapshot(pageB);
        const remote = after.remote[0];
        const original = before.remote[0];

        if (!remote || !original) {
          return 0;
        }

        return Math.hypot(remote.x - original.x, remote.z - original.z);
      },
      { timeout: 5_000 },
    )
    .toBeGreaterThan(0.15);

  await expect(pageA.getByTestId("clue-prompt")).toBeVisible({ timeout: 5_000 });
  await pageA.keyboard.press("e");
  await expect(pageA.getByTestId("dossier")).toHaveAttribute("data-clues", "1");
  await expect(pageA.locator('[data-clue="guest-book"]')).toHaveAttribute("data-found", "true");
  await expect(pageB.getByTestId("dossier")).toHaveAttribute("data-clues", "1");

  await pageA.screenshot({ path: "test-results/multiplayer-a.png" });
  await pageB.screenshot({ path: "test-results/multiplayer-b.png" });

  expect(errorsA).toEqual([]);
  expect(errorsB).toEqual([]);

  await contextA.close();
  await contextB.close();
});

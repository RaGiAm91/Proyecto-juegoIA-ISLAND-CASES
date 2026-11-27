import { expect, test, type Page } from "@playwright/test";

interface DebugSnapshot {
  local: {
    x: number;
    y: number;
    z: number;
    alive: boolean;
    spectating: boolean;
    spectatorTarget: string;
  } | null;
  authoritative: { x: number; z: number } | null;
  remote: Array<{ sessionId: string; x: number; z: number; alive: boolean }>;
  cameraTarget: { x: number; z: number } | null;
  cameraAlpha: number;
  cameraBeta: number;
  cameraAngularSensibility: number;
  cameraFollow: number;
  occludedMeshes: string[];
}

type DebugWindow = Window & {
  __islandCasesDebug?: {
    getSnapshot: () => DebugSnapshot;
    setPlayerPosition: (x: number, z: number) => void;
    setCameraAlpha: (alpha: number) => void;
  };
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

async function setPlayerPosition(page: Page, target: { x: number; z: number }): Promise<void> {
  await page.evaluate(({ x, z }) => {
    (window as DebugWindow).__islandCasesDebug?.setPlayerPosition(x, z);
  }, target);

  await expect
    .poll(
      async () => {
        const point = (await readSnapshot(page)).authoritative;
        return point ? distanceTo(point, target) : Number.POSITIVE_INFINITY;
      },
      { timeout: 5_000 },
    )
    .toBeLessThan(0.2);
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

test("dos investigadores forman pareja, registran una pista, mueren y espectan", async ({
  browser,
}) => {
  test.setTimeout(240_000);

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

  const movementStart = (await readSnapshot(pageA)).authoritative;
  expect(movementStart).not.toBeNull();
  await pageA.evaluate(() => {
    (window as DebugWindow).__islandCasesDebug?.setCameraAlpha(0);
  });
  await pageA.keyboard.down("w");
  await pageA.waitForTimeout(700);
  await pageA.keyboard.up("w");
  await expect
    .poll(
      async () => {
        const point = (await readSnapshot(pageA)).authoritative;
        return point && movementStart ? movementStart.x - point.x : 0;
      },
      { timeout: 5_000 },
    )
    .toBeGreaterThan(0.3);
  await pageA.evaluate(() => {
    (window as DebugWindow).__islandCasesDebug?.setCameraAlpha(-Math.PI / 2);
  });

  const cameraBefore = await readSnapshot(pageA);
  expect(cameraBefore.cameraBeta).toBeCloseTo(0.78, 5);
  await pageA.mouse.move(400, 300);
  await pageA.mouse.move(600, 340, { steps: 8 });
  await expect
    .poll(
      async () => Math.abs((await readSnapshot(pageA)).cameraAlpha - cameraBefore.cameraAlpha),
      { timeout: 5_000 },
    )
    .toBeGreaterThan(0.01);
  expect((await readSnapshot(pageA)).cameraBeta).toBeCloseTo(cameraBefore.cameraBeta, 5);

  await setPlayerPosition(pageA, { x: -8.5, z: -5 });
  await pageA.evaluate(() => {
    (window as DebugWindow).__islandCasesDebug?.setCameraAlpha(Math.PI);
  });
  await expect
    .poll(async () => (await readSnapshot(pageA)).occludedMeshes, { timeout: 5_000 })
    .toContain("wall-exterior-west");
  await pageA.evaluate(() => {
    (window as DebugWindow).__islandCasesDebug?.setCameraAlpha(Math.PI / 2);
  });
  await expect
    .poll(async () => (await readSnapshot(pageA)).occludedMeshes, { timeout: 5_000 })
    .not.toContain("wall-exterior-west");

  const follow = pageA.getByTestId("camera-follow");
  await expect(follow).toHaveValue("0.7");
  await follow.focus();
  await follow.press("ArrowRight");
  await expect
    .poll(async () => (await readSnapshot(pageA)).cameraFollow, { timeout: 5_000 })
    .toBeCloseTo(0.75, 2);
  await follow.evaluate((element) => (element as HTMLInputElement).blur());
  expect((await readSnapshot(pageA)).cameraAngularSensibility).toBe(1000);

  const before = await readSnapshot(pageB);
  expect(before.remote).toHaveLength(1);

  await setPlayerPosition(pageA, { x: -9, z: -4.7 });
  await expect(pageA.getByTestId("hub-prompt")).toBeVisible({ timeout: 5_000 });
  await expect(pageA.getByTestId("hub-prompt")).toContainText("Consultar directorio");
  await pageA.keyboard.press("e");
  await expect(pageA.getByTestId("hub-panel")).toBeVisible({ timeout: 5_000 });
  await expect(pageA.getByTestId("hub-panel")).toContainText("Biblioteca");
  await pageA.keyboard.press("Escape");
  await expect(pageA.getByTestId("hub-panel")).toHaveCount(0);

  await setPlayerPosition(pageA, { x: -8, z: -4.7 });
  await setPlayerPosition(pageA, { x: -6, z: -2.2 });
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
  await expect(pageA.getByTestId("death-overlay")).toBeVisible();
  await expect(pageA.getByTestId("spectator-banner")).toHaveAttribute("data-alive", "false");
  await expect(pageA.getByTestId("clue-prompt")).toHaveCount(0);
  await expect(pageA.locator('[data-clue="guest-book"]')).toHaveAttribute("data-found", "true");
  await expect(pageB.getByTestId("dossier")).toHaveAttribute("data-clues", "1");
  await expect(pageA.getByTestId("event-log")).toHaveAttribute("data-event", "firma-sangrienta");
  await expect(pageB.getByTestId("event-log")).toHaveAttribute("data-event", "firma-sangrienta");

  await expect
    .poll(async () => (await readSnapshot(pageA)).local?.alive, { timeout: 10_000 })
    .toBe(false);

  const deadSnapshot = await readSnapshot(pageA);
  const teammateId = deadSnapshot.remote[0]?.sessionId;

  expect(deadSnapshot.local?.y).toBeCloseTo(0.34, 2);
  expect(deadSnapshot.local?.spectating).toBe(true);
  expect(teammateId).toBeTruthy();
  expect(deadSnapshot.local?.spectatorTarget).toBe(teammateId);
  await expect(pageA.getByTestId("spectator-banner")).toHaveAttribute(
    "data-target",
    teammateId ?? "",
  );
  await expect(pageA.getByTestId("death-overlay")).toHaveCount(0, { timeout: 6_000 });

  await expect
    .poll(
      async () => {
        const observer = await readSnapshot(pageA);
        const target = (await readSnapshot(pageB)).authoritative;

        if (!observer.cameraTarget || !target) {
          return Number.POSITIVE_INFINITY;
        }

        return distanceTo(observer.cameraTarget, target);
      },
      { timeout: 10_000 },
    )
    .toBeLessThan(1.2);

  const deathPosition = (await readSnapshot(pageA)).authoritative;

  expect(deathPosition).not.toBeNull();
  await pageA.keyboard.down("w");
  await pageA.waitForTimeout(250);
  await pageA.keyboard.up("w");

  const afterDeath = (await readSnapshot(pageA)).authoritative;

  expect(afterDeath).not.toBeNull();
  expect(distanceTo(deathPosition ?? { x: 0, z: 0 }, afterDeath ?? { x: 0, z: 0 })).toBeLessThan(
    0.01,
  );

  await pageA.screenshot({ path: "test-results/multiplayer-a.png" });
  await pageB.screenshot({ path: "test-results/multiplayer-b.png" });

  expect(errorsA).toEqual([]);
  expect(errorsB).toEqual([]);

  await contextA.close();
  await contextB.close();
});

import type { MovementAxes } from "@island-cases/shared";

export class InputController {
  private readonly keys = new Set<string>();
  private interactRequested = false;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.isTextTarget(event.target)) {
      return;
    }

    this.keys.add(event.code);

    if (event.code === "KeyE" && !event.repeat) {
      this.interactRequested = true;
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly onBlur = (): void => {
    this.keys.clear();
    this.interactRequested = false;
  };

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  consumeInteract(): boolean {
    const requested = this.interactRequested;
    this.interactRequested = false;
    return requested;
  }

  getAxes(): MovementAxes {
    const moveX = Number(this.keys.has("KeyD")) - Number(this.keys.has("KeyA"));
    const moveZ = Number(this.keys.has("KeyW")) - Number(this.keys.has("KeyS"));

    return { moveX, moveZ };
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.keys.clear();
    this.interactRequested = false;
  }

  private isTextTarget(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    );
  }
}

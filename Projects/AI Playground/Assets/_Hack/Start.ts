import { InteractorEvent } from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent";
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger";

const log = new NativeLogger("StartSceneController");

@component
export class StartSceneController extends BaseScriptComponent {
  @ui.separator
  @ui.label("Start Scene Configuration")
  @ui.separator
  @ui.group_start("UI References")
  @input
  @hint("Button the user presses to start the experience")
  private startButton: Interactable;
  @input
  @hint("Button for image interaction")
  private imageButton: Interactable;
  @input
  @hint("Button for text interaction")
  private textButton: Interactable;

  @input
  @hint("Welcome / intro text that will be cleared after start")
  private welcomeText: Text;
  @ui.group_end

  @ui.separator
  @ui.group_start("Pinch Service")
  @input
  @hint("Template SceneObject that provides the Pinch Service (will be cloned on start). Leave empty if already present in scene.")
  private pinchServiceTemplate: SceneObject;

  @input
  @hint("If true, will only instantiate pinch service once even across re-instantiations (tracked globally).")
  private singleInstance: boolean = true;
  @ui.group_end

  @ui.separator
  @ui.group_start("Debug")
  @input
  @hint("Enable verbose logging")
  private verboseLogging: boolean = true;
  @ui.group_end

  private defaultWelcomeText: string = "";
  private hasStarted: boolean = false;
  private spawnedPinchService: SceneObject = null;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      this.captureDefaultState();
      this.initializeButton();
      this.hideImageAndTextButtons(); // Ensure hidden at startup
      this.resetUI();
      if (this.verboseLogging) {
        log.i("Start scene initialized");
      }
    });
  }

  // ----------------------------------------------------------------------
  // Initialization
  // ----------------------------------------------------------------------

  private captureDefaultState() {
    if (this.welcomeText) {
      this.defaultWelcomeText = this.welcomeText.text || "";
    }
  }

  private initializeButton() {
    if (!this.startButton) {
      log.e("Start button not assigned");
      return;
    }
    this.startButton.onInteractorTriggerStart((event: InteractorEvent) => {
      this.handleStartPressed();
    });
  }

  private hideImageAndTextButtons() {
    if (this.imageButton && this.imageButton.getSceneObject) {
      this.imageButton.getSceneObject().enabled = false;
    }
    if (this.textButton && this.textButton.getSceneObject) {
      this.textButton.getSceneObject().enabled = false;
    }
  }

  // ----------------------------------------------------------------------
  // Start Flow
  // ----------------------------------------------------------------------

  private handleStartPressed() {
    if (this.hasStarted) {
      if (this.verboseLogging) {
        log.w("Start already triggered; ignoring.");
      }
      return;
    }
    this.hasStarted = true;

    // 1. Instantiate / ensure pinch service
    this.instantiatePinchService();

    // 2. Clear welcome text
    if (this.welcomeText) {
      this.welcomeText.text = "";
    }

    // 3. Hide start button
    this.showStartButton(false);

    // 4. Show image and text buttons
    this.showButtons(true);

    if (this.verboseLogging) {
      log.i("Experience started: pinch service ready, UI updated.");
    }
  }

  // ----------------------------------------------------------------------
  // Pinch Service Handling
  // ----------------------------------------------------------------------

  private instantiatePinchService() {
    // Use a global flag to prevent multiple instantiations if requested
    if (this.singleInstance && (global as any).__PinchServiceSpawned) {
      if (this.verboseLogging) {
        log.i("Pinch service already instantiated (global). Skipping.");
      }
      return;
    }

    if (!this.pinchServiceTemplate) {
      if (this.verboseLogging) {
        log.w("No pinchServiceTemplate provided. Assuming service already exists in scene.");
      }
      (global as any).__PinchServiceSpawned = true;
      return;
    }

    try {
      // Clone / copy hierarchy (API may vary; fallback strategies)
      if ((this.pinchServiceTemplate as any).copyWholeHierarchy) {
        this.spawnedPinchService = (this.pinchServiceTemplate as any).copyWholeHierarchy();
      } else if ((this.pinchServiceTemplate as any).clone) {
        this.spawnedPinchService = (this.pinchServiceTemplate as any).clone();
      } else {
        // Manual create + component copy not implemented; log fallback
        this.spawnedPinchService = this.pinchServiceTemplate;
        if (this.verboseLogging) {
          log.w("Could not clone pinchServiceTemplate; using original reference.");
        }
      }

      if (this.spawnedPinchService) {
        this.spawnedPinchService.enabled = true;
        (global as any).__PinchServiceSpawned = true;
        if (this.verboseLogging) {
          log.i("Pinch service instantiated.");
        }
      } else {
        log.e("Failed to instantiate pinch service (null result).");
      }
    } catch (e) {
      log.e("Error instantiating pinch service: " + e);
    }
  }

  // ----------------------------------------------------------------------
  // UI Helpers
  // ----------------------------------------------------------------------

  private resetUI() {
    this.hasStarted = false;
    if (this.welcomeText) {
      this.welcomeText.text = this.defaultWelcomeText;
    }
    this.showStartButton(true);
    this.showButtons(false);
  }

  private showStartButton(visible: boolean) {
    if (!this.startButton) {
      return;
    }
    try {
      const so = this.startButton.getSceneObject
        ? this.startButton.getSceneObject()
        : (this.startButton as any);
      if (so) {
        so.enabled = visible;
      }
    } catch (e) {
      log.e("Failed to toggle start button visibility: " + e);
    }
  }

  private showButtons(visible: boolean) {
    if (this.imageButton && this.imageButton.getSceneObject) {
      this.imageButton.getSceneObject().enabled = visible;
    }
    if (this.textButton && this.textButton.getSceneObject) {
      this.textButton.getSceneObject().enabled = visible;
    }
  }
}
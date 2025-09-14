import { InteractorEvent } from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent";
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger";
const log = new NativeLogger("StartSceneController");

@component
export class EndSceneController extends BaseScriptComponent {
  @ui.separator
  @ui.label("End Scene Configuration")
  @ui.separator
  @ui.group_start("UI References")
  @input
  @hint("Button the user presses to reset the experience")
  private resetButton: Interactable;

  @input
  @hint("Meet new friend text")
  private meetFriendText: Text;
  @input
  @hint("Interact with model instructions")
  private interactWithModelInstructionsText: Text;
  @ui.group_end
  @ui.separator
  @ui.group_start("Start Controller")
  @input
  @hint(
    "Template SceneObject that provides the Start Controller Service (will be cloned on restart). Leave empty if already present in scene."
  )
  private startControllerTemplate: SceneObject;
  @input
  @hint(
    "If true, will only instantiate start controller once even across re-instantiations (tracked globally)."
  )
  private singleInstance: boolean = true;
  @ui.group_end
  @ui.separator
  @ui.group_start("Debug")
  @input
  @hint("Enable verbose logging")
  private verboseLogging: boolean = true;
  @ui.group_end
  private defaultMeetFriendText: string = "Meet your new friend!";
  private defaultInteractWithModelInstructionsText: string =
    "Pinch with one finger to move,\npinch with two fingers to resize";
  private hasStarted: boolean = false;
  private spawnedStartController: SceneObject = null;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      this.captureDefaultState();
      this.initializeButton();
      this.startUI();
      if (this.verboseLogging) {
        log.i("3D model scene initialized");
      }
    });
  }

  // ----------------------------------------------------------------------
  // Initialization
  // ----------------------------------------------------------------------
  private captureDefaultState() {
    if (this.meetFriendText) {
      this.defaultMeetFriendText = this.meetFriendText.text || "";
    }
    if (this.interactWithModelInstructionsText) {
      this.defaultInteractWithModelInstructionsText =
        this.interactWithModelInstructionsText.text || "";
    }
  }

  private initializeButton() {
    if (!this.resetButton) {
      log.e("Reset button not assigned");
      return;
    }
    this.resetButton.onInteractorTriggerStart((event: InteractorEvent) => {
      this.handleResetPressed();
    });
  }

  // ----------------------------------------------------------------------
  // Start Flow
  // ----------------------------------------------------------------------

  private handleResetPressed() {
    if (this.hasStarted) {
      if (this.verboseLogging) {
        log.w("Reset already triggered; ignoring.");
      }
      return;
    }
    this.hasStarted = true;

    // 1. Instantiate / ensure pinch service
    this.instantiateStartController();

    // 2. Clear meet friend + instructions text
    if (this.meetFriendText) {
      this.meetFriendText.text = "";
    }
    if (this.interactWithModelInstructionsText) {
      this.interactWithModelInstructionsText.text = "";
    }

    // 3. Hide reset button
    this.showResetButton(false);

    if (this.verboseLogging) {
      log.i(
        "Experience ended... next experience starting. start controller ready, UI updated."
      );
    }
  }

  // ----------------------------------------------------------------------
  // Start Controller Handling
  // ----------------------------------------------------------------------

  private instantiateStartController() {
    // Use a global flag to prevent multiple instantiations if requested
    if (this.singleInstance && (global as any).__SpawnedStartController) {
      if (this.verboseLogging) {
        log.i("Start service already instantiated (global). Skipping.");
      }
      return;
    }

    if (!this.startControllerTemplate) {
      if (this.verboseLogging) {
        log.w(
          "No start controller provided. Assuming service already exists in scene."
        );
      }
      (global as any).__SpawnedStartController = true;
      return;
    }

    try {
      // Clone / copy hierarchy (API may vary; fallback strategies)
      if ((this.startControllerTemplate as any).copyWholeHierarchy) {
        this.spawnedStartController = (
          this.startControllerTemplate as any
        ).copyWholeHierarchy();
      } else if ((this.startControllerTemplate as any).clone) {
        this.spawnedStartController = (
          this.startControllerTemplate as any
        ).clone();
      } else {
        // Manual create + component copy not implemented; log fallback
        this.spawnedStartController = this.startControllerTemplate;
        if (this.verboseLogging) {
          log.w("Could not clone start template; using original reference.");
        }
      }

      if (this.spawnedStartController) {
        this.spawnedStartController.enabled = true;
        (global as any).__SpawnedStartController = true;
        if (this.verboseLogging) {
          log.i("Start service instantiated.");
        }
      } else {
        log.e("Failed to instantiate start service (null result).");
      }
    } catch (e) {
      log.e("Error instantiating start service: " + e);
    }
  }

  // ----------------------------------------------------------------------
  // UI Helpers
  // ----------------------------------------------------------------------

  private startUI() {
    this.hasStarted = false;
    if (this.meetFriendText) {
      this.meetFriendText.text = this.defaultMeetFriendText;
    }
    if (this.interactWithModelInstructionsText) {
      this.interactWithModelInstructionsText.text =
        this.defaultInteractWithModelInstructionsText;
    }
    this.showResetButton(true);
  }

  private showResetButton(visible: boolean) {
    if (!this.resetButton) {
      return;
    }
    try {
      const so = this.resetButton.getSceneObject
        ? this.resetButton.getSceneObject()
        : (this.resetButton as any);
      if (so) {
        so.enabled = visible;
      }
    } catch (e) {
      log.e("Failed to toggle start button visibility: " + e);
    }
  }
}

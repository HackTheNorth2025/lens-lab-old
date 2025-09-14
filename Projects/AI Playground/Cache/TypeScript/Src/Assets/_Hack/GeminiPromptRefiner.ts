import { Gemini } from "Remote Service Gateway.lspkg/HostedExternal/Gemini";
import { GeminiTypes } from "Remote Service Gateway.lspkg/HostedExternal/GeminiTypes";
import { InteractorEvent } from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent";
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger";
import { Snap3DInteractableFactory } from "./Snap3DInteractableFactory";
import { EndSceneController } from "./End";

const log = new NativeLogger("GeminiPromptRefiner");

@component
export class GeminiPromptRefiner extends BaseScriptComponent {
  @ui.separator
  @ui.label("Gemini Image-to-3D Prompt Refiner")
  @ui.separator
  @ui.group_start("Input Configuration")
  @input
  inputTexture: Texture;

  @input
  @hint("Button to trigger the image analysis")
  private imageButton: Interactable;

  @input
  @hint("Button to trigger the text analysis")
  private textButton: Interactable;

  @input
  @hint("Optional: Display the input image for reference")
  private imageDisplay: Image;
  @ui.group_end
  @ui.separator
  @ui.group_start("Prompt Generation Settings")
  @input
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("Realistic", "realistic"),
      new ComboBoxItem("Cartoon/Animated", "cartoon"),
      new ComboBoxItem("Low Poly", "lowpoly"),
      new ComboBoxItem("Stylized", "stylized"),
      new ComboBoxItem("Photorealistic", "photorealistic"),
    ])
  )
  private modelStyle: string = "realistic";
  @ui.group_end
  @ui.separator
  @ui.group_start("Output Configuration")
  // @input private promptDisplay: Text;
  @input
  private verboseLogging: boolean = true;
  @ui.group_end

  // 🔹 Inputs for object generation
  @ui.separator
  @ui.group_start("3D Object Generation")
  @input
  snap3DFactory: Snap3DInteractableFactory;
  @input targetAnchor: SceneObject;
  @ui.group_end

  // Inputs for end scene controller
  @ui.separator
  @ui.group_start("End controller")
  @input
  @hint(
    "Template SceneObject that provides the end controller (will be cloned on start). Leave empty if already present in scene."
  )
  private endControllerTemplate: EndSceneController;

  @input
  @hint(
    "If true, will only instantiate pinch service once even across re-instantiations (tracked globally)."
  )
  private singleInstance: boolean = true;
  @ui.group_end
  public isProcessing: boolean = false;
  private spawnedEndController: EndSceneController = null;

  // ----------------------------------------------------------------------
  // Lifecycle
  // ----------------------------------------------------------------------

  triggerGenerateScene() {
      this.initializeButton();
      this.setupImageDisplay();
  }

  private initializeButton() {
    if (!this.imageButton) {
      log.e("Analyze button not assigned!");
      return;
    }
    this.imageButton.onInteractorTriggerStart((event: InteractorEvent) => {
      this.analyzeImage(false);
    });
    if (!this.textButton) {
      log.e("Text button not assigned!");
      return;
    }
    this.textButton.onInteractorTriggerStart((event: InteractorEvent) => {
      this.analyzeImage(true);
    });
  }

  public setupImageDisplay() {
    if (this.imageDisplay && this.inputTexture) {
      this.imageDisplay.mainMaterial.mainPass.baseTex = this.inputTexture;
    }
  }

  // ----------------------------------------------------------------------
  // Main Flow
  // ----------------------------------------------------------------------

  private analyzeImage(flag: boolean) {
    if (this.isProcessing) {
      log.w("Already processing. Please wait...");
      return;
    }
    if (!this.inputTexture) {
      log.e("No input texture assigned!");
      // this.updatePromptDisplay("Error: No input texture assigned");
      return;
    }

    this.isProcessing = true;
    // this.updatePromptDisplay("Analyzing image...");
    this.generatePromptFromImage(flag);
  }
  private generatePromptFromImage(flag: boolean) {
    this.textureToBase64(this.inputTexture)
      .then((base64Image: string) => {
        const request: GeminiTypes.Models.GenerateContentRequest = {
          model: "gemini-2.0-flash",
          type: "generateContent",
          body: {
            contents: [
              {
                parts: [
                  {
                    text: flag
                      ? this.createSystemTextPrompt()
                      : this.createSystemPrompt(),
                  },
                ],
                role: "model",
              },
              {
                parts: [
                  { text: this.createUserPrompt() },
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: base64Image,
                    },
                  },
                ],
                role: "user",
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 60, // enough for ~10 phrases
              responseModalities: ["TEXT"],
            },
          },
        };
        return Gemini.models(request);
      })
      .then((response) => {
        this.handleGeminiResponse(response);
      })
      .catch((error) => {
        log.e("Gemini process failed: " + error);
        // this.updatePromptDisplay("Error: " + error);
        this.isProcessing = false;
      });
  }

  private handleGeminiResponse(
    response: GeminiTypes.Models.GenerateContentResponse
  ) {
    if (response.candidates && response.candidates.length > 0) {
      const generatedPrompt =
        response.candidates[0].content.parts[0].text.trim();
      // this.updatePromptDisplay(generatedPrompt);

      // 🔹 Log to console
      log.i("Generated Keywords: " + generatedPrompt);

      // 🔹 Create the 3D object
      if (this.snap3DFactory && this.targetAnchor) {
        const worldPos = this.targetAnchor.getTransform().getWorldPosition();
        this.snap3DFactory
          .createInteractable3DObject(generatedPrompt, worldPos)
          .then((msg) => print("3D Object Created: " + msg))
          .catch((err) => print("3D Object Error: " + err));
        this.handleFinishedGeneration();
      }
    } else {
      log.e("No valid response from Gemini");
      // this.updatePromptDisplay("Error: No response from Gemini");
    }
    this.isProcessing = false;
  }

  // END SCENE
  private handleFinishedGeneration() {
    this.instantiateEndController();

    // TODO: Other button/text interactions (hide image/text buttons)
  }

  private instantiateEndController() {
    if (this.singleInstance && (global as any).__EndControllerSpawned) {
      if (this.verboseLogging) {
        log.i("End controller already instantiated (global). Skipping.");
      }
      return;
    }

    if (!this.endControllerTemplate) {
      if (this.verboseLogging) {
        log.w(
          "No end controller provided. Assuming service already exists in scene."
        );
      }
      (global as any).__EndControllerSpawned = true;
      return;
    }

    try {
      // Clone / copy hierarchy (API may vary; fallback strategies)
      const parent = this.getSceneObject ? this.getSceneObject() : null;
      if ((this.endControllerTemplate as any).copyWholeHierarchy) {
        this.spawnedEndController = (this.endControllerTemplate as any).copyWholeHierarchy(parent);
      } else if ((this.endControllerTemplate as any).clone) {
        this.spawnedEndController = (this.endControllerTemplate as any).clone(parent);
      } else {
        // Manual create + component copy not implemented; log fallback
        this.spawnedEndController = this.endControllerTemplate;
        if (this.verboseLogging) {
          log.w("Could not clone end controller; using original reference.");
        }
      }

      if (this.spawnedEndController) {
        this.spawnedEndController.enabled = true;
        (global as any).__EndControllerSpawned = true;
        if (this.verboseLogging) {
          log.i("End controller instantiated.");
        }
        this.spawnedEndController.triggerEndScene();
      } else {
        log.e("Failed to instantiate end controller (null result).");
      }
    } catch (e) {
      log.e("Error instantiating end controller: " + e);
    }
  }

  // ----------------------------------------------------------------------
  // Prompt Helpers
  // ----------------------------------------------------------------------

  private createSystemPrompt(): string {
    return `You are an expert visual tagger. Your task is to analyze an input image and generate a very short list of descriptive keywords or short phrases. 
        Focus on the most prominent character or object in view; especially if it is a cartoon or other artwork character.

Rules:
- Maximum 10 items.
- Phrases can be 1–4 words long.
- Separate items with commas.
- Do not use full sentences.
- No filler text, no explanations.
- Focus on the most important objects, styles, or visual features, including color.

If you can identify it as a popular cartoon character, just return that character and qualitative descriptions of the character (e.g. color)
Do NOT describe any objects in the background.`;
  }

  private createSystemTextPrompt(): string {
    return `You are an expert visual tagger and reader. Your task is to analyze an input image and generate a very short list of descriptive keywords or short phrases. 
        Focus on any text or lettering that you are able to find, especially that of books or articles.
        You want to create a visualisation of the content of the text, be that a landscape, a scene, or something else like a mathematical formula.
        This visualisation can be arbitrarily large, including surrounding the user.

Rules:
- No filler text, no explanations. 
- Be eloquent and descriptive.
- Focus on the most important objects, styles, or visual features, including color (for example, a fair day can be described as a blue sky and sunny)

Do NOT describe any objects in the background of the image, but you are allowed to describe background objects in the text itself.`;
  }

  private createUserPrompt(): string {
    return `Analyze this image and output up to 10 keywords or short phrases, comma-separated, that best describe the main subject and style. Style should match: ${this.modelStyle}.`;
  }

  // ----------------------------------------------------------------------
  // Utilities
  // ----------------------------------------------------------------------

  // private updatePromptDisplay(text: string) {
  //   if (this.promptDisplay) {
  //     this.promptDisplay.text = text;
  //   }
  //   print("=== GENERATED KEYWORDS/PHRASES ===\n" + text + "\n===========================");
  // }

  private textureToBase64(texture: Texture): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!texture) {
        reject("No texture provided");
        return;
      }
      Base64.encodeTextureAsync(
        texture,
        (encodedString: string) => resolve(encodedString),
        () => reject("Failed to encode texture"),
        CompressionQuality.HighQuality,
        EncodingType.Jpg
      );
    });
  }
}

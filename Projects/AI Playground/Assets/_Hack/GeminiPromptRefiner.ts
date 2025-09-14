import { Gemini } from "Remote Service Gateway.lspkg/HostedExternal/Gemini";
import { GeminiTypes } from "Remote Service Gateway.lspkg/HostedExternal/GeminiTypes";
import { InteractorEvent } from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent";
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger";
import { Snap3DInteractableFactory } from "../Scripts/Snap3DInteractableFactory";

const log = new NativeLogger("GeminiPromptRefiner");

@component
export class GeminiPromptRefiner extends BaseScriptComponent {
  @ui.separator
  @ui.label("Gemini Image-to-3D Prompt Refiner")
  @ui.separator
  @ui.group_start("Input Configuration")
  @input inputTexture: Texture;

  @input
  @hint("Button to trigger the image analysis")
  private analyzeButton: Interactable;

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

  @input private detailLevel: number = 4;
  @input private includeTechnicalSpecs: boolean = true;
  @input private includeMaterials: boolean = true;
  @input private includeLighting: boolean = true;
  @ui.group_end

  @ui.separator
  @ui.group_start("Output Configuration")
  @input private promptDisplay: Text;
  @input private verboseLogging: boolean = true;
  @ui.group_end

  // 🔹 New inputs for object generation
  @ui.separator
  @ui.group_start("3D Object Generation")
  @input snap3DFactory: Snap3DInteractableFactory;
  @input targetAnchor: SceneObject;
  @ui.group_end

  public isProcessing: boolean = false;

  // ----------------------------------------------------------------------
  // Lifecycle
  // ----------------------------------------------------------------------

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      this.initializeButton();
      this.setupImageDisplay();
    });
  }

  private initializeButton() {
    if (!this.analyzeButton) {
      log.e("Analyze button not assigned!");
      return;
    }
    this.analyzeButton.onInteractorTriggerStart((event: InteractorEvent) => {
      this.analyzeImage();
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

  private analyzeImage() {
    if (this.isProcessing) {
      log.w("Already processing an image. Please wait...");
      return;
    }
    if (!this.inputTexture) {
      log.e("No input texture assigned!");
      this.updatePromptDisplay("Error: No input texture assigned");
      return;
    }

    this.isProcessing = true;
    this.updatePromptDisplay("Analyzing image...");
    this.generatePromptFromImage();
  }

  private generatePromptFromImage() {
    this.textureToBase64(this.inputTexture)
      .then((base64Image: string) => {
        const request: GeminiTypes.Models.GenerateContentRequest = {
          model: "gemini-2.0-flash",
          type: "generateContent",
          body: {
            contents: [
              { parts: [{ text: this.createSystemPrompt() }], role: "model" },
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
              maxOutputTokens: 1000,
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
        this.updatePromptDisplay("Error: " + error);
        this.isProcessing = false;
      });
  }

  private handleGeminiResponse(response: GeminiTypes.Models.GenerateContentResponse) {
    if (response.candidates && response.candidates.length > 0) {
      const generatedPrompt = response.candidates[0].content.parts[0].text;
      this.updatePromptDisplay(generatedPrompt);

      // 🔹 Create the 3D object
      if (this.snap3DFactory && this.targetAnchor) {
        const worldPos = this.targetAnchor.getTransform().getWorldPosition();
        this.snap3DFactory
          .createInteractable3DObject(generatedPrompt, worldPos)
          .then((msg) => print("3D Object Created: " + msg))
          .catch((err) => print("3D Object Error: " + err));
      }
    } else {
      log.e("No valid response from Gemini");
      this.updatePromptDisplay("Error: No response from Gemini");
    }
    this.isProcessing = false;
  }

  // ----------------------------------------------------------------------
  // Prompt Helpers
  // ----------------------------------------------------------------------

  private createSystemPrompt(): string {
    const styleInstructions = this.getStyleInstructions();
    const detailInstructions = this.getDetailInstructions();

    return `You are an expert 3D model prompt generator specializing in creating detailed, actionable prompts for 3D model generation. Your task is to analyze an input image and generate a comprehensive prompt that would create an excellent 3D model.

${styleInstructions}

${detailInstructions}

Your generated prompt should:
1. Be highly descriptive and specific
2. Include technical details for 3D modeling
3. Specify materials, textures, and surface properties
4. Describe lighting and environmental context
5. Include geometric details and proportions
6. Be optimized for 3D model generation APIs
7. Be between 100-300 words for optimal results

Focus on creating a prompt that would result in a high-quality 3D model that closely matches the input image.`;
  }

  private createUserPrompt(): string {
    let prompt =
      "Analyze this image and generate a detailed 3D model generation prompt. Focus on the most prominent character or object in view; especially if it is a cartoon or other artwork character. ";

    if (this.includeTechnicalSpecs) {
      prompt +=
        "Include technical specifications like polygon count, topology, and geometric details. ";
    }

    if (this.includeMaterials) {
      prompt +=
        "Describe materials, textures, surface properties, and color information. ";
    }

    if (this.includeLighting) {
      prompt += "Include lighting conditions and environmental context. ";
    }

    prompt += `The model should be in ${this.modelStyle} style.`;

    return prompt;
  }

  private getStyleInstructions(): string {
    const styleMap = {
      realistic:
        "Generate a realistic 3D model prompt with photorealistic materials, accurate proportions, and natural lighting.",
      cartoon:
        "Generate a stylized cartoon/animated 3D model prompt with simplified geometry, vibrant colors, and exaggerated features.",
      lowpoly:
        "Generate a low-poly 3D model prompt with minimal geometry, flat shading, and geometric simplicity.",
      stylized:
        "Generate a stylized 3D model prompt with artistic interpretation, unique proportions, and creative materials.",
      photorealistic:
        "Generate a photorealistic 3D model prompt with ultra-high detail, realistic materials, and accurate lighting.",
    };
    return styleMap[this.modelStyle] || styleMap["realistic"];
  }

  private getDetailInstructions(): string {
    const detailMap = {
      1: "Keep the prompt simple and basic, focusing on main shapes and colors.",
      2: "Include moderate detail with basic materials and simple geometry descriptions.",
      3: "Provide good detail with material descriptions, basic lighting, and geometric specifics.",
      4: "Give comprehensive detail with full material descriptions, lighting context, and detailed geometry.",
      5: "Provide extremely detailed descriptions with technical specifications, advanced materials, and precise geometric details.",
    };
    return detailMap[this.detailLevel] || detailMap[4];
  }

  // ----------------------------------------------------------------------
  // Utilities
  // ----------------------------------------------------------------------

  private updatePromptDisplay(text: string) {
    if (this.promptDisplay) {
      this.promptDisplay.text = text;
    }
    print("=== GENERATED 3D PROMPT ===\n" + text + "\n===========================");
  }

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

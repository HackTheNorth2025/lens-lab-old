import { Gemini } from "Remote Service Gateway.lspkg/HostedExternal/Gemini";
import { GeminiTypes } from "Remote Service Gateway.lspkg/HostedExternal/GeminiTypes";
import { InteractorEvent } from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent";
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger";

const log = new NativeLogger("GeminiPromptRefiner");

@component
export class GeminiPromptRefiner extends BaseScriptComponent {
  @ui.separator
  @ui.label("Gemini Image-to-3D Prompt Refiner")
  @ui.separator
  @ui.group_start("Input Configuration")
  @input
  @hint("Drag and drop a texture here to analyze")
  private inputTexture: Texture;

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
  @hint("Style preference for 3D model generation")
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

  @input
  @hint("Detail level for the generated prompt")
  @widget(new SliderWidget(1, 5, 1))
  private detailLevel: number = 4;

  @input
  @hint("Include technical specifications in the prompt")
  private includeTechnicalSpecs: boolean = true;

  @input
  @hint("Include material and texture descriptions")
  private includeMaterials: boolean = true;

  @input
  @hint("Include lighting and environment context")
  private includeLighting: boolean = true;
  @ui.group_end
  @ui.separator
  @ui.group_start("Output Configuration")
  @input
  @hint("Text component to display the generated prompt")
  private promptDisplay: Text;

  @input
  @hint("Show detailed analysis in console logs")
  private verboseLogging: boolean = true;
  @ui.group_end
  private isProcessing: boolean = false;

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

  private setupImageDisplay() {
    if (this.imageDisplay && this.inputTexture) {
      this.imageDisplay.mainMaterial.mainPass.baseTex = this.inputTexture;
    }
  }

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

    if (this.verboseLogging) {
      log.d("Starting image analysis with Gemini...");
      log.d(`Model style: ${this.modelStyle}`);
      log.d(`Detail level: ${this.detailLevel}`);
    }

    this.generatePromptFromImage();
  }

  private generatePromptFromImage() {
    // Convert texture to base64 for Gemini API
    const base64Image = this.textureToBase64(this.inputTexture);

    if (!base64Image) {
      log.e("Failed to convert texture to base64");
      this.updatePromptDisplay("Error: Failed to process image");
      this.isProcessing = false;
      return;
    }

    // Create the Gemini request
    const request: GeminiTypes.Models.GenerateContentRequest = {
      model: "gemini-2.0-flash",
      type: "generateContent",
      body: {
        contents: [
          {
            parts: [
              {
                text: this.createSystemPrompt(),
              },
            ],
            role: "model",
          },
          {
            parts: [
              {
                text: this.createUserPrompt(),
              },
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

    // Send request to Gemini
    Gemini.models(request)
      .then((response) => {
        this.handleGeminiResponse(response);
      })
      .catch((error) => {
        this.handleGeminiError(error);
      });
  }

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
      "Analyze this image and generate a detailed 3D model generation prompt. ";

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

  private handleGeminiResponse(
    response: GeminiTypes.Models.GenerateContentResponse
  ) {
    if (response.candidates && response.candidates.length > 0) {
      const generatedPrompt = response.candidates[0].content.parts[0].text;

      if (this.verboseLogging) {
        log.d("=== GEMINI RESPONSE ===");
        log.d("Generated Prompt:");
        log.d(generatedPrompt);
        log.d("=======================");
      }

      this.updatePromptDisplay(generatedPrompt);
      this.logPromptDetails(generatedPrompt);
    } else {
      log.e("No valid response from Gemini");
      this.updatePromptDisplay("Error: No response from Gemini");
    }

    this.isProcessing = false;
  }

  private handleGeminiError(error: any) {
    log.e("Gemini API Error: " + error);
    this.updatePromptDisplay("Error: " + error);
    this.isProcessing = false;
  }

  private updatePromptDisplay(text: string) {
    if (this.promptDisplay) {
      this.promptDisplay.text = text;
    }

    // Also log to console
    print("=== GENERATED 3D PROMPT ===");
    print(text);
    print("===========================");
  }

  private logPromptDetails(prompt: string) {
    if (this.verboseLogging) {
      const wordCount = prompt.split(" ").length;
      const charCount = prompt.length;

      log.d(`Prompt Statistics:`);
      log.d(`- Word count: ${wordCount}`);
      log.d(`- Character count: ${charCount}`);
      log.d(`- Style: ${this.modelStyle}`);
      log.d(`- Detail level: ${this.detailLevel}`);
      log.d(`- Technical specs included: ${this.includeTechnicalSpecs}`);
      log.d(`- Materials included: ${this.includeMaterials}`);
      log.d(`- Lighting included: ${this.includeLighting}`);
    }
  }

  private textureToBase64(texture: Texture): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!texture) {
        log.e("No texture provided for base64 conversion");
        reject("No texture provided");
        return;
      }

      log.d("Converting texture to base64...");

      // Use the proper Lens Studio Base64 API
      Base64.encodeTextureAsync(
        texture,
        (encodedString: string) => {
          log.d("Texture successfully encoded to base64");
          resolve(encodedString);
        },
        (error: any) => {
          log.e("Error encoding texture to base64: " + error);
          reject(error);
        },
        CompressionQuality.HighQuality,
        EncodingType.Jpeg
      );
    });
  }

  // Public method to manually trigger analysis (useful for testing)
  public analyzeImageManually() {
    this.analyzeImage();
  }

  // Public method to update settings
  public updateSettings(
    style: string,
    detail: number,
    technical: boolean,
    materials: boolean,
    lighting: boolean
  ) {
    this.modelStyle = style;
    this.detailLevel = detail;
    this.includeTechnicalSpecs = technical;
    this.includeMaterials = materials;
    this.includeLighting = lighting;

    log.d("Settings updated:");
    log.d(`- Style: ${style}`);
    log.d(`- Detail: ${detail}`);
    log.d(`- Technical: ${technical}`);
    log.d(`- Materials: ${materials}`);
    log.d(`- Lighting: ${lighting}`);
  }

  // Public method to get current settings
  public getCurrentSettings() {
    return {
      modelStyle: this.modelStyle,
      detailLevel: this.detailLevel,
      includeTechnicalSpecs: this.includeTechnicalSpecs,
      includeMaterials: this.includeMaterials,
      includeLighting: this.includeLighting,
    };
  }
}

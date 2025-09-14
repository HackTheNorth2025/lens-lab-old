"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiPromptRefiner = void 0;
var __selfType = requireType("./GeminiPromptRefiner");
function component(target) { target.getTypeName = function () { return __selfType; }; }
const Gemini_1 = require("Remote Service Gateway.lspkg/HostedExternal/Gemini");
const NativeLogger_1 = require("SpectaclesInteractionKit.lspkg/Utils/NativeLogger");
const log = new NativeLogger_1.default("GeminiPromptRefiner");
let GeminiPromptRefiner = class GeminiPromptRefiner extends BaseScriptComponent {
    // ----------------------------------------------------------------------
    // Lifecycle
    // ----------------------------------------------------------------------
    onAwake() {
        this.createEvent("OnStartEvent").bind(() => {
            this.initializeButton();
            this.setupImageDisplay();
        });
    }
    initializeButton() {
        if (!this.analyzeButton) {
            log.e("Analyze button not assigned!");
            return;
        }
        this.analyzeButton.onInteractorTriggerStart((event) => {
            this.analyzeImage();
        });
    }
    setupImageDisplay() {
        if (this.imageDisplay && this.inputTexture) {
            this.imageDisplay.mainMaterial.mainPass.baseTex = this.inputTexture;
        }
    }
    // ----------------------------------------------------------------------
    // Main Flow
    // ----------------------------------------------------------------------
    analyzeImage() {
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
    generatePromptFromImage() {
        this.textureToBase64(this.inputTexture)
            .then((base64Image) => {
            const request = {
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
            return Gemini_1.Gemini.models(request);
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
    handleGeminiResponse(response) {
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
        }
        else {
            log.e("No valid response from Gemini");
            this.updatePromptDisplay("Error: No response from Gemini");
        }
        this.isProcessing = false;
    }
    // ----------------------------------------------------------------------
    // Prompt Helpers
    // ----------------------------------------------------------------------
    createSystemPrompt() {
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
    createUserPrompt() {
        let prompt = "Analyze this image and generate a detailed 3D model generation prompt. Focus on the most prominent character or object in view; especially if it is a cartoon or other artwork character. ";
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
    getStyleInstructions() {
        const styleMap = {
            realistic: "Generate a realistic 3D model prompt with photorealistic materials, accurate proportions, and natural lighting.",
            cartoon: "Generate a stylized cartoon/animated 3D model prompt with simplified geometry, vibrant colors, and exaggerated features.",
            lowpoly: "Generate a low-poly 3D model prompt with minimal geometry, flat shading, and geometric simplicity.",
            stylized: "Generate a stylized 3D model prompt with artistic interpretation, unique proportions, and creative materials.",
            photorealistic: "Generate a photorealistic 3D model prompt with ultra-high detail, realistic materials, and accurate lighting.",
        };
        return styleMap[this.modelStyle] || styleMap["realistic"];
    }
    getDetailInstructions() {
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
    updatePromptDisplay(text) {
        if (this.promptDisplay) {
            this.promptDisplay.text = text;
        }
        print("=== GENERATED 3D PROMPT ===\n" + text + "\n===========================");
    }
    textureToBase64(texture) {
        return new Promise((resolve, reject) => {
            if (!texture) {
                reject("No texture provided");
                return;
            }
            Base64.encodeTextureAsync(texture, (encodedString) => resolve(encodedString), () => reject("Failed to encode texture"), CompressionQuality.HighQuality, EncodingType.Jpg);
        });
    }
    __initialize() {
        super.__initialize();
        this.isProcessing = false;
    }
};
exports.GeminiPromptRefiner = GeminiPromptRefiner;
exports.GeminiPromptRefiner = GeminiPromptRefiner = __decorate([
    component
], GeminiPromptRefiner);
//# sourceMappingURL=GeminiPromptRefiner.js.map
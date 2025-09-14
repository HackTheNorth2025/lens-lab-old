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
        if (this.verboseLogging) {
            log.d("Starting image analysis with Gemini...");
            log.d(`Model style: ${this.modelStyle}`);
            log.d(`Detail level: ${this.detailLevel}`);
        }
        this.generatePromptFromImage();
    }
    generatePromptFromImage() {
        // Convert texture to base64 for Gemini API
        this.textureToBase64(this.inputTexture)
            .then((base64Image) => {
            // Create the Gemini request
            const request = {
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
            return Gemini_1.Gemini.models(request);
        })
            .then((response) => {
            this.handleGeminiResponse(response);
        })
            .catch((error) => {
            log.e("Failed to convert texture to base64 or process with Gemini: " + error);
            this.updatePromptDisplay("Error: Failed to process image - " + error);
            this.isProcessing = false;
        });
    }
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
    handleGeminiResponse(response) {
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
        }
        else {
            log.e("No valid response from Gemini");
            this.updatePromptDisplay("Error: No response from Gemini");
        }
        this.isProcessing = false;
    }
    handleGeminiError(error) {
        log.e("Gemini API Error: " + error);
        this.updatePromptDisplay("Error: " + error);
        this.isProcessing = false;
    }
    updatePromptDisplay(text) {
        if (this.promptDisplay) {
            this.promptDisplay.text = text;
        }
        // Also log to console
        print("=== GENERATED 3D PROMPT ===");
        print(text);
        print("===========================");
    }
    logPromptDetails(prompt) {
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
    textureToBase64(texture) {
        return new Promise((resolve, reject) => {
            if (!texture) {
                log.e("No texture provided for base64 conversion");
                reject("No texture provided");
                return;
            }
            log.d("Converting texture to base64...");
            // Use the proper Lens Studio Base64 API
            Base64.encodeTextureAsync(texture, (encodedString) => {
                log.d("Texture successfully encoded to base64");
                resolve(encodedString);
            }, () => {
                log.e("Error encoding texture to base64");
                reject("Failed to encode texture");
            }, CompressionQuality.HighQuality, EncodingType.Jpg);
        });
    }
    // Public method to manually trigger analysis (useful for testing)
    analyzeImageManually() {
        this.analyzeImage();
    }
    // Public method to update settings
    updateSettings(style, detail, technical, materials, lighting) {
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
    getCurrentSettings() {
        return {
            modelStyle: this.modelStyle,
            detailLevel: this.detailLevel,
            includeTechnicalSpecs: this.includeTechnicalSpecs,
            includeMaterials: this.includeMaterials,
            includeLighting: this.includeLighting,
        };
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
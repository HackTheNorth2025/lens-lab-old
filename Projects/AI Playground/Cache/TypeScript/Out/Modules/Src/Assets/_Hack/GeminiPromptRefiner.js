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
                        maxOutputTokens: 60, // enough for ~10 phrases
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
            const generatedPrompt = response.candidates[0].content.parts[0].text.trim();
            this.updatePromptDisplay(generatedPrompt);
            // 🔹 Log to console
            log.i("Generated Keywords: " + generatedPrompt);
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
        return `You are an expert visual tagger. Your task is to analyze an input image and generate a very short list of descriptive keywords or short phrases. Focus on the most prominent character or object in view; especially if it is a cartoon or other artwork character.

Rules:
- Maximum 10 items.
- Phrases can be 1–4 words long.
- Separate items with commas.
- Do not use full sentences.
- No filler text, no explanations.
- Focus on the most important objects, styles, or visual features.
- If you can identify it as a popular cartoon character, just output that character and some qualitative descriptions (e.g. color, fluffiness, etc.)`;
    }
    createUserPrompt() {
        return `Analyze this image and output up to 10 keywords or short phrases, comma-separated, that best describe the main subject and style. Style should match: ${this.modelStyle}.`;
    }
    // ----------------------------------------------------------------------
    // Utilities
    // ----------------------------------------------------------------------
    updatePromptDisplay(text) {
        if (this.promptDisplay) {
            this.promptDisplay.text = text;
        }
        print("=== GENERATED KEYWORDS/PHRASES ===\n" + text + "\n===========================");
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
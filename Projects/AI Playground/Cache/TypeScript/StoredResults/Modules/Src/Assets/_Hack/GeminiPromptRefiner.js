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
    triggerGenerateScene() {
        this.initializeButton();
        this.setupImageDisplay();
    }
    initializeButton() {
        if (!this.imageButton) {
            log.e("Analyze button not assigned!");
            return;
        }
        this.imageButton.onInteractorTriggerStart((event) => {
            this.analyzeImage(false);
        });
        if (!this.textButton) {
            log.e("Text button not assigned!");
            return;
        }
        this.textButton.onInteractorTriggerStart((event) => {
            this.analyzeImage(true);
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
    analyzeImage(flag) {
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
    generatePromptFromImage(flag) {
        this.textureToBase64(this.inputTexture)
            .then((base64Image) => {
            const request = {
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
            return Gemini_1.Gemini.models(request);
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
    handleGeminiResponse(response) {
        if (response.candidates && response.candidates.length > 0) {
            const generatedPrompt = response.candidates[0].content.parts[0].text.trim();
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
        }
        else {
            log.e("No valid response from Gemini");
            // this.updatePromptDisplay("Error: No response from Gemini");
        }
        this.isProcessing = false;
    }
    // END SCENE
    handleFinishedGeneration() {
        this.instantiateEndController();
        // TODO: Other button/text interactions (hide image/text buttons)
    }
    instantiateEndController() {
        if (this.singleInstance && global.__EndControllerSpawned) {
            if (this.verboseLogging) {
                log.i("End controller already instantiated (global). Skipping.");
            }
            return;
        }
        if (!this.endControllerTemplate) {
            if (this.verboseLogging) {
                log.w("No end controller provided. Assuming service already exists in scene.");
            }
            global.__EndControllerSpawned = true;
            return;
        }
        try {
            // Clone / copy hierarchy (API may vary; fallback strategies)
            const parent = this.getSceneObject ? this.getSceneObject() : null;
            if (this.endControllerTemplate.copyWholeHierarchy) {
                this.spawnedEndController = this.endControllerTemplate.copyWholeHierarchy(parent);
            }
            else if (this.endControllerTemplate.clone) {
                this.spawnedEndController = this.endControllerTemplate.clone(parent);
            }
            else {
                // Manual create + component copy not implemented; log fallback
                this.spawnedEndController = this.endControllerTemplate;
                if (this.verboseLogging) {
                    log.w("Could not clone end controller; using original reference.");
                }
            }
            if (this.spawnedEndController) {
                this.spawnedEndController.enabled = true;
                global.__EndControllerSpawned = true;
                if (this.verboseLogging) {
                    log.i("End controller instantiated.");
                }
                this.spawnedEndController.triggerEndScene();
            }
            else {
                log.e("Failed to instantiate end controller (null result).");
            }
        }
        catch (e) {
            log.e("Error instantiating end controller: " + e);
        }
    }
    // ----------------------------------------------------------------------
    // Prompt Helpers
    // ----------------------------------------------------------------------
    createSystemPrompt() {
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
    createSystemTextPrompt() {
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
    createUserPrompt() {
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
        this.spawnedEndController = null;
    }
};
exports.GeminiPromptRefiner = GeminiPromptRefiner;
exports.GeminiPromptRefiner = GeminiPromptRefiner = __decorate([
    component
], GeminiPromptRefiner);
//# sourceMappingURL=GeminiPromptRefiner.js.map
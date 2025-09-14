import { GeminiPromptRefiner } from "../_Hack/GeminiPromptRefiner";

@component
export class PinchService extends BaseScriptComponent {
    @input private cameraModule: CameraModule;
    
    private camera: ImageRequest;
    private flag: boolean = false;
    
    @input private gemini : GeminiPromptRefiner;
    
    onAwake() {
        this.camera = CameraModule.createImageRequest();
        print('Image request created');
    }
    
    async pinchDetected() {

        

        if (!this.flag && !this.gemini.isProcessing) {
            print('Pinch received');
            this.flag = true;
            
            print('Capturing screen');
            const imageFrame = await this.cameraModule.requestImage(this.camera);
            
            this.gemini.inputTexture = imageFrame.texture;
            this.gemini.setupImageDisplay();
            
            this.flag = false;
        }
    }
}

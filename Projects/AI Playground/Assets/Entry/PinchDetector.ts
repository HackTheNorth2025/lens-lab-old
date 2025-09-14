import { GeminiPromptRefiner } from "../_Hack/GeminiPromptRefiner";
import {PinchService} from './PinchService';

@component
export class PinchDetector extends BaseScriptComponent {
    @input private pinchService: PinchService;
    @input defaultTexture: Texture;
    
    @input private gemini : GeminiPromptRefiner;

    private gestureModule: GestureModule = require('LensStudio:GestureModule');
    onAwake() {
        this.gestureModule
          .getPinchUpEvent(GestureModule.HandType.Left)
          .add((pinchDownArgs: PinchDownArgs) => {
            print('Undoing capture');
            this.gemini.inputTexture = this.defaultTexture;
            this.gemini.setupImageDisplay();
          });

        this.gestureModule
          .getPinchDownEvent(GestureModule.HandType.Left)
          .add((pinchUpArgs: PinchUpArgs) => {
            this.pinchService.pinchDetected();
          });
    }
}   
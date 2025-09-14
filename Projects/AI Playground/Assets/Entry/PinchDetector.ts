import {PinchService} from './PinchService';

@component
export class PinchDetector extends BaseScriptComponent {
    @input private pinchService: PinchService;

    private gestureModule: GestureModule = require('LensStudio:GestureModule');
    onAwake() {
        this.gestureModule
          .getPinchDownEvent(GestureModule.HandType.Right)
          .add((pinchDownArgs: PinchDownArgs) => {
            print('Right Hand Pinch Down');
          });
        
        this.gestureModule
          .getPinchUpEvent(GestureModule.HandType.Right)
          .add((pinchUpArgs: PinchUpArgs) => {
            this.pinchService.pinchDetected();
          });
    }
}
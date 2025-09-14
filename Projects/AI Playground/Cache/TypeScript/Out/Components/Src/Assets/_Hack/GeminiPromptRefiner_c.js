if (script.onAwake) {
	script.onAwake();
	return;
};
function checkUndefined(property, showIfData){
   for (var i = 0; i < showIfData.length; i++){
       if (showIfData[i][0] && script[showIfData[i][0]] != showIfData[i][1]){
           return;
       }
   }
   if (script[property] == undefined){
      throw new Error('Input ' + property + ' was not provided for the object ' + script.getSceneObject().name);
   }
}
// @ui {"widget":"separator"}
// @ui {"widget":"label", "label":"Gemini Image-to-3D Prompt Refiner"}
// @ui {"widget":"separator"}
// @ui {"widget":"group_start", "label":"Input Configuration"}
// @input Asset.Texture inputTexture
// @input AssignableType analyzeButton {"hint":"Button to trigger the image analysis"}
// @input AssignableType_1 analyzeTextButton {"hint":"Button to trigger the text analysis"}
// @input Component.Image imageDisplay {"hint":"Optional: Display the input image for reference"}
// @ui {"widget":"group_end"}
// @ui {"widget":"separator"}
// @ui {"widget":"group_start", "label":"Prompt Generation Settings"}
// @input string modelStyle = "realistic" {"widget":"combobox", "values":[{"label":"Realistic", "value":"realistic"}, {"label":"Cartoon/Animated", "value":"cartoon"}, {"label":"Low Poly", "value":"lowpoly"}, {"label":"Stylized", "value":"stylized"}, {"label":"Photorealistic", "value":"photorealistic"}]}
// @ui {"widget":"group_end"}
// @ui {"widget":"separator"}
// @ui {"widget":"group_start", "label":"Output Configuration"}
// @input Component.Text promptDisplay
// @input bool verboseLogging = true
// @ui {"widget":"group_end"}
// @ui {"widget":"separator"}
// @ui {"widget":"group_start", "label":"3D Object Generation"}
// @input AssignableType_2 snap3DFactory
// @input SceneObject targetAnchor
// @ui {"widget":"group_end"}
var scriptPrototype = Object.getPrototypeOf(script);
if (!global.BaseScriptComponent){
   function BaseScriptComponent(){}
   global.BaseScriptComponent = BaseScriptComponent;
   global.BaseScriptComponent.prototype = scriptPrototype;
   global.BaseScriptComponent.prototype.__initialize = function(){};
   global.BaseScriptComponent.getTypeName = function(){
       throw new Error("Cannot get type name from the class, not decorated with @component");
   }
}
var Module = require("../../../../Modules/Src/Assets/_Hack/GeminiPromptRefiner");
Object.setPrototypeOf(script, Module.GeminiPromptRefiner.prototype);
script.__initialize();
let awakeEvent = script.createEvent("OnAwakeEvent");
awakeEvent.bind(() => {
    checkUndefined("inputTexture", []);
    checkUndefined("analyzeButton", []);
    checkUndefined("analyzeTextButton", []);
    checkUndefined("imageDisplay", []);
    checkUndefined("modelStyle", []);
    checkUndefined("promptDisplay", []);
    checkUndefined("verboseLogging", []);
    checkUndefined("snap3DFactory", []);
    checkUndefined("targetAnchor", []);
    if (script.onAwake) {
       script.onAwake();
    }
});

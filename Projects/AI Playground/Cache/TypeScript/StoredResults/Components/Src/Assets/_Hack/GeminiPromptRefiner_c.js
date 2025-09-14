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
// @input AssignableType analyzeButton {"hint":"Button to trigger the image analysis"}
// @input Component.Image imageDisplay {"hint":"Optional: Display the input image for reference"}
// @ui {"widget":"group_end"}
// @ui {"widget":"separator"}
// @ui {"widget":"group_start", "label":"Prompt Generation Settings"}
// @input string modelStyle = "realistic" {"hint":"Style preference for 3D model generation", "widget":"combobox", "values":[{"label":"Realistic", "value":"realistic"}, {"label":"Cartoon/Animated", "value":"cartoon"}, {"label":"Low Poly", "value":"lowpoly"}, {"label":"Stylized", "value":"stylized"}, {"label":"Photorealistic", "value":"photorealistic"}]}
// @input float detailLevel = 4 {"hint":"Detail level for the generated prompt", "widget":"slider", "min":1, "max":5, "step":1}
// @input bool includeTechnicalSpecs = true {"hint":"Include technical specifications in the prompt"}
// @input bool includeMaterials = true {"hint":"Include material and texture descriptions"}
// @input bool includeLighting = true {"hint":"Include lighting and environment context"}
// @ui {"widget":"group_end"}
// @ui {"widget":"separator"}
// @ui {"widget":"group_start", "label":"Output Configuration"}
// @input Component.Text promptDisplay {"hint":"Text component to display the generated prompt"}
// @input bool verboseLogging = true {"hint":"Show detailed analysis in console logs"}
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
    checkUndefined("analyzeButton", []);
    checkUndefined("imageDisplay", []);
    checkUndefined("modelStyle", []);
    checkUndefined("detailLevel", []);
    checkUndefined("includeTechnicalSpecs", []);
    checkUndefined("includeMaterials", []);
    checkUndefined("includeLighting", []);
    checkUndefined("promptDisplay", []);
    checkUndefined("verboseLogging", []);
    if (script.onAwake) {
       script.onAwake();
    }
});

## Inspiration  
Purple crayon? Helping with realizing one's imagination, bringing a more flat world to an interactive one could be helpful with.  

## What it does  
Turns 2D objects/images of text into 3D (brings them to life for a more immersive/interactive experience with the objects).  

## How we built it  
Snap AR Spectacles, Lens Studio, TypeScript. Developed a pipeline where, based on a gesture, users capture what they see – then the image is passed through a parser which generates a prompt for the Snap3D API to generate a 3D object model of that image (e.g. black cat).  

## Challenges we ran into  
Since this was the first time developing an AR app for all of us, the technology that we used was relatively unfamiliar. Our main challenge initially was getting accustomed to Lens Studio, the platform used to develop the product. It also took a few iterations to set up the initial independent behaviour we wanted to implement, such as capturing the user's real-time view and building the pipeline of taking in an image input and generating a prompt description.  

## Accomplishments that we're proud of  
After some prompt refining and understanding the preferred prompting style for Snap3D object generation, we landed on a model that generates a relatively accurate 3D model of the image captured in the user's line of sight, which the user can then interact with in real time.  

- Proud of the accuracy of the 3D object generator, especially since it involves multiple steps of parsing before the 3D model is generated.  
- Works well even with an image that's relatively far away from the focus character.  
- Added additional features on top of the core pipeline.  

## What we learned  
Game engines / game engine equivalents are not for the weak.  

## What's next for LensLab  
- More interactive/immersive features.  
- Restoring previous companions/models from a database.  

## Built With  
- lens-studio  
- snap-ar  
- snap-spectacles  
- typescript  

## Try it out

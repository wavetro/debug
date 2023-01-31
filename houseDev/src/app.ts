import { Engine, Scene, Vector3, Mesh, HemisphericLight, AmmoJSPlugin, SceneLoader, ArcRotateCamera, MeshBuilder, StandardMaterial, Color3, PhysicsImpostor, AbstractMesh, PhysicsImpostorParameters, Matrix} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import 'ammojs-typed';

//////////////////////////////////////
// ABOVE: Imports
//////////////////////////////////////
// BELOW: Setup
//////////////////////////////////////

const App = async function() {

    // Create a canvas element and enable the engine (along with AdaptToDeviceRatio despite performance hit)
    const _canvas: HTMLCanvasElement = document.createElement("canvas");
    document.body.appendChild(_canvas);
    const _engine: Engine  = new Engine(_canvas, true, null, true);
    Engine.audioEngine.useCustomUnlockedButton = true; // disable automatic mute icon

    // Initialize base scene and camera pointed at scene origin
    const scene01: Scene = new Scene(_engine);
    scene01.useRightHandedSystem = true; // use the "handedness" of the GLTF to make life easier for the loader
    const camera01: ArcRotateCamera = new ArcRotateCamera("cam01", 2*Math.PI, Math.PI/2, 3, new Vector3(0, 1, 0), scene01);
    camera01.fov = 1;

    // Change the sky to dark gray
    const skyBox: Mesh = MeshBuilder.CreateBox("sky", {size:1000.0}, scene01);
    const skyMaterial: StandardMaterial = new StandardMaterial("sky", scene01);
    skyMaterial.backFaceCulling = false;
	skyMaterial.diffuseColor = new Color3(0.192, 0.192, 0.192); // #313131
	skyBox.material = skyMaterial;

    // Makeshift global illumination
    const globalLightA: HemisphericLight = new HemisphericLight("GlobalLightA", new Vector3(0, 2, 2), scene01);
    const globalLightB: HemisphericLight = new HemisphericLight("GlobalLightB", new Vector3(0, -2, -2), scene01);
    globalLightA.intensity = 2;
    globalLightB.intensity = 0.2;

    // Set up our Ammo.js physics engine (fuck you Cannon.js)
    //window.Ammo = await Ammo();
    //scene01.enablePhysics(new Vector3(0, -9.81, 0), new AmmoJSPlugin(true, window.Ammo));
    
    // Import our GLB and use destructuring to grab its meshes
    const {meshes} = await SceneLoader.ImportMeshAsync('', "./files/", "house.glb", scene01);

    // Now for every mesh...
    meshes.forEach(mesh => {
        if (mesh.parent) { // grab its parent (if it exists)
            
            if(mesh instanceof Mesh){
                const parentTransform: Matrix = mesh.parent.getWorldMatrix(); // store its parent's world coordinates in a variable
                mesh.bakeTransformIntoVertices(parentTransform); // directly apply the coordinates to the object
            }

            mesh.parent = null; // discard the parent now that the (child) mesh's transformation is applied

            if (mesh.name !== 'house') { // and give the object a collider (excluding the house)
                addImpostor(scene01, mesh, PhysicsImpostor.BoxImpostor, { mass: 1, friction: 0.5, restitution: 0 });
            } else { // (the house gets a mesh collider instead)
                addImpostor(scene01, mesh, PhysicsImpostor.MeshImpostor, { mass: 0 })
            }
        }
    });

    // put an invisible wall so things don't fly out the front
    const invisWall: Mesh = MeshBuilder.CreateBox("invisWallFront", { height: 2, width: 2, depth: 0.05 });
    invisWall.rotation.y = Math.PI / 2;
    invisWall.position = new Vector3(0.5, 1, 0);
    addImpostor(scene01, invisWall, PhysicsImpostor.BoxImpostor, { mass: 0 });
    invisWall.layerMask = 0x10000000;

    scene01.getMeshByName("__root__").dispose(); // don't need this anymore!

    //////////////////////////////////////
    // ABOVE: Setup
    //////////////////////////////////////
    // BELOW: Optimization 
    ////////////////////////////////////// https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene

    scene01.skipPointerMovePicking = true; // disable checking raycasted selections of meshes under pointer
    scene01.autoClear = false; // disables unnecessary computations for transparent canvases
    scene01.autoClearDepthAndStencil = false; // (use .setRenderingAutoClearDepthStencil() if you have RenderingGroups)
    scene01.blockMaterialDirtyMechanism = true; // disable flagging dirty materials that need changing if you aren't busy updating them

    //////////////////////////////////////
    // ABOVE: Optimization
    //////////////////////////////////////
    // BELOW: Frame Updates
    //////////////////////////////////////

    // On every frame...
    _engine.runRenderLoop(() => { 
        // Render our (only) scene
        scene01.render(); 
    });
    
    // Resize camera to fit window
    window.addEventListener('resize', () => { _engine.resize(); });
};

/////////////////////////
/////// FUNCTIONS & PRE-SETUP
/////////////////////////

// Thank you Babylon forums for showing the proper way to do this because the .GLTF/.GLB parenting screws up physics (https://forum.babylonjs.com/t/loading-gltf-and-physics-not-working-what-am-i-missing/4878)
function addImpostor(scene: Scene, mesh: AbstractMesh, impostor: number, options: PhysicsImpostorParameters) {
    
    if (mesh == null) { return; } // exit if the mesh doesn't exist

    mesh.checkCollisions = false; // disable Babylon's default mesh collision checker because the physics will do it for us

    mesh.physicsImpostor = new PhysicsImpostor(mesh, impostor, options, scene); // creates the mesh's collider/hitbox
};

App();
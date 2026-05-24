import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

const CONFIG = {
  HEIGHT: window.innerHeight,
  WIDTH: window.innerWidth,
  
  BASE_ROTATION_SPEED: 1,

  TESSERACT: {
    MODEL_ID: "tesseract",

    ROTATION_SPEED: 1,

    OUTER_CUBE_SCALE: 10,
    INNER_CUBE_SCALE: 5,

    OUTER_CUBE_SCALE_SPEED: 1,
    INNER_CUBE_SCALE_SPEED: 1.5,

    OUTER_CUBE_COLOUR: new THREE.Color(0x00ff00),
    INNER_CUBE_COLOUR: new THREE.Color(0x00ff00),
  },

  BUNNY: {
    MODEL_ID: "bunny",

    ROTATION_SPEED: 1,

    SCALE: new THREE.Vector3(5, 5, 5),
  },
  ARTEMIS: {
    MODEL_ID: "artemis",
    ROTATION_SPEED: 10,
  },

  POSITION: {
    OUT_OF_SCENE_POS: new THREE.Vector3(100, 100, -100),
    IN_SCENE_POS: new THREE.Vector3(0, 0, 0),
  },

  LIGHT: {
    // Light shades
    POINT_LIGHT_SHADE: new THREE.Color(0xffffff),
    SPOTLIGHT_SHADE: new THREE.Color(0xffffff),
    DIRECTIONAL_LIGHT_SHADE: new THREE.Color(0xffffff),
    AMBIENT_LIGHT_SHADE: new THREE.Color(0xffffff), 

    // Light positions (relative in case of point and spotlights)
    POINT_LIGHT_1_POS: new THREE.Vector3(100, 100, 100),
    POINT_LIGHT_2_POS: new THREE.Vector3(100, 100, 100),
    SPOTLIGHT_1_POS: new THREE.Vector3(100, 100, 100),
    SPOTLIGHT_2_POS: new THREE.Vector3(100, 100, 100),
    DIRECTIONAL_LIGHT_POS: new THREE.Vector3(50, 50, 0),

    // Notice that lights do not have a direction defined since they 
    // will be centered on the model
  },

  CAMERA: {
    FOV: 70,
    NEAR: 1,
    FAR: 1000,
    POSITION: { x: 10, y: 5, z: 10 },
  },

  BACKGROUND: new THREE.Color(0x000000),

};

const lightManager = {
  // light manager only accounts for the lights that are not assigned to the models
  directionalLight: null,
  ambientLight: null,
}

let camera;

let renderer, scene;

let tesseract, bunny, artemis;
let models;
let activeModel;
// TEMP!!!! <-REMOVE BEFORE SUBMISSION-> /////////////////////////////////
let temporaryViewLight;

// Clock for frame delta time
const clock = new THREE.Clock();

// Update projection matrices for all cameras.
// Orthographic cameras are positioned using a "half size" which is scaled by the
// current aspect ratio to produce left/right extents. Perspective cameras only
// need the aspect updated.
function updateCameraProjections() {
  const aspect = window.innerWidth / window.innerHeight;

  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

///////////////////////
/* CLASS DEFINITIONS */
///////////////////////

class DisplayModel extends THREE.Group {
  constructor() {
    super();
    
    this.lights = {
      spotlight1: new THREE.SpotLight(CONFIG.LIGHT.SPOTLIGHT_SHADE),
      spotlight2: new THREE.SpotLight(CONFIG.LIGHT.SPOTLIGHT_SHADE),
      pointLight1: new THREE.PointLight(CONFIG.LIGHT.POINT_LIGHT_SHADE),
      pointLight2: new THREE.PointLight(CONFIG.LIGHT.POINT_LIGHT_SHADE),
    };

    this.outOfScenePos = CONFIG.POSITION.OUT_OF_SCENE_POS;
    this.inScenePos = CONFIG.POSITION.IN_SCENE_POS;

    this.rotationSpeed = CONFIG.BASE_ROTATION_SPEED;

    this.setupLights();
  }

  setupLights() {
    this.lights.spotlight1.position.copy(CONFIG.LIGHT.SPOTLIGHT_1_POS);
    this.lights.spotlight2.position.copy(CONFIG.LIGHT.SPOTLIGHT_2_POS);
    this.lights.pointLight1.position.copy(CONFIG.LIGHT.POINT_LIGHT_1_POS);
    this.lights.pointLight2.position.copy(CONFIG.LIGHT.POINT_LIGHT_2_POS);

    this.lights.spotlight1.target.position.copy(this.position);
    this.lights.spotlight2.target.position.copy(this.position);

    for (const light of Object.values(this.lights)) this.add(light);

    this.add(this.lights.spotlight1.target);
    this.add(this.lights.spotlight2.target);
  }

  outOfScene() {
    this.position.copy(this.outOfScenePos);
  }

  inScene() {
    this.position.copy(this.inScenePos);
  }

  rotate(deltaTime) {
    const angle = this.rotationSpeed * (deltaTime || 0);
    this.rotation.y += angle;
    // Debug: log rotation for this object
    console.debug(`[rotate] ${this.modelID || this.constructor.name} angle=`, angle);
  }
}

class Tesseract extends DisplayModel {
  constructor() {
    super();

    // Define Tesseract attributes
    this.modelID = CONFIG.TESSERACT.MODEL_ID;

    this.rotationSpeed = CONFIG.TESSERACT.ROTATION_SPEED;

    this.outerCubeScale = CONFIG.TESSERACT.OUTER_CUBE_SCALE;
    this.innerCubeScale = CONFIG.TESSERACT.INNER_CUBE_SCALE;

    this.outerCubeScaleSpeed = CONFIG.TESSERACT.OUTER_CUBE_SCALE_SPEED;
    this.innerCubeScaleSpeed = CONFIG.TESSERACT.INNER_CUBE_SCALE_SPEED;

    this.outerCubeColour = CONFIG.TESSERACT.OUTER_CUBE_COLOUR;
    this.innerCubeColour = CONFIG.TESSERACT.INNER_CUBE_COLOUR;

    this.elapsedTime = 0;

    this.constructTesseract();
  }

  // Define Tesseract methods

  constructTesseract() {
    this.outerCube = this.createOuterCube();
    this.innerCube = this.createInnerCube();
  }

  createOuterCube() {
    const geometry = new THREE.BoxGeometry(
      this.outerCubeScale, 
      this.outerCubeScale, 
      this.outerCubeScale);

    const material = new THREE.MeshPhongMaterial({
      color: this.outerCubeColour,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      wireframe: true,
    });
    const outerCube = new THREE.Mesh(geometry, material);

    outerCube.castShadow = true;
    outerCube.receiveShadow = true;

    this.add(outerCube);
    return outerCube;
  }

  createInnerCube() {
    const geometry = new THREE.BoxGeometry(
      this.innerCubeScale, 
      this.innerCubeScale, 
      this.innerCubeScale);

    const material = new THREE.MeshPhongMaterial({
      color: this.innerCubeColour,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      wireframe: true,
    });
    const innerCube = new THREE.Mesh(geometry, material);

    innerCube.castShadow = true;
    innerCube.receiveShadow = true;

    this.add(innerCube);
    return innerCube;
  }

  rotate(deltaTime) {
    // Calculate rotation angles
    this.elapsedTime += deltaTime
    const angle = this.rotationSpeed * ((deltaTime) || 0);

    // Rotation
    this.rotation.y += angle;

    // Scale
    const outerScale = Math.abs(Math.sin(this.elapsedTime * this.outerCubeScaleSpeed));
    const innerScale = Math.abs(Math.sin(this.elapsedTime * this.innerCubeScaleSpeed));

    this.outerCube.scale.set(
      outerScale,
      outerScale,
      outerScale)

    this.innerCube.scale.set(
      innerScale,
      innerScale,
      innerScale)
  }

}

class Bunny extends DisplayModel {
  // Maybe does not have to be defined, since we are importing the model
  constructor() {
    super();

    // Define Bunny attributes
    this.modelID = CONFIG.BUNNY.MODEL_ID;
    this.rotationSpeed = CONFIG.BUNNY.ROTATION_SPEED;

    this.loadModel();
  }

  loadModel() {
    const loader = new OBJLoader();
    const whiteMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });

    loader.load(
      "js/bunny.obj",
      (model) => {
        model.traverse((node) => {
          if (node.isMesh) {
            node.material = whiteMaterial;
          }
        });

        model.scale.set(CONFIG.BUNNY.SCALE.x, CONFIG.BUNNY.SCALE.y, CONFIG.BUNNY.SCALE.z);

        this.model = model;
        this.add(model);
        console.log('[Bunny.loadModel] bunny model loaded');
      },
      undefined,
      (error) => {
        console.error("Error loading bunny.obj:", error);
      }
    );
  }

}
class Artemis extends DisplayModel {
  // Maybe does not have to be defined, since we are importing the model
  constructor() {
    super();

    // Define Artemis attributes
    this.modelID = CONFIG.ARTEMIS.MODEL_ID;
    this.rotationSpeed = CONFIG.ARTEMIS.ROTATION_SPEED;
  }

  // Define Artemis methods

}

// Define other helper methods

/////////////////////
/* CREATE SCENE(S) */
/////////////////////

function createScene() {
  scene = new THREE.Scene();
  console.log("scene created");
  scene.background = CONFIG.BACKGROUND;

  // TEMP!!!! <-REMOVE BEFORE SUBMISSION-> /////////////////////////////////
  temporaryViewLight = new THREE.HemisphereLight(0xffffff, 0x404040, 2.5);
  scene.add(temporaryViewLight);

  tesseract = new Tesseract();
  tesseract.inScene();
  scene.add(tesseract);
  console.log("tesseract created");

  bunny = new Bunny();
  bunny.outOfScene();
  scene.add(bunny);
  console.log("bunny created");

  artemis = new Artemis();
  artemis.outOfScene();
  scene.add(artemis);
  console.log("artemis created");

  models = {
    [tesseract.modelID]: tesseract,
    [bunny.modelID]: bunny,
    [artemis.modelID]: artemis
  };
  console.log("models assigned", models);

  // Set default active model
  activeModel = tesseract;
  console.log('[createScene] scene created, models:', Object.keys(models));
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function setupCameras() {
    const aspect = window.innerWidth / window.innerHeight;

    camera = new THREE.PerspectiveCamera(CONFIG.CAMERA.FOV, aspect, CONFIG.CAMERA.NEAR, CONFIG.CAMERA.FAR);
    camera.position.set(CONFIG.CAMERA.POSITION.x, CONFIG.CAMERA.POSITION.y, CONFIG.CAMERA.POSITION.z);
    camera.lookAt(scene.position);

    updateCameraProjections();
}

////////////////////
//* CREATE LIGHTS */
////////////////////

function setupLights() {
  lightManager.ambientLight = new THREE.AmbientLight(CONFIG.LIGHT.AMBIENT_LIGHT_SHADE, 0.2);
  lightManager.directionalLight = new THREE.DirectionalLight(CONFIG.LIGHT.DIRECTIONAL_LIGHT_SHADE, 0.5);
  
  lightManager.directionalLight.position.copy(CONFIG.LIGHT.DIRECTIONAL_LIGHT_POS);
  lightManager.directionalLight.target.position.copy(CONFIG.POSITION.IN_SCENE_POS);
    lightManager.directionalLight.castShadow = true;
    lightManager.directionalLight.shadow.mapSize.set(1024, 1024);

    for (const light of Object.values(lightManager)) scene.add(light);
    scene.add(lightManager.directionalLight.target);
    console.log('[setupLights] lights added:', Object.keys(lightManager));
}

////////////
/* UPDATE */
////////////
function update() {
  const delta = clock.getDelta();

  activeModel.rotate(delta);

}

/////////////
/* DISPLAY */
/////////////
function render() {
  renderer.render(scene, camera);
}

////////////////////////////////
/* INITIALIZE ANIMATION CYCLE */
////////////////////////////////
function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(CONFIG.WIDTH, CONFIG.HEIGHT);
  renderer.domElement.style.position = 'fixed';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.zIndex = '0';
  document.body.appendChild(renderer.domElement);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.shadowMap.enabled = true;
  console.log('[init] renderer appended, size:', CONFIG.WIDTH, CONFIG.HEIGHT);

  createScene();
  setupCameras();
  setupLights();
  initializeHUD();

  window.addEventListener("resize", onResize);

  setActiveModel("tesseract");

  animate();
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////
function animate() {
  update();
  render();
	
  requestAnimationFrame(animate);
}

////////////////////////////
/* RESIZE WINDOW CALLBACK */
////////////////////////////
function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  if (window.innerHeight > 0 && window.innerWidth > 0) {
    updateCameraProjections();
    console.log('[setupCameras] camera position:', camera.position.toArray());
  }
}

function initializeHUD() {
  document.querySelectorAll("[data-model-id]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveModel(button.dataset.modelId);
    });
  });
}

function setActiveModel(modelId) {
  console.log('[setActiveModel] requested:', modelId);
  if (activeModel){
    try { activeModel.outOfScene(); } catch (e) { console.warn('[setActiveModel] activeModel outOfScene failed', e); }
  }

  const model = models[modelId];
  if (!model) {
    console.warn(`[setActiveModel] no model found for id '${modelId}'`);
    return;
  }

  activeModel = model;
  try { activeModel.inScene(); } catch (e) { console.warn('[setActiveModel] inScene failed', e); }

  document.querySelectorAll("[data-model-id]").forEach((button) => {
    button.classList.toggle("active", button.dataset.modelId === modelId);
  });
}

init();

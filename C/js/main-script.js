import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

const CONFIG = {
  HEIGHT: window.innerHeight,
  WIDTH: window.innerWidth,
  
  BASE_ROTATION_SPEED: 1,

  TESSERACT: {
    ROTATION_SPEED: 10,
  },
  BUNNY: {
    ROTATION_SPEED: 1,
    POSITION: new THREE.Vector3(0, 0, 0),
    SCALE: new THREE.Vector3(5, 5, 5),
  },
  ARTEMIS: {
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
    POINT_LIGHT_1_POS: new THREE.Vector3(1, 1, 1),
    POINT_LIGHT_2_POS: new THREE.Vector3(1, 1, 1),
    SPOTLIGHT_1_POS: new THREE.Vector3(1, 1, 1),
    SPOTLIGHT_2_POS: new THREE.Vector3(1, 1, 1),
    DIRECTIONAL_LIGHT_POS: new THREE.Vector3(1, 1, 1),
    AMBIENT_LIGHT_POS: new THREE.Vector3(1, 1, 1),

    // Lights directions

    // Notice that spotlights do not have a direction defined since they 
    // will be centered on the object
    DIRECTIONAL_LIGHT_DIRECTION: new THREE.Vector3(1, 1, 1),
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
  // light manager only accounts for the lights that are not assigned to the objects
  directionalLight: null,
  ambientLight: null,
}

let camera;

let renderer, scene;

let tesseract, bunny, artemis;
let activeModel = "tesseract";
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

class DisplayObject extends THREE.Group {
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

    this.rotation_speed = CONFIG.BASE_ROTATION_SPEED;

    this.setupLights();
  }

  setupLights() {
    this.lights.spotlight1.position.copy(CONFIG.LIGHT.SPOTLIGHT_1_POS);
    this.lights.spotlight2.position.copy(CONFIG.LIGHT.SPOTLIGHT_2_POS);
    this.lights.pointLight1.position.copy(CONFIG.LIGHT.POINT_LIGHT_1_POS);
    this.lights.pointLight2.position.copy(CONFIG.LIGHT.POINT_LIGHT_2_POS);

    this.lights.spotlight1.lookAt(this);
    this.lights.spotlight2.lookAt(this);

    for (const light of Object.values(this.lights)) this.add(light);
  }

  outOfScene() {
    this.position.copy(this.outOfScenePos);
  }

  inScene() {
    this.position.copy(this.inScenePos);
  }

  rotate(deltaTime) {
    const angle = this.rotation_speed * (deltaTime || 0);
    this.rotation.y += angle;
  }
}

class Tesseract extends DisplayObject {
  constructor() {
    super();

    // Define Tesseract attributes
    this.rotation_speed = CONFIG.TESSERACT.ROTATION_SPEED;
  }

  // Define Tesseract methods

}

class Bunny extends DisplayObject {
  // Maybe does not have to be defined, since we are importing the model
  constructor() {
    super();

    // Define Bunny attributes
    this.rotation_speed = CONFIG.BUNNY.ROTATION_SPEED;
    this.model = null;

    this.loadModel();
  }

  loadModel() {
    const loader = new OBJLoader();
    const whiteMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });

    loader.load(
      "js/bunny.obj",
      (object) => {
        object.traverse((node) => {
          if (node.isMesh) {
            node.material = whiteMaterial;
          }
        });

        object.scale.set(CONFIG.BUNNY.SCALE.x, CONFIG.BUNNY.SCALE.y, CONFIG.BUNNY.SCALE.z);
        object.position.set(CONFIG.BUNNY.POSITION.x, CONFIG.BUNNY.POSITION.y, CONFIG.BUNNY.POSITION.z);

        this.model = object;
        this.add(object);
      },
      undefined,
      (error) => {
        console.error("Error loading bunny.obj:", error);
      }
    );
  }

}
class Artemis extends DisplayObject {
  // Maybe does not have to be defined, since we are importing the model
  constructor() {
    super();

    // Define Artemis attributes
    this.rotation_speed = CONFIG.ARTEMIS.ROTATION_SPEED;
  }

  // Define Artemis methods

}

// Define other helper methods

/////////////////////
/* CREATE SCENE(S) */
/////////////////////

function createScene() {
  scene = new THREE.Scene();
  scene.background = CONFIG.BACKGROUND;

  // TEMP!!!! <-REMOVE BEFORE SUBMISSION-> /////////////////////////////////
  temporaryViewLight = new THREE.HemisphereLight(0xffffff, 0x404040, 2.5);
  scene.add(temporaryViewLight);

  tesseract = new Tesseract();
  tesseract.inScene();
  scene.add(tesseract);

  bunny = new Bunny();
  bunny.outOfScene();
  scene.add(bunny);

  artemis = new Artemis();
  artemis.outOfScene();
  scene.add(artemis);

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

////////////
/* UPDATE */
////////////
function update() {
  const delta = clock.getDelta();

  if (activeModel === "tesseract") {
    tesseract.rotate(delta);
  } else if (activeModel === "bunny") {
    bunny.rotate(delta);
  }

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

  createScene();
  setupCameras();
  initializeHUD();

  window.addEventListener("resize", onResize);

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
  }
}

function initializeHUD() {
  document.querySelectorAll("[data-model-id]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveModel(button.dataset.modelId);
    });
  });

  setActiveModel("tesseract");
}

function setActiveModel(modelId) {
  activeModel = modelId;

  if (modelId === "tesseract") {
    tesseract.inScene();
    bunny.outOfScene();
  } else if (modelId === "bunny") {
    bunny.inScene();
    tesseract.outOfScene();
  }

  document.querySelectorAll("[data-model-id]").forEach((button) => {
    button.classList.toggle("active", button.dataset.modelId === modelId);
  });
}

init();

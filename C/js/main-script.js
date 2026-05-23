import * as THREE from "three";
import Stats from 'stats';

const CONFIG = {
  HEIGHT: window.innerHeight,
  WIDTH: window.innerWidth,

  TESSERACT: {},
  BUNNY: {},
  ARTEMIS: {},

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
    POINT_LIGHT_1_POS: THREE.Vector3(1,1,1),
    POINT_LIGHT_2_POS: THREE.Vector3(1,1,1),
    SPOTLIGHT_1_POS: THREE.Vector3(1,1,1),
    SPOTLIGHT_2_POS: THREE.Vector3(1,1,1),
    DIRECTIONAL_LIGHT_POS: THREE.Vector3(1,1,1),
    AMBIENT_LIGHT_POS: THREE.Vector3(1,1,1),

    // Lights directions

    // Notice that spotlights do not have a direction defined since they 
    // will be centered on the object
    DIRECTIONAL_LIGHT_DIRECTION: THREE.Vector3(1,1,1),
  },

  CAMERA: {
    FOV: 70,
    NEAR: 1,
    FAR: 1000,
    POSITION: { x: 0, y: 5, z: -8 },
  },

  BACKGROUND: new THREE.Color(0x404040),
};

const lightManager = {
  // light manager only accounts for the lights that are not assigned to the objects
  directionalLight: null,
  ambientLight: null,
}

let camera;

let renderer, scene;

let tesseract, bunny, artemis;

// Helpers
const axesHelpers = [];
let helpersVisible = true;
let wireframeActive = false;
let collisionBoxesVisible = false;
let infoHudVisible = true;
let paramsHudVisible = true;

const hudElements = {
  infoPanel: null,
  paramsPanel: null,
  infoToggleButton: null,
  paramsToggleButton: null,
  infoHideButton: null,
  paramsHideButton: null,
  targetFoldSwitch: null,
  yawSpeedSlider: null,
  pitchSpeedSlider: null,
  watchScaleSlider: null,
  balloonScaleSlider: null,
  droneSpeedSlider: null,
  rotorSpeedSlider: null,
  yawSpeedValue: null,
  pitchSpeedValue: null,
  watchScaleValue: null,
  balloonScaleValue: null,
  droneSpeedValue: null,
  rotorSpeedValue: null,
};

// TODO: Define Flags

// Movement state for continuous input (A/D, W/S, U/J)
const movementState = {
  left: false,
  right: false,
  up: false, // W
  down: false, // S
  forward: false, // U
  backward: false, // J
};

// When true, keyboard input is ignored (used while balloons are popping)
let inputLocked = false;

// Clock for frame delta time
const clock = new THREE.Clock();
// Rotation input state (I/K + O/L pitch)
const rotationState = {
  yawLeft: false, // I
  yawRight: false, // K
  pitchUp: false, // O
  pitchDown: false, // L
};

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild( stats.dom );
stats.dom.style.transform = 'scale(1.5)';
stats.dom.style.transformOrigin = 'top left';

let watchScale = CONFIG.WATCH.DEFAULT_SCALE;
let balloonScale = CONFIG.BALLOON.DEFAULT_SCALE;
let canLandDroneDistance = watchScale * CONFIG.WATCH.LAND_DISTANCE_MULTIPLIER;

const CAMERA_KEY_IDS = {
  Digit1: 'key-1', Numpad1: 'key-1',
  Digit2: 'key-2', Numpad2: 'key-2',
  Digit3: 'key-3', Numpad3: 'key-3',
  Digit4: 'key-4', Numpad4: 'key-4',
  Digit5: 'key-5', Numpad5: 'key-5',
  Digit6: 'key-6', Numpad6: 'key-6',
};

function setActiveCamera(nextCamera) {
  cameraManager.active = nextCamera;
}

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
    // Define Tesseract attributes
    self.lights = {
      spotlight1: THREE.SpotLight(CONFIG.LIGHT.SPOTLIGHT_SHADE),
      spotlight2: THREE.SpotLight(CONFIG.LIGHT.SPOTLIGHT_SHADE),
      pointLight1: THREE.PointLight(CONFIG.LIGHT.POINT_LIGHT_SHADE),
      pointLight2: THREE.PointLight(CONFIG.LIGHT.POINT_LIGHT_SHADE),
    };

    self.outOfScenePos = CONFIG.POSITION.OUT_OF_SCENE_POS;
    self.inScenePos = CONFIG.POSITION.IN_SCENE_POS;

    this.setupLights();
  }

  setupLights() {
    self.lights.spotlight1.position(CONFIG.LIGHT.SPOTLIGHT_1_POS);
    self.lights.spotlight2.position(CONFIG.LIGHT.SPOTLIGHT_1_POS);
    self.lights.pointlight1.position(CONFIG.LIGHT.POINT_LIGHT_1_POS);
    self.lights.pointlight2.position(CONFIG.LIGHT.POINT_LIGHT_1_POS);

    self.lights.spotlight1.lookAt(this);
    self.lights.spotlight2.lookAt(this);

    for(light in self.lights) this.add(light);
  }
}

class Tesseract extends DisplayObject {
  constructor() {
    super();
    // Define Tesseract attributes
  }

  // Define Tesseract methods
}

class Bunny extends DisplayObject {
  // Maybe does not have to be defined, since we are importing the model
  constructor() {
    super();
    // Define Bunny attributes
  }

  // Define Bunny methods

}
class Artemis extends DisplayObject {
  // Maybe does not have to be defined, since we are importing the model
  constructor() {
    super();
    // Define Artemis attributes
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
  
  tesseract = new Tesseract();
  tesseract.position.set(0, 3, 0);
  scene.add(tesseract);

  const targets = [];
  scene.traverse((node) => {
    if (node.isObject3D && !node.isAxesHelper && !node.isCameraHelper) {
      targets.push(node);
    }
  });

  targets.forEach((node) => {
    const localAxes = new THREE.AxesHelper(5);
    node.add(localAxes);
    axesHelpers.push(localAxes);
  });
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function setupCameras() {
    const aspect = window.innerWidth / window.innerHeight;
    const orthoDefaultHalfSize = CONFIG.CAMERA.ORTHOGRAPHIC_DEFAULT_HALF_SIZE;
    const orthoZoomedOutHalfSize = CONFIG.CAMERA.ORTHOGRAPHIC_ZOOMED_OUT_HALF_SIZE;

    cameraManager.topCamera = new THREE.OrthographicCamera(
      -orthoDefaultHalfSize * aspect,
      orthoDefaultHalfSize * aspect,
      orthoDefaultHalfSize,
      -orthoDefaultHalfSize,
      1,
      1000
    );
    cameraManager.topCamera.position.set(0, 200, 0);
    cameraManager.topCamera.lookAt(scene.position);
    
    cameraManager.lateralCamera = new THREE.OrthographicCamera(
      -orthoZoomedOutHalfSize * aspect,
      orthoZoomedOutHalfSize * aspect,
      orthoZoomedOutHalfSize,
      -orthoZoomedOutHalfSize,
      1,
      1000
    );
    cameraManager.lateralCamera.position.set(0, 0, 800);
    cameraManager.lateralCamera.lookAt(scene.position);
    
    cameraManager.frontalCamera = new THREE.OrthographicCamera(
      -orthoZoomedOutHalfSize * aspect,
      orthoZoomedOutHalfSize * aspect,
      orthoZoomedOutHalfSize,
      -orthoZoomedOutHalfSize,
      1,
      1000
    );
    cameraManager.frontalCamera.position.set(200, 0, 0);
    cameraManager.frontalCamera.lookAt(scene.position);
    
    cameraManager.orthogonalCamera = new THREE.OrthographicCamera(
      -orthoZoomedOutHalfSize * aspect,
      orthoZoomedOutHalfSize * aspect,
      orthoZoomedOutHalfSize,
      -orthoZoomedOutHalfSize,
      1,
      1000
    );
    // Note: orthogonal and perspective cameras sit in the same position
    cameraManager.orthogonalCamera.position.set(-100, 20, 100);
    cameraManager.orthogonalCamera.lookAt(scene.position);

    cameraManager.perspectiveCamera = new THREE.PerspectiveCamera(70, aspect, 1, 1000);
    cameraManager.perspectiveCamera.position.set(-100, 20, 100);
    cameraManager.perspectiveCamera.lookAt(scene.position);

    cameraManager.active = cameraManager.perspectiveCamera;

    ////////////////////////
    // CAMERA HELPERS
    ////////////////////////

    cameraManager.helpers.length = 0;

    const topHelper = new THREE.CameraHelper(cameraManager.topCamera);
    const lateralHelper = new THREE.CameraHelper(cameraManager.lateralCamera);
    const frontalHelper = new THREE.CameraHelper(cameraManager.frontalCamera);
    const orthogonalHelper = new THREE.CameraHelper(cameraManager.orthogonalCamera);
    const perspectiveHelper = new THREE.CameraHelper(cameraManager.perspectiveCamera);

    cameraManager.helpers.push(
      topHelper,
      lateralHelper,
      frontalHelper,
      orthogonalHelper,
      perspectiveHelper
    );

    if (cameraManager.mobileCamera) {
      const mobileHelper = new THREE.CameraHelper(cameraManager.mobileCamera);
      cameraManager.helpers.push(mobileHelper);
    }

    cameraManager.helpers.forEach((helper) => {
      scene.add(helper);
    });

    updateCameraProjections();
}

////////////
/* UPDATE */
////////////
function update() {
  const delta = clock.getDelta();

  // Continuous movement: compute direction from simultaneous keys
  const moveVec = new THREE.Vector3(
    (movementState.right ? 1 : 0) + (movementState.left ? -1 : 0),
    (movementState.up ? 1 : 0) + (movementState.down ? -1 : 0),
    (movementState.forward ? 1 : 0) + (movementState.backward ? -1 : 0)
  );

  if (moveVec.lengthSq() > 0) {
    drone.moveDirection(moveVec, delta);
  }
  // Continuous rotation (yaw) from I/K keys
  const yawDir = (rotationState.yawLeft ? 1 : 0) + (rotationState.yawRight ? -1 : 0);
  if (yawDir !== 0 && drone && typeof drone.rotateYaw === 'function') {
    drone.rotateYaw(yawDir, delta);
  }
  // Continuous rotation (pitch) from O/L keys (limited)
  const pitchDir = (rotationState.pitchUp ? 1 : 0) + (rotationState.pitchDown ? -1 : 0);
  if (pitchDir !== 0 && drone && typeof drone.rotatePitch === 'function') {
    drone.rotatePitch(pitchDir, delta);
  }
  // Animate drone arms folding/unfolding
  drone.updateArms();
  drone.rotateRotors(delta);
  // Check collisions after movement and rotation
  checkCollisions();
  // Animate any balloons that are popping
  updatePoppingBalloons(delta);
  syncParamsHUD();
}

/////////////
/* DISPLAY */
/////////////
function render() {
  renderer.render(scene, cameraManager.active);
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
  initializeInfoHUD();
  initializeParamsHUD();

  window.addEventListener("resize", onResize);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  animate();
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////
function animate() {
  stats.begin();

  update();
  render();
	
  stats.end();
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

///////////////////////
/* KEY DOWN CALLBACK */
///////////////////////
function onKeyDown(e) {
  if (inputLocked) return;
  setActiveCameraHUD(e.code, true);
  switch (e.code) {
    // Camera controls
    case 'Digit1':
    case 'Numpad1':
      cameraManager.pressed.topCamera = true; // 1
      break;
    case 'Digit2':
    case 'Numpad2':
      cameraManager.pressed.lateralCamera = true; // 2
      break;
    case 'Digit3':
    case 'Numpad3':
      cameraManager.pressed.frontalCamera = true; // 3
      break;
    case 'Digit4':
    case 'Numpad4':
      cameraManager.pressed.orthogonalCamera = true; // 4
      break;
    case 'Digit5':
    case 'Numpad5':
      cameraManager.pressed.perspectiveCamera = true; // 5
      break;
    case 'Digit6':
    case 'Numpad6':
      cameraManager.pressed.mobileCamera = true; // 6
      break;

    // H
    case 'KeyH':
      helpersVisible = !helpersVisible;
      cameraManager.helpers.forEach((helper) => {
        helper.visible = helpersVisible;
      });

      axesHelpers.forEach((axis) => {
        axis.visible = helpersVisible;
      });
      toggleHUDKey('key-h', helpersVisible);
      break;

    // 7
    case 'Digit7':
    case 'Numpad7':
      wireframeActive = !wireframeActive;
      scene.traverse((node) => {
        if (node instanceof THREE.Mesh) node.material.wireframe = wireframeActive;
      });
      toggleHUDKey('key-7', wireframeActive);
      break;

    // Z - toggle collision boxes
    case 'KeyZ':
      collisionBoxesVisible = !collisionBoxesVisible;
      if (drone && drone.collisionSpheres) {
        drone.collisionSpheres.forEach((sphere) => {
          sphere.visible = collisionBoxesVisible;
        });
      }
      balloons.forEach((balloon) => {
        if (balloon && balloon.collisionSphere) {
          balloon.collisionSphere.visible = collisionBoxesVisible;
        }
      });
      toggleHUDKey('key-z', collisionBoxesVisible);
      break;

    // Q - fold/unfold drone arms
    case 'KeyQ':
        drone.handleArmsFold();
      break;

    // A / D - move drone on X axis (só voa se braços estendidos)
    case 'KeyA': // A
      toggleHUDKey('key-a', true);
      movementState.left = true;
      break;
    case 'KeyD': // D
      toggleHUDKey('key-d', true);
      movementState.right = true;
      break;
    // W / S - move drone on Y axis (continuous)
    case 'KeyW': // W
      toggleHUDKey('key-w', true);
      movementState.up = true;
      break;
    case 'KeyS': // S
      toggleHUDKey('key-s', true);
      movementState.down = true;
      break;

    // U / J - move drone on Z axis (continuous)
    case 'KeyU': // U
      toggleHUDKey('key-u', true);
      movementState.forward = true;
      break;
    case 'KeyJ': // J
      toggleHUDKey('key-j', true);
      movementState.backward = true;
      break;
    // I / K - yaw rotation around Y axis
    case 'KeyI': // I
      toggleHUDKey('key-i', true);
      rotationState.yawLeft = true;
      break;
    case 'KeyK': // K
      toggleHUDKey('key-k', true);
      rotationState.yawRight = true;
      break;
    // O / L - pitch rotation around X axis (limited)
    case 'KeyO': // O
      toggleHUDKey('key-o', true);
      rotationState.pitchUp = true;
      break;
    case 'KeyL': // L
      toggleHUDKey('key-l', true);
      rotationState.pitchDown = true;
      break;
  }
}

///////////////////////
/* KEY UP CALLBACK */
///////////////////////
function onKeyUp(e) {
  if (inputLocked) return;

  switch (e.code) {
    case 'KeyA': // A
      toggleHUDKey('key-a', false);
      movementState.left = false;
      break;
    case 'KeyD': // D
      toggleHUDKey('key-d', false);
      movementState.right = false;
      break;
    case 'KeyW': // W
      toggleHUDKey('key-w', false);
      movementState.up = false;
      break;
    case 'KeyS': // S
      toggleHUDKey('key-s', false);
      movementState.down = false;
      break;
    case 'KeyU': // U
      toggleHUDKey('key-u', false);
      movementState.forward = false;
      break;
    case 'KeyJ': // J
      toggleHUDKey('key-j', false);
      movementState.backward = false;
      break;
    case 'KeyI': // I
      toggleHUDKey('key-i', false);
      rotationState.yawLeft = false;
      break;
    case 'KeyK': // K
      toggleHUDKey('key-k', false);
      rotationState.yawRight = false;
      break;
    case 'KeyO': // O
      toggleHUDKey('key-o', false);
      rotationState.pitchUp = false;
      break;
    case 'KeyL': // L
      toggleHUDKey('key-l', false);
      rotationState.pitchDown = false;
      break;
  }
}

function initializeHUD() {
  toggleHUDKey('key-5', true);
  toggleHUDKey('key-h', helpersVisible);
  toggleHUDKey('key-7', false);
  toggleHUDKey('key-z', collisionBoxesVisible);
}

function initializeInfoHUD() {
  hudElements.infoPanel = document.getElementById('info-hud');
  hudElements.infoToggleButton = document.getElementById('info-hud-toggle');
  hudElements.infoHideButton = document.getElementById('info-hud-hide-btn');

  if (hudElements.infoToggleButton) hudElements.infoToggleButton.addEventListener('click', toggleInfoHUDVisibility);
  if (hudElements.infoHideButton) hudElements.infoHideButton.addEventListener('click', toggleInfoHUDVisibility);

  updateInfoHUDVisibility();
}

function bindSlider(slider, valueEl, onChange) {
  void valueEl;
  if (!slider) return;
  slider.addEventListener('input', () => {
    onChange(Number(slider.value));
    syncParamsHUD();
  });
}

function initializeParamsHUD() {
  hudElements.paramsPanel = document.getElementById('params-hud');
  hudElements.paramsToggleButton = document.getElementById('params-hud-toggle');
  hudElements.paramsHideButton = document.getElementById('params-hud-hide-btn');
  hudElements.targetFoldSwitch = document.getElementById('target-fold-switch');
  hudElements.yawSpeedSlider = document.getElementById('yaw-speed-slider');
  hudElements.pitchSpeedSlider = document.getElementById('pitch-speed-slider');
  hudElements.watchScaleSlider = document.getElementById('watch-scale-slider');
  hudElements.balloonScaleSlider = document.getElementById('balloon-scale-slider');
  hudElements.droneSpeedSlider = document.getElementById('drone-speed-slider');
  hudElements.rotorSpeedSlider = document.getElementById('rotor-speed-slider');
  hudElements.yawSpeedValue = document.getElementById('yaw-speed-value');
  hudElements.pitchSpeedValue = document.getElementById('pitch-speed-value');
  hudElements.watchScaleValue = document.getElementById('watch-scale-value');
  hudElements.balloonScaleValue = document.getElementById('balloon-scale-value');
  hudElements.droneSpeedValue = document.getElementById('drone-speed-value');
  hudElements.rotorSpeedValue = document.getElementById('rotor-speed-value');

  if (hudElements.targetFoldSwitch) {
    hudElements.targetFoldSwitch.addEventListener('change', () => {
      if (!drone) return;
      drone.setTargetFold(hudElements.targetFoldSwitch.checked);
      syncParamsHUD();
    });
  }

  bindSlider(hudElements.yawSpeedSlider, hudElements.yawSpeedValue, (value) => {
    if (!drone) return;
    drone.setYawSpeed(value);
  });

  bindSlider(hudElements.pitchSpeedSlider, hudElements.pitchSpeedValue, (value) => {
    if (!drone) return;
    drone.setPitchSpeed(value);
  });

  bindSlider(hudElements.watchScaleSlider, hudElements.watchScaleValue, (value) => {
    setWatchScale(value);
  });

  bindSlider(hudElements.balloonScaleSlider, hudElements.balloonScaleValue, (value) => {
    setBalloonScale(value);
  });

  bindSlider(hudElements.droneSpeedSlider, hudElements.droneSpeedValue, (value) => {
    if (!drone) return;
    drone.setMoveSpeed(value);
  });

  bindSlider(hudElements.rotorSpeedSlider, hudElements.rotorSpeedValue, (value) => {
    if (!drone) return;
    drone.setRotorSpeed(value);
  });

  if (hudElements.paramsToggleButton) hudElements.paramsToggleButton.addEventListener('click', toggleParamsHUDVisibility);
  if (hudElements.paramsHideButton) hudElements.paramsHideButton.addEventListener('click', toggleParamsHUDVisibility);

  syncParamsHUD();
  updateParamsHUDVisibility();
}

function syncParamsHUD() {
  if (!drone) return;

  if (hudElements.targetFoldSwitch) {
    hudElements.targetFoldSwitch.checked = drone._targetFold === 1;
  }

  if (hudElements.yawSpeedSlider) hudElements.yawSpeedSlider.value = drone._rotationSpeed;
  if (hudElements.pitchSpeedSlider) hudElements.pitchSpeedSlider.value = drone._pitchSpeed;
  if (hudElements.watchScaleSlider) hudElements.watchScaleSlider.value = watchScale;
  if (hudElements.balloonScaleSlider) hudElements.balloonScaleSlider.value = balloonScale;
  if (hudElements.droneSpeedSlider) hudElements.droneSpeedSlider.value = drone._moveSpeed;
  if (hudElements.rotorSpeedSlider) hudElements.rotorSpeedSlider.value = drone._rotorSpeed;

  if (hudElements.yawSpeedValue) hudElements.yawSpeedValue.textContent = Number(drone._rotationSpeed).toFixed(2);
  if (hudElements.pitchSpeedValue) hudElements.pitchSpeedValue.textContent = Number(drone._pitchSpeed).toFixed(2);
  if (hudElements.watchScaleValue) hudElements.watchScaleValue.textContent = Number(watchScale).toFixed(2);
  if (hudElements.balloonScaleValue) hudElements.balloonScaleValue.textContent = Number(balloonScale).toFixed(2);
  if (hudElements.droneSpeedValue) hudElements.droneSpeedValue.textContent = drone._moveSpeed;
  if (hudElements.rotorSpeedValue) hudElements.rotorSpeedValue.textContent = Number(drone._rotorSpeed).toFixed(2);
}

function updateInfoHUDVisibility() {
  if (!hudElements.infoPanel) return;

  hudElements.infoPanel.classList.toggle('hidden', !infoHudVisible);

  if (hudElements.infoToggleButton) {
    hudElements.infoToggleButton.hidden = infoHudVisible;
    hudElements.infoToggleButton.textContent = infoHudVisible ? 'Hide Info HUD' : 'Show Info HUD';
  }
  if (hudElements.infoHideButton) {
    hudElements.infoHideButton.textContent = infoHudVisible ? 'Hide' : 'Show';
  }
}

function toggleInfoHUDVisibility() {
  infoHudVisible = !infoHudVisible;
  updateInfoHUDVisibility();
}

function updateParamsHUDVisibility() {
  if (!hudElements.paramsPanel) return;

  hudElements.paramsPanel.classList.toggle('hidden', !paramsHudVisible);

  if (hudElements.paramsToggleButton) {
    hudElements.paramsToggleButton.hidden = paramsHudVisible;
    hudElements.paramsToggleButton.textContent = paramsHudVisible ? 'Hide Params HUD' : 'Show Params HUD';
  }
  if (hudElements.paramsHideButton) {
    hudElements.paramsHideButton.textContent = paramsHudVisible ? 'Hide' : 'Show';
  }
}

function toggleParamsHUDVisibility() {
  paramsHudVisible = !paramsHudVisible;
  updateParamsHUDVisibility();
}

function setActiveCameraHUD(code, isPressed) {
  const elementId = CAMERA_KEY_IDS[code];
  if (!elementId || !isPressed) return;

  ['key-1', 'key-2', 'key-3', 'key-4', 'key-5', 'key-6'].forEach((id) => {
    const item = document.getElementById(id);
    if (item) item.classList.remove('active');
  });

  const el = document.getElementById(elementId);
  if (el) el.classList.add('active');
}

function toggleHUDKey(elementId, isActive) {
  const el = document.getElementById(elementId);
  if (el) {
    if (isActive) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }
}

init();
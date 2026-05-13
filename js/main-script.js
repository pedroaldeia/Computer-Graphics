import * as THREE from "three";
import Stats from 'stats';
import { createBracelet } from './bracelet.js';
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
/// TEMP PLEASE DELETE BEFORE SUBMISSION ///
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
////////////
// import { perspectiveDepthToViewZ } from "three/src/nodes/display/ViewportDepthNode.js";
// import { OrbitControls } from "three/addons/controls/OrbitControls.js";
// import { VRButton } from "three/addons/webxr/VRButton.js";
// import * as Stats from "three/addons/libs/stats.module.js";
// import { GUI } from "three/addons/libs/lil-gui.module.min.js";

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////
const HEIGHT = window.innerHeight;
const WIDTH = window.innerWidth;
const BACKGROUND = new THREE.Color(0x404040);

let topCamera;
let lateralCamera;
let frontalCamera;
let perspectiveCamera;
let orthogonalCamera;
let mobileCamera;
let renderer, scene;
let camera;

let smartWatch, drone, baloon;
// Array to track balloons for collision checks
let balloons = [];

// Helpers
let cameraHelpers = [];
let axesHelpers = [];
let helpersVisible = true;
let wireframeActive = false;

/// TEMP PLEASE DELETE BEFORE SUBMISSION ///
let controls;
////////////

// Flags
let pressed = {
  topCamera: false,
  lateralCamera: false,
  frontalCamera: false,
  orthogonalCamera: false,
  mobileCamera: false,
  perspectiveCamera: false,
};

// Movement state for continuous input (A/D, W/S, U/J)
let movementState = {
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
let rotationState = {
  yawLeft: false, // I
  yawRight: false, // K
  pitchUp: false, // O
  pitchDown: false, // L
};

var stats = new Stats();
stats.showPanel(0);
document.body.appendChild( stats.dom );
stats.dom.style.transform = 'scale(1.5)';
stats.dom.style.transformOrigin = 'top left';

///////////////////////
/* CLASS DEFINITIONS */
///////////////////////
class SmartWatch extends THREE.Group {
  constructor() {
    super();

    this._addWatch();
  }

  _addWatch() {
    const watch = new THREE.Mesh(
      new THREE.BoxGeometry(20, 2, 20),
      new THREE.MeshBasicMaterial({ color: 0xB2BEB5 })
    );
    this.add(watch);

    const loader = new GLTFLoader();
    loader.load('./scene.gltf', (gltf) => {
      const bracelet = gltf.scene;
      bracelet.name = "bracelet";
      bracelet.position.set(0, -3, 0);
      bracelet.scale.set(0.45, 0.45, 0.45);
      bracelet.traverse((node) => {
      if (node.isMesh) {
        node.material = new THREE.MeshBasicMaterial({
          color: 0x536267,
        });
      }
      });
      this.add(bracelet);
    }, 
    undefined,
    (error) => {
      console.error('An error happened while loading the bracelet:', error);
    });
  }
}

class Drone extends THREE.Group {
  constructor() {
    super();

    this._addBaseDescolagem();
    this._addBotaoDescolagem();
    this._addSuporteCamara();
    this._addLens();
    this._addRotorExtension();
    this._rotors = [];
    this._rotors = [];
    this._rotors = [];
    this._moveSpeed = 100; // units per second (tweakable)
    this._rotationSpeed = Math.PI; // radians per second (tweakable)
    this._collisionRadius = 20; // approximate collision sphere radius
    this._pitchSpeed = Math.PI / 2; // radians per second (tweakable)
    this._pitchLimitMin = -Math.PI / 6; // -30 degrees
    this._pitchLimitMax = Math.PI / 6;  // +30 degrees

    // Folding state for rotor extensions (arms)
    this._foldProgress = 0; // 0 = unfolded, 1 = folded
    this._targetFold = 0;
    this._foldScale = 0.65; // how close to center when folded (percentage)
    this._foldSpeed = 0.08; // per frame progress step
  }

  _getBodyX() {
    return 20;
  }

  _getExtensionX() {
    return 15;
  }

  _getGuardRadius() {
    return this._getExtensionX()/3;
  }

  _getConnectionX() {
    return this._getGuardRadius();
  }

  _getRotorRadius() {
    return this._getGuardRadius()/6;
  }

  _getProppellerLength() {
    return this._getGuardRadius()*2/3;
  }

  _getProppellerWidth() {
    return this._getProppellerLength()/6;
  }
 
  _addBaseDescolagem() {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(20, 4, 20),
      new THREE.MeshBasicMaterial({ color: 0xF1EFE8 }));
    this.add(base);
  }

  _addBotaoDescolagem() {
    const botao = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1.5, 4),
      new THREE.MeshBasicMaterial({ color: 0xE24B4A }));
    botao.position.set(0, 2.75, 8);
    this.add(botao);
  }

  _addSuporteCamara() {
    const suporte = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1, 4),
      new THREE.MeshBasicMaterial({ color: 0x185FA5 }));
    suporte.position.set(0, 2.5, -8);
    this.add(suporte);
  }

  _addLens() {
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.3, 32),
      new THREE.MeshBasicMaterial({ color: 0x378ADD }));
    lens.position.set(0, 3, -8);
    this.add(lens);

    this.mobileCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
    this.mobileCamera.position.set(0, 6, -8);
    this.mobileCamera.lookAt(0, 6, 1000);
    scene.add(this.mobileCamera);
    mobileCamera = this.mobileCamera;

    const mobileHelper = new THREE.CameraHelper(this.mobileCamera);
    scene.add(mobileHelper);
    cameraHelpers.push(mobileHelper);
  }
  
  _addRotorExtension() {
    const rotorExtensions = [0, 1, 2, 3].map(() => new THREE.Mesh(
      new THREE.BoxGeometry(this._getExtensionX(), 0.5, 4),
      new THREE.MeshBasicMaterial({ color: 0xB4B2A9 })));

    this._addGuards(rotorExtensions);
    this._addRotorConnections(rotorExtensions);

    rotorExtensions.forEach((rotorExtension, index) => {
      rotorExtension.rotation.y = index * (Math.PI / 2) + Math.PI/4;
      const pos = new THREE.Vector3(
        this._getBodyX()/2*Math.cos(index * Math.PI / 2 + Math.PI/4),
        0,
        this._getBodyX()/2 *(-Math.sin(index * Math.PI / 2 + Math.PI/4))
      );
      rotorExtension.position.copy(pos);
      // store original position for folding/unfolding
      rotorExtension.userData.originalPosition = pos.clone();
      this.add(rotorExtension);
    });

    // keep reference for later animation
    this.rotorExtensions = rotorExtensions;
  }

  _addGuards(rotorExtensions) {
    const guards = [0, 1, 2, 3].map(() => new THREE.Mesh(
      new THREE.TorusGeometry(this._getGuardRadius(), this._getGuardRadius()/10, 32, 100),
      new THREE.MeshBasicMaterial({ color: 0xB4B2A9 })));

    guards.forEach((guard, index) => {
      guard.position.set(this._getExtensionX()/2 + this._getGuardRadius(), 0, 0);
      guard.rotation.x = Math.PI / 2;
      rotorExtensions[index].add(guard);
    });
  }

  _addRotorConnections(rotorExtensions) {
    const connections = [0, 1, 2, 3].map(() => new THREE.Mesh(
      new THREE.BoxGeometry(this._getConnectionX(), this._getConnectionX()/10, this._getConnectionX()/10),
      new THREE.MeshBasicMaterial({ color: 0x888780 })));

    this._addRotors(connections);

    connections.forEach((connection, index) => {
      connection.position.set(this._getExtensionX()/2 + this._getConnectionX()/2, 0, 0);
      connection.rotation.x = Math.PI / 2;
      rotorExtensions[index].add(connection);
    });
  }

  _addRotors(connections) {
    this.rotors = [0, 1, 2, 3].map(() => new THREE.Mesh(
      new THREE.CylinderGeometry(this._getRotorRadius(), this._getRotorRadius(), this._getRotorRadius()/2, 32),
      new THREE.MeshBasicMaterial({ color: 0x444441 })));

    this.rotors.forEach((rotor, index) => {
      rotor.rotation.x = Math.PI / 2;
      this._addProppellers(rotor);
      rotor.position.set(this._getConnectionX()/2 + this._getRotorRadius()/2, 0, 0);
      connections[index].add(rotor);
    });
  }

  _addProppellers(rotor) {
    const proppellers = [0, 1, 2, 3].map(() => new THREE.Mesh(
      new THREE.BoxGeometry(this._getProppellerLength(), this._getProppellerLength()/20, this._getProppellerWidth()),
      new THREE.MeshBasicMaterial({ color: 0x2C2C2A })));

    proppellers.forEach((proppeller, index) => {
      proppeller.position.set(
        (this._getRotorRadius() + this._getProppellerLength()/2)*Math.cos(index * Math.PI / 2),
        0,
        (this._getRotorRadius() + this._getProppellerLength()/2)*Math.sin(index * Math.PI / 2)
      );
      proppeller.rotation.y = index * (Math.PI / 2);
      rotor.add(proppeller);
    });
  }
 
  // Toggle fold/unfold target for the arms
  toggleArmsFold() {
    this._targetFold = this._targetFold === 1 ? 0 : 1;
  }

  setArmsFolded(folded) {
    this._targetFold = folded ? 1 : 0;
  }

  // Animate arms folding/unfolding; call every frame
  updateArms() {
    if (!this.rotorExtensions) return;
    if (this._foldProgress === this._targetFold) return;

    const dir = Math.sign(this._targetFold - this._foldProgress);
    this._foldProgress += dir * this._foldSpeed;
    if (dir > 0 && this._foldProgress > this._targetFold) this._foldProgress = this._targetFold;
    if (dir < 0 && this._foldProgress < this._targetFold) this._foldProgress = this._targetFold;

    const scale = (1 - this._foldProgress * (1 - this._foldScale)); // between 1 and foldScale
    this.rotorExtensions.forEach((ext) => {
      const orig = ext.userData.originalPosition;
      if (orig) {
        ext.position.copy(orig.clone().multiplyScalar(scale));
      }
    });
  }

  rotateRotors() {

  // Só roda quando estiver totalmente aberto
  if (this._foldProgress === 0 && this._targetFold === 0) {

    this.rotors.forEach((rotor, index) => {

      // velocidade de rotação
      const speed = 0.4;

      // rotação no eixo Y local
      rotor.rotation.y += speed;

    });
  }
  }

  // Return true when arms are fully extended (fully unfolded)
  isArmsExtended() {
    return this._foldProgress === 0 && this._targetFold === 0;
  }

  // Move drone in an arbitrary direction vector (constant speed)
  // dirVector: THREE.Vector3 (direction); deltaTime: seconds
  moveDirection(dirVector, deltaTime) {
    if (!this.isArmsExtended()) return;
    if (!dirVector || dirVector.lengthSq() === 0) return;
    const dir = dirVector.clone().normalize();
    const distance = this._moveSpeed * (deltaTime || 0);
    this.position.addScaledVector(dir, distance);
  }

  // Rotate drone around Y axis (yaw). direction: -1 (right) or 1 (left). deltaTime: seconds
  rotateYaw(direction, deltaTime) {
    if (!this.isArmsExtended()) return;
    if (!direction) return;
    const angle = direction * this._rotationSpeed * (deltaTime || 0);
    this.rotation.y += angle;
  }

  // Rotate drone around X axis (pitch). direction: 1 (pitch up) or -1 (pitch down). deltaTime: seconds
  rotatePitch(direction, deltaTime) {
    if (!this.isArmsExtended()) return;
    if (!direction) return;
    const angle = direction * this._pitchSpeed * (deltaTime || 0);
    const newPitch = this.rotation.x + angle;
    // clamp pitch between limits
    this.rotation.x = Math.min(Math.max(newPitch, this._pitchLimitMin), this._pitchLimitMax);
  }
}

class Baloon extends THREE.Group {
  constructor() {
    super();

    this._addBody();
    this._addNode();
    this._addStrip();
    this._collisionRadius = 7; // matches SphereGeometry radius in _addBody()
  }

  _addBody() {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(7, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xFF4444 })
    );
    this.add(body);
  }
  
  _addNode() {
    const node = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 2, 16),
      new THREE.MeshBasicMaterial({ color: 0xCC0000 })
    );
    node.position.y = -7;
    this.add(node);
  }

  _addStrip() {
    const strip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 6, 8),
      new THREE.MeshBasicMaterial({ color: 0xEEEEEE })
    );

    strip.position.y = -11; 
    this.add(strip);
  }
}

function addRandomBalloons() {
  const numberOfBalloons = 4;
  const fixedY = 35;

  for (let i = 0; i < numberOfBalloons; i++) {
    const balloon = new Baloon();
    
    const randomX = (Math.random() * 80) - 40; // [-40, 40]
    const randomY = (Math.random() * 20) + fixedY; // [fixedY, fixedY + 20]
    const randomZ = (Math.random() * 80) - 40;

    balloon.position.set(randomX, randomY, randomZ);
    scene.add(balloon);
    balloons.push(balloon);
  }
}

/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
  scene = new THREE.Scene();
  scene.background = BACKGROUND;

  smartWatch = new SmartWatch();
  smartWatch.position.set(0, 0, 0);
  scene.add(smartWatch);
  
  drone = new Drone();
  drone.position.set(0, 3, 0);
  scene.add(drone);

  addRandomBalloons();

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

    topCamera = new THREE.OrthographicCamera(-50 * aspect, 50 * aspect, 50, -50, 1, 1000);
    topCamera.position.set(0, 50, 0);
    topCamera.lookAt(scene.position);
    
    lateralCamera = new THREE.OrthographicCamera(-50 * aspect, 50 * aspect, 50, -50, 1, 1000);
    lateralCamera.position.set(0, 0, 50);
    lateralCamera.lookAt(scene.position);
    
    frontalCamera = new THREE.OrthographicCamera(-50 * aspect, 50 * aspect, 50, -50, 1, 1000);
    frontalCamera.position.set(50, 0, 0);
    frontalCamera.lookAt(scene.position);
    
    orthogonalCamera = new THREE.OrthographicCamera(-50 * aspect, 50 * aspect, 50, -50, 1, 1000);
    orthogonalCamera.position.set(-50, 10, 50);
    orthogonalCamera.lookAt(scene.position);

    perspectiveCamera = new THREE.PerspectiveCamera(70, aspect, 1, 1000);
    perspectiveCamera.position.set(-50, 10, 50);
    perspectiveCamera.lookAt(scene.position);

    camera = perspectiveCamera;

    ////////////////////////
    // CAMERA HELPERS
    ////////////////////////

    const topHelper = new THREE.CameraHelper(topCamera);
    const lateralHelper = new THREE.CameraHelper(lateralCamera);
    const frontalHelper = new THREE.CameraHelper(frontalCamera);
    const orthogonalHelper = new THREE.CameraHelper(orthogonalCamera);
    const perspectiveHelper = new THREE.CameraHelper(perspectiveCamera);

    cameraHelpers.push(
      topHelper,
      lateralHelper,
      frontalHelper,
      orthogonalHelper,
      perspectiveHelper
    );

    cameraHelpers.forEach((helper) => {
      scene.add(helper);
    });
}

/////////////////////
/* CREATE LIGHT(S) */
/////////////////////

////////////////////////
/* CREATE OBJECT3D(S) */
////////////////////////

//////////////////////
/* CHECK COLLISIONS */
//////////////////////
function checkCollisions() {
    if (!drone || balloons.length === 0) return;

    const dronePos = new THREE.Vector3();
    drone.getWorldPosition(dronePos);
    const droneRadius = drone._collisionRadius || 12;

    const collided = [];

    for (let i = balloons.length - 1; i >= 0; i--) {
      const b = balloons[i];
      // skip balloons already popping
      if (b.userData && b.userData.popping) continue;
      const bPos = new THREE.Vector3();
      b.getWorldPosition(bPos);
      const bRadius = b._collisionRadius || 7;
      const rSum = droneRadius + bRadius;
      if (dronePos.distanceToSquared(bPos) <= rSum * rSum) {
        collided.push(b);
      }
    }

    if (collided.length > 0) handleCollisions(collided);
}

///////////////////////
/* HANDLE COLLISIONS */
///////////////////////



function handleCollisions(collidedArray) {
  collidedArray.forEach((b) => {
    if (!b || (b.userData && b.userData.popping)) return;
    b.userData = b.userData || {};
    b.userData.popping = true;
    b.userData.popProgress = 0;
    b.userData.popDuration = 0.8; // seconds
    // store original material opacities and enable transparency
    b.traverse((node) => {
      if (node.isMesh && node.material) {
        node.userData = node.userData || {};
        node.userData.origOpacity = node.material.opacity != null ? node.material.opacity : 1;
        node.material.transparent = true;
      }
    });
    // prevent further collision checks for this balloon
    b.userData.ignoreCollision = true;
  });
  // Lock input while any balloons are popping and clear any existing movement/rotation
  inputLocked = true;
  // clear movement and rotation states to stop the drone immediately
  movementState.left = movementState.right = movementState.up = movementState.down = movementState.forward = movementState.backward = false;
  rotationState.yawLeft = rotationState.yawRight = rotationState.pitchUp = rotationState.pitchDown = false;
  // clear camera pressed flags too
  for (const k in pressed) if (Object.prototype.hasOwnProperty.call(pressed, k)) pressed[k] = false;
}

// Animate popping balloons (fade + shrink) and remove when done
function updatePoppingBalloons(delta) {
  for (let i = balloons.length - 1; i >= 0; i--) {
    const b = balloons[i];
    if (!b.userData || !b.userData.popping) continue;
    b.userData.popProgress += delta;
    const dur = b.userData.popDuration || 0.8;
    const t = Math.min(1, b.userData.popProgress / dur);
    // fade meshes and shrink group
    b.traverse((node) => {
      if (node.isMesh && node.material) {
        const orig = node.userData && node.userData.origOpacity != null ? node.userData.origOpacity : 1;
        node.material.opacity = (1 - t) * orig;
      }
    });
    const s = Math.max(0, 1 - t);
    b.scale.set(s, s, s);
    if (t >= 1) {
      // cleanup axes helpers references
      b.traverse((node) => {
        if (node instanceof THREE.AxesHelper) {
          const idx = axesHelpers.indexOf(node);
          if (idx !== -1) axesHelpers.splice(idx, 1);
        }
      });
      // remove from scene and array
      if (b.parent) b.parent.remove(b);
      balloons.splice(i, 1);
      // dispose geometries/materials to free memory
      b.traverse((node) => {
        if (node.isMesh) {
          if (node.geometry && node.geometry.dispose) node.geometry.dispose();
          if (node.material) {
            if (Array.isArray(node.material)) node.material.forEach(m => m.dispose && m.dispose());
            else node.material.dispose && node.material.dispose();
          }
        }
      });
    }
  }

  // If no balloons are popping anymore, unlock input
  const anyPopping = balloons.some(b => b.userData && b.userData.popping);
  if (!anyPopping) inputLocked = false;
}

////////////
/* UPDATE */
////////////
function update() {
  const delta = clock.getDelta();
  if (pressed.topCamera) {
    camera = topCamera;
    /// TEMP PLEASE DELETE BEFORE SUBMISSION ///
    controls.object = camera;
    controls.update();
    ////////////
    pressed.topCamera = false;
  }
  if (pressed.lateralCamera) {
    camera = lateralCamera;
    /// TEMP PLEASE DELETE BEFORE SUBMISSION ///
    controls.object = camera;
    controls.update();
    ////////////
    pressed.lateralCamera = false;
  }
  if (pressed.frontalCamera) {
    camera = frontalCamera;
    /// TEMP PLEASE DELETE BEFORE SUBMISSION ///
    controls.object = camera;
    controls.update();
    ////////////
    pressed.frontalCamera = false;
  }
  if (pressed.orthogonalCamera) {
    camera = orthogonalCamera;
    /// TEMP PLEASE DELETE BEFORE SUBMISSION ///
    controls.object = camera;
    controls.update();
    ////////////
    pressed.orthogonalCamera = false;
  }
  if (pressed.perspectiveCamera) {
    camera = perspectiveCamera;
    /// TEMP PLEASE DELETE BEFORE SUBMISSION ///
    controls.object = camera;
    controls.update();
    ////////////
    pressed.perspectiveCamera = false;
  }
  if (pressed.mobileCamera) {
    camera = mobileCamera;
    pressed.mobileCamera = false;
  }
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
  drone.rotateRotors();
  // Check collisions after movement and rotation
  checkCollisions();
  // Animate any balloons that are popping
  updatePoppingBalloons(delta);
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
  renderer.setSize(WIDTH, HEIGHT);
  document.body.appendChild(renderer.domElement);

  createScene();
  setupCameras();
  initializeHUD();

  //////////////////////////////
  // TEMP PLEASE DELETE BEFORE SUBMISSION
  //////////////////////////////
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, 0);
  controls.panSpeed = 1.5;
  controls.zoomSpeed = 1.2;
  controls.rotateSpeed = 1.0;
  //////////////////////////////
  //////////////////////////////
  //////////////////////////////

  window.addEventListener("resize", onResize);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////
function animate() {
  stats.begin();

  update();
  // TEMP PLEASE DELETE BEFORE SUBMISSION //
  if (controls) controls.update();
  //////////////////////////////
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
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
}

///////////////////////
/* KEY DOWN CALLBACK */
///////////////////////
function onKeyDown(e) {
  if (inputLocked) return;
  updateHUD(e.keyCode, true);
  switch (e.keyCode) {
    // Camera controls
    case 49:
    case 97:
      pressed.topCamera = true; // 1
      break;
    case 50:
    case 98:
      pressed.lateralCamera = true; // 2
      break;
    case 51:
    case 99:
      pressed.frontalCamera = true; // 3
      break;
    case 52:
    case 100:
      pressed.orthogonalCamera = true; // 4
      break;
    case 53:
    case 101:
      pressed.perspectiveCamera = true; // 5
      break;
    case 54:
    case 102:
      pressed.mobileCamera = true; // 6
      break;

    // H
    case 72:
      helpersVisible = !helpersVisible;
      cameraHelpers.forEach((helper) => {
        helper.visible = helpersVisible;
      });

      axesHelpers.forEach((axis) => {
        axis.visible = helpersVisible;
      });
      toggleHUDKey('key-h', helpersVisible);
      break;

    // 7
    case 55: case 103:
      wireframeActive = !wireframeActive;
      scene.traverse((node) => {
        if (node instanceof THREE.Mesh) node.material.wireframe = wireframeActive;
      });
      toggleHUDKey('key-7', wireframeActive);
      break;
    // Q - fold/unfold drone arms
    case 81: case 113:
        drone.toggleArmsFold();
        toggleHUDKey('key-q', drone._targetFold === 1);
      break;

    // A / D - move drone on X axis (só voa se braços estendidos)
    case 65: case 97: // A
      toggleHUDKey('key-a', true);
      movementState.left = true;
      break;
    case 68: case 100: // D
      toggleHUDKey('key-d', true);
      movementState.right = true;
      break;
    // W / S - move drone on Y axis (continuous)
    case 87: case 119: // W
      toggleHUDKey('key-w', true);
      movementState.up = true;
      break;
    case 83: case 115: // S
      toggleHUDKey('key-s', true);
      movementState.down = true;
      break;

    // U / J - move drone on Z axis (continuous)
    case 85: case 117: // U
      toggleHUDKey('key-u', true);
      movementState.forward = true;
      break;
    case 74: case 106: // J
      toggleHUDKey('key-j', true);
      movementState.backward = true;
      break;
    // I / K - yaw rotation around Y axis
    case 73: case 105: // I
      toggleHUDKey('key-i', true);
      rotationState.yawLeft = true;
      break;
    case 75: case 107: // K
      toggleHUDKey('key-k', true);
      rotationState.yawRight = true;
      break;
    // O / L - pitch rotation around X axis (limited)
    case 79: case 111: // O
      toggleHUDKey('key-o', true);
      rotationState.pitchUp = true;
      break;
    case 76: case 108: // L
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

  switch (e.keyCode) {
    case 65: case 97: // A
      toggleHUDKey('key-a', false);
      movementState.left = false;
      break;
    case 68: case 100: // D
      toggleHUDKey('key-d', false);
      movementState.right = false;
      break;
    case 87: case 119: // W
      toggleHUDKey('key-w', false);
      movementState.up = false;
      break;
    case 83: case 115: // S
      toggleHUDKey('key-s', false);
      movementState.down = false;
      break;
    case 85: case 117: // U
      toggleHUDKey('key-u', false);
      movementState.forward = false;
      break;
    case 74: case 106: // J
      toggleHUDKey('key-j', false);
      movementState.backward = false;
      break;
    case 73: case 105: // I
      toggleHUDKey('key-i', false);
      rotationState.yawLeft = false;
      break;
    case 75: case 107: // K
      toggleHUDKey('key-k', false);
      rotationState.yawRight = false;
      break;
    case 79: case 111: // O
      toggleHUDKey('key-o', false);
      rotationState.pitchUp = false;
      break;
    case 76: case 108: // L
      toggleHUDKey('key-l', false);
      rotationState.pitchDown = false;
      break;
  }
}

function initializeHUD() {
  toggleHUDKey('key-5', true);
  toggleHUDKey('key-h', helpersVisible);
  toggleHUDKey('key-7', false);
}

function updateHUD(keyCode, isPressed) {
  if (keyCode >= 49 && keyCode <= 54 || keyCode >= 97 && keyCode <= 102) {
    let elementId = '';

    switch (keyCode) {
      case 49: case 97:  elementId = 'key-1'; break;
      case 50: case 98:  elementId = 'key-2'; break;
      case 51: case 99:  elementId = 'key-3'; break;
      case 52: case 100: elementId = 'key-4'; break;
      case 53: case 101: elementId = 'key-5'; break;
      case 54: case 102: elementId = 'key-6'; break;
    }

    const el = document.getElementById(elementId);
      if (isPressed) {
        ['key-1', 'key-2', 'key-3', 'key-4', 'key-5', 'key-6'].forEach(id => {
          document.getElementById(id).classList.remove('active');
        });
        el.classList.add('active');
      }
  }
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
animate(); // Devia estar no init???
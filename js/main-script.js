import * as THREE from "three";
import { createBracelet } from './bracelet.js';
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
const BACKGROUND = new THREE.Color(0xA9A9A9);

let topCamera;
let lateralCamera;
let frontalCamera;
let perspectiveCamera;
let orthogonalCamera;
let renderer, scene;
let camera;

let smartWatch, drone;

// Helpers
let cameraHelpers = [];
let helpersVisible = true;

/// TEMP PLEASE DELETE BEFORE SUBMISSION ///
let controls;
////////////

// Flags
let pressed = {
  topCamera: false,
  lateralCamera: false,
  frontalCamera: false,
  orthogonalCamera: false,
  perspectiveCamera: false,
};

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
    
    const bracelet = createBracelet();
    bracelet.position.y = -0.8;
    this.add(bracelet);
    
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
  }

  _getRotorCenters() {
    const d = 18.6;
    return [
      new THREE.Vector3(d, 0, d),
      new THREE.Vector3(-d, 0, d),
      new THREE.Vector3(-d, 0, -d),
      new THREE.Vector3(d, 0, -d),
    ];
  }

  _getExtensionX() {
    return 15;
  }

  _getGuardRadius() {
    return 5;
  }

  _getConnectionX() {
    return this._getGuardRadius();
  }

  _getRotorRadius() {
    return 1;
  }

  _addBaseDescolagem() {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(20, 4, 20),
      new THREE.MeshBasicMaterial({ color: 0xFFBEBB })
    );
    this.add(base);
  }

  _addBotaoDescolagem() {
    const botao = new THREE.Mesh(
      new THREE.BoxGeometry(4, 2, 4),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    botao.position.set(0, 3, 8);
    this.add(botao);
  }

  _addSuporteCamara() {
    const suporte = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1, 4),
      new THREE.MeshBasicMaterial({ color: 0x0000ff })
    );
    suporte.position.set(0, 2.5, -8);
    this.add(suporte);
  }

  _addLens() {
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.3, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );
    lens.position.set(0, 3, -8);
    this.add(lens);
  }
  
  _addRotorExtension() {
    const rotorExtension1 = new THREE.Mesh(
      new THREE.BoxGeometry(this._getExtensionX(), 0.5, 4),
      new THREE.MeshBasicMaterial({ color: 0xabcdef })
    )
    const rotorExtension2 = new THREE.Mesh(
      new THREE.BoxGeometry(this._getExtensionX(), 0.5, 4),
      new THREE.MeshBasicMaterial({ color: 0xabcdef })
    )
    const rotorExtension3 = new THREE.Mesh(
      new THREE.BoxGeometry(this._getExtensionX(), 0.5, 4),
      new THREE.MeshBasicMaterial({ color: 0xabcdef })
    )
    const rotorExtension4 = new THREE.Mesh(
      new THREE.BoxGeometry(this._getExtensionX(), 0.5, 4),
      new THREE.MeshBasicMaterial({ color: 0xabcdef })
    )
    const rotorExtensions = [
      rotorExtension1,
      rotorExtension2,
      rotorExtension3,
      rotorExtension4,
    ];

    this._addGuards(rotorExtensions);
    this._addRotorConnections(rotorExtensions);

    rotorExtension1.position.set(10, 0, 10)
    rotorExtension2.position.set(10, 0, -10)
    rotorExtension3.position.set(-10, 0, -10)
    rotorExtension4.position.set(-10, 0, 10)

    
    rotorExtensions.forEach((rotor, index) => {
      rotor.rotation.y = index * (Math.PI / 2) - (Math.PI / 4);
      this.add(rotor);
    });
  }

  _addGuards(rotorExtensions) {
    const guards = [0, 1, 2, 3].map(() => new THREE.Mesh(
      new THREE.TorusGeometry(this._getGuardRadius(), 0.5, 4, 100),
      new THREE.MeshBasicMaterial({ color: 0xabcdef })
    ));

    guards.forEach((guard, index) => {
      guard.position.set(this._getExtensionX()/2 + this._getGuardRadius(), 0, 0);
      guard.rotation.x = Math.PI / 2;
      rotorExtensions[index].add(guard);
    });
  }

  _addRotorConnections(rotorExtensions) {
    const connections = [0, 1, 2, 3].map(() => new THREE.Mesh(
      new THREE.BoxGeometry(this._getConnectionX(), 0.5, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xabcdef }))
    );

    this._addRotors(connections);

    connections.forEach((connection, index) => {
      connection.position.set(this._getExtensionX()/2 + this._getConnectionX()/2, 0, 0);
      connection.rotation.x = Math.PI / 2;
      rotorExtensions[index].add(connection);
    });
  }

  _addRotors(connections) {
    const rotors = [0, 1, 2, 3].map(() => new THREE.Mesh(
      new THREE.CylinderGeometry(this._getRotorRadius(), this._getRotorRadius(), 0.5, 32),
      new THREE.MeshBasicMaterial({ color: 0xabcdef })
    ));

    rotors.forEach((rotor, index) => {
      rotor.rotation.x = Math.PI / 2;
      rotor.position.set(this._getConnectionX()/2 + this._getRotorRadius()/2, 0, 0);
      connections[index].add(rotor);
    });
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
    //TODO
    }

///////////////////////
/* HANDLE COLLISIONS */
///////////////////////
function handleCollisions() {
    //TODO
    }

////////////
/* UPDATE */
////////////
function update() {
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
  update();
  // TEMP PLEASE DELETE BEFORE SUBMISSION //
  if (controls) controls.update();
  //////////////////////////////
  requestAnimationFrame(animate);
  render();
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

    // H
    case 72:
      helpersVisible = !helpersVisible;
      cameraHelpers.forEach((helper) => {
        helper.visible = helpersVisible;
      });
      break;
    
    // TEMP PLEASE DELETE BEFORE SUBMISSION Ou maybe não. Ponto 5 do enunciado
    case 55: //7
    case 103: //7
      scene.traverse((node) => {
        if (node instanceof THREE.Mesh) node.material.wireframe = !node.material.wireframe;
      });
      break;
    //////////////////////////////
  }
}

///////////////////////
/* KEY UP CALLBACK */
///////////////////////
function onKeyUp(e) {
    //TODO
    }

init();
animate(); // Devia estar no init???
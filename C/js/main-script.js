import * as THREE from "three";
import { AnaglyphEffect } from 'three/addons/effects/AnaglyphEffect.js';
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";

const CONFIG = {
  HEIGHT: window.innerHeight,
  WIDTH: window.innerWidth,
  
  BASE_ROTATION_SPEED: 1,

  TESSERACT: {
    MODEL_ID: "tesseract",

    ROTATION_SPEED: 1,

    OUTER_CUBE_SIZE: 6,
    INNER_CUBE_SIZE: 3,

    CUBE_SCALE_SPEED: 1,

    CUBE_SCALE_MIN: 0.1,

    OUTER_CUBE_COLOUR: new THREE.Color(0x0000ff),
    INNER_CUBE_COLOUR: new THREE.Color(0xff0000),
    CONNECTIONS_COLOUR: new THREE.Color(0x00ff00),
    OUTER_EDGES_COLOUR: new THREE.Color(0x00ffff),
    INNER_EDGES_COLOUR: new THREE.Color(0xffff00),
    IN_SCENE_POS: new THREE.Vector3(0, -2, 0),
  },

  BUNNY: {
    MODEL_ID: "bunny",

    ROTATION_SPEED: 1,

    SCALE: new THREE.Vector3(4, 4, 4), 
    IN_SCENE_POS: new THREE.Vector3(0, -4, 0),
  },
  ARTEMIS: {
    MODEL_ID: "artemis",
    SCALE: new THREE.Vector3(0.04, 0.04, 0.04),
    IN_SCENE_POS: new THREE.Vector3(0, -2, 0),
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

    // Light intensities (increased for better visibility)
    AMBIENT_LIGHT_INTENSITY: 0.3,
    DIRECTIONAL_LIGHT_INTENSITY: 0.8,
    SPOTLIGHT_INTENSITY: 3,
    POINT_LIGHT_INTENSITY: 3,

    // Directional shadow tuning
    DIRECTIONAL_SHADOW_MAP_SIZE: 2048,
    DIRECTIONAL_SHADOW_CAMERA_SIZE: 40,
    DIRECTIONAL_SHADOW_CAMERA_NEAR: 0.5,
    DIRECTIONAL_SHADOW_CAMERA_FAR: 120,
    DIRECTIONAL_SHADOW_BIAS: -0.0001,
    DIRECTIONAL_SHADOW_NORMAL_BIAS: 0.02,

    // Light positions (relative in case of point and spotlights)
    POINT_LIGHT_1_POS: new THREE.Vector3(15, 15, 15),
    POINT_LIGHT_2_POS: new THREE.Vector3(-15, 15, 15),
    SPOTLIGHT_1_POS: new THREE.Vector3(15, 15, 15),
    SPOTLIGHT_2_POS: new THREE.Vector3(-15, 15, 15),
    DIRECTIONAL_LIGHT_POS: new THREE.Vector3(20, 20, 20),

    // Notice that lights do not have a direction defined since they 
    // will be centered on the model
  },

  CAMERA: {
    FOV: 70,
    FOCUS: 10,
    ANAGLYPH_FOCUS: 0.9,
    NEAR: 1,
    FAR: 1000,
    POSITION: { x: 10, y: 5, z: 10 },
  },

  BACKGROUND: new THREE.Color(0x000000),

};

const lightManager = {
  directionalLight: null,
  ambientLight: null,

  spotLightsEnabled: true,
  pointLightsEnabled: true,
  directionalLightEnabled: true,
}

const MATERIAL_MODE = {
  GOURAUD: "gouraud",
  PHONG: "phong",
  BASIC: "basic",
};

let camera;

let renderer, scene, anaglyphEffect;

let tesseract, bunny, artemis;
let models;
let activeModel;
let materialMode = MATERIAL_MODE.PHONG;
let lightingCalculationEnabled = true;
let anaglyphEnabled = false;
let hudVisible = true;
// Clock for frame delta time
const clock = new THREE.Clock();

function updateCameraProjections() {
  const aspect = window.innerWidth / window.innerHeight;

  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

function createShadingMaterials(options) {
  return {
    [MATERIAL_MODE.GOURAUD]: new THREE.MeshLambertMaterial(options),
    [MATERIAL_MODE.PHONG]: new THREE.MeshPhongMaterial({
      ...options,
      specular: 0xaaaaaa,
      shininess: 80,
    }),
    [MATERIAL_MODE.BASIC]: new THREE.MeshBasicMaterial(options),
  };
}

function assignShadingMaterials(mesh, materials) {
  mesh.userData.shadingMaterials = materials;
  mesh.material = materials[materialMode];
}

function applyMaterialMode(root, mode) {
  root.traverse((node) => {
    if (!node.isMesh || !node.userData.shadingMaterials) return;
    node.material = lightingCalculationEnabled
      ? node.userData.shadingMaterials[mode]
      : node.userData.shadingMaterials[MATERIAL_MODE.BASIC];
  });
}

///////////////////////
/* CLASS DEFINITIONS */
///////////////////////

class DisplayModel extends THREE.Group {
  constructor() {
    super();
    
    this.lights = {
      spotlight1: new THREE.SpotLight(CONFIG.LIGHT.SPOTLIGHT_SHADE, CONFIG.LIGHT.SPOTLIGHT_INTENSITY, 60, Math.PI / 4, 0.25, 1),
      spotlight2: new THREE.SpotLight(CONFIG.LIGHT.SPOTLIGHT_SHADE, CONFIG.LIGHT.SPOTLIGHT_INTENSITY, 60, Math.PI / 4, 0.25, 1),
      pointLight1: new THREE.PointLight(CONFIG.LIGHT.POINT_LIGHT_SHADE, CONFIG.LIGHT.POINT_LIGHT_INTENSITY, 60, 1),
      pointLight2: new THREE.PointLight(CONFIG.LIGHT.POINT_LIGHT_SHADE, CONFIG.LIGHT.POINT_LIGHT_INTENSITY, 60, 1),
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
  }

  switchSpotLight() {
    const newIntensity = this.lights.spotlight1.intensity > 0 ? 0 : CONFIG.LIGHT.SPOTLIGHT_INTENSITY;
    this.lights.spotlight1.intensity = newIntensity;
    this.lights.spotlight2.intensity = newIntensity;
  }

  switchPointLight() {
    const newIntensity = this.lights.pointLight1.intensity > 0 ? 0 : CONFIG.LIGHT.POINT_LIGHT_INTENSITY;
    this.lights.pointLight1.intensity = newIntensity;
    this.lights.pointLight2.intensity = newIntensity;
  }
}

class Tesseract extends DisplayModel {

  constructor() {
    super();

    // Define Tesseract attributes
    this.modelID = CONFIG.TESSERACT.MODEL_ID;
    this.rotationSpeed = CONFIG.TESSERACT.ROTATION_SPEED;

    // Use per-model in-scene position (lower on screen)
    this.inScenePos = CONFIG.TESSERACT.IN_SCENE_POS || this.inScenePos;

    this.outerCubeSize = CONFIG.TESSERACT.OUTER_CUBE_SIZE;
    this.innerCubeSize = CONFIG.TESSERACT.INNER_CUBE_SIZE;

    this.cubeScaleMin = CONFIG.TESSERACT.CUBE_SCALE_MIN;

    this.cubeScaleSpeed = CONFIG.TESSERACT.CUBE_SCALE_SPEED;

    this.outerCubeColour = CONFIG.TESSERACT.OUTER_CUBE_COLOUR;
    this.innerCubeColour = CONFIG.TESSERACT.INNER_CUBE_COLOUR;
    this.connectionsColour = CONFIG.TESSERACT.CONNECTIONS_COLOUR;
    this.outerEdgesColour = CONFIG.TESSERACT.OUTER_EDGES_COLOUR;
    this.innerEdgesColour = CONFIG.TESSERACT.INNER_EDGES_COLOUR;
    this.elapsedTime = 0;

    // Create normal map
    this.normalMap = this.generateConcentricCirclesNormalMap();

    this.constructTesseract();
  }

  // Load normal map from image file
  generateConcentricCirclesNormalMap() {
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('NormalMap.png');
    return texture;
  }

  // Create cube geometry manually with vertices and faces
  createCubeGeometry(size) {
    const geometry = new THREE.BufferGeometry();
    const half = size / 2;

    // 24 vertices (4 per face) so each face has independent UV mapping
    const positions = new Float32Array([
      // Front (+Z)
      -half, -half,  half,
       half, -half,  half,
       half,  half,  half,
      -half,  half,  half,

      // Back (-Z)
       half, -half, -half,
      -half, -half, -half,
      -half,  half, -half,
       half,  half, -half,

      // Top (+Y)
      -half,  half,  half,
       half,  half,  half,
       half,  half, -half,
      -half,  half, -half,

      // Bottom (-Y)
      -half, -half, -half,
       half, -half, -half,
       half, -half,  half,
      -half, -half,  half,

      // Right (+X)
       half, -half,  half,
       half, -half, -half,
       half,  half, -half,
       half,  half,  half,

      // Left (-X)
      -half, -half, -half,
      -half, -half,  half,
      -half,  half,  half,
      -half,  half, -half,
    ]);

    const normals = new Float32Array([
      // Front
      0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
      // Back
      0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
      // Top
      0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
      // Bottom
      0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
      // Right
      1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
      // Left
      -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    ]);

    // Same UV layout for each face (full texture on every face)
    const faceUV = [0, 0, 1, 0, 1, 1, 0, 1];
    const uvs = new Float32Array([
      ...faceUV, // Front
      ...faceUV, // Back
      ...faceUV, // Top
      ...faceUV, // Bottom
      ...faceUV, // Right
      ...faceUV, // Left
    ]);

    const indices = new Uint16Array([
      0, 1, 2,   2, 3, 0,      // Front
      4, 5, 6,   6, 7, 4,      // Back
      8, 9, 10,  10, 11, 8,    // Top
      12, 13, 14, 14, 15, 12,  // Bottom
      16, 17, 18, 18, 19, 16,  // Right
      20, 21, 22, 22, 23, 20,  // Left
    ]);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    return geometry;
  }

  constructTesseract() {
    // Create outer and inner cube geometries
    const outerGeometry = this.createCubeGeometry(this.outerCubeSize);
    const innerGeometry = this.createCubeGeometry(this.innerCubeSize);

    // Create materials with normal map
    const outerMaterials = createShadingMaterials({
      color: this.outerCubeColour,
      normalMap: this.normalMap,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const innerMaterials = createShadingMaterials({
      color: this.innerCubeColour,
      normalMap: this.normalMap,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Create outer and inner cube meshes
    this.outerCube = new THREE.Mesh(outerGeometry);
    this.innerCube = new THREE.Mesh(innerGeometry);
    assignShadingMaterials(this.outerCube, outerMaterials);
    assignShadingMaterials(this.innerCube, innerMaterials);

    this.outerCube.castShadow = true;
    this.outerCube.receiveShadow = true;
    this.innerCube.castShadow = true;
    this.innerCube.receiveShadow = true;

    // Transparent objects: force stable drawing order so the inner cube remains visible
    this.innerCube.renderOrder = 1;
    this.outerCube.renderOrder = 2;

    this.add(this.outerCube);
    this.add(this.innerCube);

    // Add explicit cube edges with custom colours
    this.createCubeEdges();

    // Create lines connecting vertices
    this.createConnectingLines();
  }

  createCubeEdges() {
    const outerEdgesGeometry = new THREE.EdgesGeometry(this.outerCube.geometry);
    const innerEdgesGeometry = new THREE.EdgesGeometry(this.innerCube.geometry);

    const outerEdgesMaterial = new THREE.LineBasicMaterial({
      color: this.outerEdgesColour,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    const innerEdgesMaterial = new THREE.LineBasicMaterial({
      color: this.innerEdgesColour,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    this.outerEdges = new THREE.LineSegments(outerEdgesGeometry, outerEdgesMaterial);
    this.innerEdges = new THREE.LineSegments(innerEdgesGeometry, innerEdgesMaterial);

    // Attach edges to cubes so scale/rotation updates happen automatically
    this.outerCube.add(this.outerEdges);
    this.innerCube.add(this.innerEdges);

    this.outerEdges.renderOrder = 4;
    this.innerEdges.renderOrder = 4;
  }

  createConnectingLines() {
    this.lineGeometry = new THREE.BufferGeometry();

    const outerHalf = this.outerCubeSize / 2;
    const innerHalf = this.innerCubeSize / 2;

    const outerCorners = [
      [-outerHalf, -outerHalf, -outerHalf],
      [ outerHalf, -outerHalf, -outerHalf],
      [ outerHalf,  outerHalf, -outerHalf],
      [-outerHalf,  outerHalf, -outerHalf],
      [-outerHalf, -outerHalf,  outerHalf],
      [ outerHalf, -outerHalf,  outerHalf],
      [ outerHalf,  outerHalf,  outerHalf],
      [-outerHalf,  outerHalf,  outerHalf],
    ];

    const innerCorners = [
      [-innerHalf, -innerHalf, -innerHalf],
      [ innerHalf, -innerHalf, -innerHalf],
      [ innerHalf,  innerHalf, -innerHalf],
      [-innerHalf,  innerHalf, -innerHalf],
      [-innerHalf, -innerHalf,  innerHalf],
      [ innerHalf, -innerHalf,  innerHalf],
      [ innerHalf,  innerHalf,  innerHalf],
      [-innerHalf,  innerHalf,  innerHalf],
    ];

    this.linePositions = new Float32Array(8 * 2 * 3);
    for (let i = 0; i < 8; i++) {
      const base = i * 6;
      const outer = outerCorners[i];
      const inner = innerCorners[i];

      this.linePositions[base + 0] = outer[0];
      this.linePositions[base + 1] = outer[1];
      this.linePositions[base + 2] = outer[2];
      this.linePositions[base + 3] = inner[0];
      this.linePositions[base + 4] = inner[1];
      this.linePositions[base + 5] = inner[2];
    }

    this.lineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.linePositions, 3)
    );
    this.lineGeometry.computeBoundingSphere();

    const lineMaterial = new THREE.LineBasicMaterial({
      color: this.connectionsColour,
      transparent: true,
      opacity: 0.8,
    });

    this.lines = new THREE.LineSegments(this.lineGeometry, lineMaterial);
    this.lines.renderOrder = 3;
    this.add(this.lines);
  }

  

  rotate(deltaTime) {
    // Calculate rotation angles
    this.elapsedTime += deltaTime;
    const angle = this.rotationSpeed * deltaTime;

    // Rotation
    this.rotation.x += angle;
    this.rotation.y += angle;
    this.rotation.z += angle;

    // Scale
    const scale = Math.abs(Math.sin(this.elapsedTime * this.cubeScaleSpeed)) + this.cubeScaleMin;

    this.scale.set(scale, scale, scale);
  }

}

class Bunny extends DisplayModel {

  constructor() {
    super();

    // Define Bunny attributes
    this.modelID = CONFIG.BUNNY.MODEL_ID;
    this.rotationSpeed = CONFIG.BUNNY.ROTATION_SPEED;

    // Use per-model in-scene position (lower on screen)
    this.inScenePos = CONFIG.BUNNY.IN_SCENE_POS || this.inScenePos;

    this.loadModel();
  }

  loadModel() {
    const loader = new OBJLoader();
    
    loader.load(
      "js/bunny.obj",
      (model) => {
        model.traverse((node) => {
          if (node.isMesh) {
            assignShadingMaterials(
              node,
              createShadingMaterials({ color: 0xffffff })
            );
          }
        });

        model.scale.set(CONFIG.BUNNY.SCALE.x, CONFIG.BUNNY.SCALE.y, CONFIG.BUNNY.SCALE.z);

        this.model = model;
        this.add(model);
      },
      undefined,
      (error) => {
        console.error("Error loading bunny.obj:", error);
      }
    );
  }

}
class Artemis extends DisplayModel {
  // Artemis model: lazy-loaded from js/artemis with MTL textures

  constructor() {
    super();

    // Define Artemis attributes
    this.modelID = CONFIG.ARTEMIS.MODEL_ID;
  }

  loadModel() {
  const mtlLoader = new MTLLoader();
  mtlLoader.load("js/artemis/Artemis.mtl", (materials) => {
    materials.preload();

    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load("js/artemis/Artemis.obj", (object) => {
      object.traverse((node) => {
        if (node.isMesh) {
          const originalMat = node.material || {};
          const options = {
            color: originalMat.color || 0xffffff,
            map: originalMat.map || null,
            normalMap: originalMat.normalMap || null,
            transparent: originalMat.transparent || false,
            opacity: originalMat.opacity ?? 1,
            side: originalMat.side || THREE.DoubleSide,
          };

          assignShadingMaterials(node, createShadingMaterials(options));
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      object.position.set(0, -5, 0);
      object.scale.copy(CONFIG.ARTEMIS.SCALE);
      
      this.model = object;
      this.add(object);
    });
  });
}
  rotate() {
    /* do nothing */
  }

}

/////////////////////
/* CREATE SCENE(S) */
/////////////////////

function createScene() {
  scene = new THREE.Scene();
  scene.background = CONFIG.BACKGROUND;

  tesseract = new Tesseract();
  tesseract.inScene();
  scene.add(tesseract);

  bunny = new Bunny();
  bunny.outOfScene();
  scene.add(bunny);

  artemis = new Artemis();
  artemis.outOfScene();
  scene.add(artemis);

  models = {
    [tesseract.modelID]: tesseract,
    [bunny.modelID]: bunny,
    [artemis.modelID]: artemis
  };

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
    camera.focus = CONFIG.CAMERA.FOCUS;
    camera.position.set(CONFIG.CAMERA.POSITION.x, CONFIG.CAMERA.POSITION.y, CONFIG.CAMERA.POSITION.z);
    camera.lookAt(scene.position);

    updateCameraProjections();
}

////////////////////
//* CREATE LIGHTS */
////////////////////

function setupLights() {
  lightManager.ambientLight = new THREE.AmbientLight(CONFIG.LIGHT.AMBIENT_LIGHT_SHADE, CONFIG.LIGHT.AMBIENT_LIGHT_INTENSITY);
  lightManager.directionalLight = new THREE.DirectionalLight(CONFIG.LIGHT.DIRECTIONAL_LIGHT_SHADE, CONFIG.LIGHT.DIRECTIONAL_LIGHT_INTENSITY);
  
  lightManager.directionalLight.position.copy(CONFIG.LIGHT.DIRECTIONAL_LIGHT_POS);
  lightManager.directionalLight.target.position.copy(CONFIG.POSITION.IN_SCENE_POS);
  lightManager.directionalLight.castShadow = true;
  lightManager.directionalLight.shadow.mapSize.set(
    CONFIG.LIGHT.DIRECTIONAL_SHADOW_MAP_SIZE,
    CONFIG.LIGHT.DIRECTIONAL_SHADOW_MAP_SIZE
  );
  lightManager.directionalLight.shadow.bias = CONFIG.LIGHT.DIRECTIONAL_SHADOW_BIAS;
  lightManager.directionalLight.shadow.normalBias = CONFIG.LIGHT.DIRECTIONAL_SHADOW_NORMAL_BIAS;

  const dirShadowCamera = lightManager.directionalLight.shadow.camera;
  dirShadowCamera.left = -CONFIG.LIGHT.DIRECTIONAL_SHADOW_CAMERA_SIZE;
  dirShadowCamera.right = CONFIG.LIGHT.DIRECTIONAL_SHADOW_CAMERA_SIZE;
  dirShadowCamera.top = CONFIG.LIGHT.DIRECTIONAL_SHADOW_CAMERA_SIZE;
  dirShadowCamera.bottom = -CONFIG.LIGHT.DIRECTIONAL_SHADOW_CAMERA_SIZE;
  dirShadowCamera.near = CONFIG.LIGHT.DIRECTIONAL_SHADOW_CAMERA_NEAR;
  dirShadowCamera.far = CONFIG.LIGHT.DIRECTIONAL_SHADOW_CAMERA_FAR;
  dirShadowCamera.updateProjectionMatrix();

  scene.add(lightManager.ambientLight);
  scene.add(lightManager.directionalLight);
  scene.add(lightManager.directionalLight.target);
  console.log('[setupLights] lights added:', Object.keys(lightManager));
  
  updateToggleButton("toggle-directional-light", lightManager.directionalLightEnabled);
  updateToggleButton("toggle-spotlights", lightManager.spotLightsEnabled);
  updateToggleButton("toggle-point-lights", lightManager.pointLightsEnabled);
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
  if (anaglyphEnabled && anaglyphEffect) {
    anaglyphEffect.render(scene, camera);
    return;
  }

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

  anaglyphEffect = new AnaglyphEffect(renderer);
  anaglyphEffect.setSize(CONFIG.WIDTH, CONFIG.HEIGHT);

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
  if (anaglyphEffect) anaglyphEffect.setSize(window.innerWidth, window.innerHeight);

  if (window.innerHeight > 0 && window.innerWidth > 0) {
    updateCameraProjections();
    console.log('[onResize] camera position:', camera.position.toArray());
  }
}

function initializeHUD() {
  const hud = document.getElementById("hud");

  document.querySelectorAll("[data-model-id]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveModel(button.dataset.modelId);
    });
  });

  const materialButton = document.getElementById("toggle-material");
  if (materialButton) {
    materialButton.addEventListener("click", () => {
      const nextMode = materialMode === MATERIAL_MODE.PHONG
        ? MATERIAL_MODE.GOURAUD
        : MATERIAL_MODE.PHONG;
      setMaterialMode(nextMode);
    });
  }

  const lightingCalculationButton = document.getElementById("toggle-lighting-calculation");
  if (lightingCalculationButton) {
    lightingCalculationButton.addEventListener("click", () => {
      setLightingCalculationEnabled(!lightingCalculationEnabled);
    });
  }

  const anaglyphButton = document.getElementById("toggle-anaglyph");
  if (anaglyphButton) {
    anaglyphButton.addEventListener("click", () => {
      setAnaglyphEnabled(!anaglyphEnabled);
    });
  }

  const pointLightButton = document.getElementById("toggle-point-lights");
  if (pointLightButton) {
    pointLightButton.addEventListener("click", () => {
      setPointLightEnabled();
    });
  }

  const spotLightButton = document.getElementById("toggle-spotlights");
  if (spotLightButton) {
    spotLightButton.addEventListener("click", () => {
      setSpotLightEnabled();
    });
  } 

  const directionalLightButton = document.getElementById("toggle-directional-light");
  if (directionalLightButton) {
    directionalLightButton.addEventListener("click", () => {
      setDirectionalLightEnabled();
    });
  }

  setMaterialMode(materialMode);
  setLightingCalculationEnabled(lightingCalculationEnabled);
  setAnaglyphEnabled(anaglyphEnabled);
  setHudVisible(hudVisible);

  document.addEventListener("click", (event) => {
    if (hudVisible && hud?.contains(event.target)) return;

    setHudVisible(!hudVisible);
  });
}

function setHudVisible(visible) {
  hudVisible = visible;

  const hud = document.getElementById("hud");
  if (!hud) return;

  hud.classList.toggle("hidden", !hudVisible);
  hud.setAttribute("aria-hidden", String(!hudVisible));
}

function updateToggleButton(id, enabled) {
  const button = document.getElementById(id);
  if (!button) return;

  button.classList.toggle("active", enabled);
  button.setAttribute("aria-pressed", String(enabled));
}

function setMaterialMode(mode) {
  materialMode = mode;
  applyMaterialMode(scene, materialMode);

  const materialButton = document.getElementById("toggle-material");
  if (!materialButton) return;

  const phongEnabled = materialMode === MATERIAL_MODE.PHONG;
  materialButton.textContent = phongEnabled ? "Phong" : "Gouraud";
  materialButton.classList.toggle("active", phongEnabled);
  materialButton.setAttribute("aria-pressed", String(phongEnabled));
}

function setLightingCalculationEnabled(enabled) {
  lightingCalculationEnabled = enabled;
  applyMaterialMode(scene, materialMode);
  updateToggleButton("toggle-lighting-calculation", lightingCalculationEnabled);
}

function setAnaglyphEnabled(enabled) {
  anaglyphEnabled = enabled;
  camera.focus = anaglyphEnabled ? CONFIG.CAMERA.ANAGLYPH_FOCUS : CONFIG.CAMERA.FOCUS;
  camera.updateProjectionMatrix();
  updateToggleButton("toggle-anaglyph", anaglyphEnabled);
}

function setDirectionalLightEnabled() {
  lightManager.directionalLightEnabled = !lightManager.directionalLightEnabled;
  lightManager.directionalLight.intensity = lightManager.directionalLightEnabled ? CONFIG.LIGHT.DIRECTIONAL_LIGHT_INTENSITY : 0;
  updateToggleButton("toggle-directional-light", lightManager.directionalLightEnabled);
}

function setPointLightEnabled() {
  lightManager.pointLightsEnabled = !lightManager.pointLightsEnabled;
  for (const modelKey in models) {
    models[modelKey].switchPointLight();
  }
  updateToggleButton("toggle-point-lights", lightManager.pointLightsEnabled);
}

function setSpotLightEnabled() {
  lightManager.spotLightsEnabled = !lightManager.spotLightsEnabled;
  for (const modelKey in models) {
    models[modelKey].switchSpotLight();
  }
  updateToggleButton("toggle-spotlights", lightManager.spotLightsEnabled);
}

function setActiveModel(modelId) {
  console.log('[setActiveModel] requested:', modelId);
  if (activeModel){
    activeModel.outOfScene();
  }

  const model = models[modelId];
  if (!model) {
    console.warn(`[setActiveModel] no model found for id '${modelId}'`);
    return;
  }


  if (typeof model.loadModel === 'function' && !model.model) {
    model.loadModel();
  }

  activeModel = model;
  activeModel.inScene();

  document.querySelectorAll("[data-model-id]").forEach((button) => {
    button.classList.toggle("active", button.dataset.modelId === modelId);
  });
}

init();

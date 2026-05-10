import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

case 69: // Key 'E'
      exportGLTF();
      break;

function exportGLTF() {
  const exporter = new GLTFExporter();

  // 1. Optional: Hide helpers before exporting so they aren't included
  cameraHelpers.forEach(h => h.visible = false);

  const options = {
    trs: false,        // Export position/rotation/scale instead of matrices
    onlyVisible: true, // Only export what is currently visible
    binary: false       // true = .glb (single file), false = .gltf (JSON)
  };

  exporter.parse(
    scene,
    function (result) {
      if (result instanceof ArrayBuffer) {
        saveArrayBuffer(result, 'scene.glTF');
      } else {
        const output = JSON.stringify(result, null, 2);
        saveString(output, 'scene.gltf');
      }
      
      // Restore helpers visibility
      if (helpersVisible) cameraHelpers.forEach(h => h.visible = true);
    },
    function (error) {
      console.error('An error happened during export', error);
    },
    options
  );
}

// Helper to trigger the browser download for .glb
function saveArrayBuffer(buffer, filename) {
  save(new Blob([buffer], { type: 'application/octet-stream' }), filename);
}

// Helper to trigger the browser download for .gltf
function saveString(text, filename) {
  save(new Blob([text], { type: 'text/plain' }), filename);
}

function save(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
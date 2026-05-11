import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

case 69: // Key 'E'
      exportDroneGLTF();
      break;

function exportDroneGLTF() {
  const exporter = new GLTFExporter();

  const exportGroup = new THREE.Group();
  exportGroup.add(drone.clone());
  exportGroup.add(smartWatch.clone());

  const toRemove = [];
  exportGroup.traverse((node) => {
    if (node.name === "bracelet" || node.isAxesHelper || node.isCameraHelper) {
      toRemove.push(node);
      return; 
    }

    if (node.isMesh) {
      node.geometry = node.geometry.clone();
      node.material = node.material.clone();
    } else if (!node.isGroup && node !== exportGroup) {
      toRemove.push(node);
    }
  });

  toRemove.forEach((node) => {
    if (node.parent) {
      node.parent.remove(node);
    }
  });

  // Perform the export
  exporter.parse(
    exportGroup,
    (gltf) => {
      const output = JSON.stringify(gltf, null, 2);
      const blob = new Blob([output], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'drone_and_watch.gltf';
      link.click();

      URL.revokeObjectURL(url);
    },
    (error) => {
      console.error('GLTF export failed:', error);
    },
    { binary: false }
  );
}
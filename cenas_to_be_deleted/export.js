import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

case 69: // Key 'E'
      exportDroneGLTF();
      break;

function exportDroneGLTF() {
  const exporter = new GLTFExporter();

  const exportGroup = new THREE.Group();
  exportGroup.add(drone.clone());

  const toRemove = [];
  exportGroup.traverse((node) => {
    if (node.isMesh) {
      node.geometry = node.geometry.clone();
      node.material = node.material.clone();
    } else if (!node.isGroup && node !== exportGroup) {
      toRemove.push(node);
    }
  });
  toRemove.forEach((node) => node.parent?.remove(node));

  exporter.parse(
    exportGroup,
    (gltf) => {
      const output = JSON.stringify(gltf, null, 2);
      const blob = new Blob([output], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'scene.gltf';
      link.click();

      URL.revokeObjectURL(url);
    },
    (error) => {
      console.error('GLTF export failed:', error);
    },
    { binary: false }
  );
}
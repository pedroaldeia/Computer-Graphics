import * as THREE from 'three';

export function createBracelet() {
  const group = new THREE.Group();

  const matOuter = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
      const matInner = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
  
      const watchW   = 18;
      const strapThk = 1.2;
      const lugZ     = 10;
      const dropY    = -20;  // much deeper curve downward
      const attachY  = 1;
      const segments = 120;  // smoother
  
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, attachY,      lugZ),
        new THREE.Vector3(0, attachY - 2,  lugZ + 6),
        new THREE.Vector3(0, attachY - 10, lugZ + 10), // swings out and down
        new THREE.Vector3(0, dropY,        0),
        new THREE.Vector3(0, attachY - 10, -lugZ - 10),
        new THREE.Vector3(0, attachY - 2,  -lugZ - 6),
        new THREE.Vector3(0, attachY,      -lugZ),
      ]);
  
      const halfW = watchW / 2;
      const halfT = strapThk / 2;
  
      const positions = [];
      const indices   = [];
  
      for (let i = 0; i <= segments; i++) {
        const t      = i / segments;
        const p      = curve.getPoint(t);
        const tan    = curve.getTangentAt(t).normalize();
        const axisX  = new THREE.Vector3(1, 0, 0);
        const normal = new THREE.Vector3().crossVectors(tan, axisX).normalize();
  
        const tl = p.clone().addScaledVector(normal,  halfT).add(new THREE.Vector3(-halfW, 0, 0));
        const tr = p.clone().addScaledVector(normal,  halfT).add(new THREE.Vector3( halfW, 0, 0));
        const bl = p.clone().addScaledVector(normal, -halfT).add(new THREE.Vector3(-halfW, 0, 0));
        const br = p.clone().addScaledVector(normal, -halfT).add(new THREE.Vector3( halfW, 0, 0));
  
        positions.push(tl.x, tl.y, tl.z);
        positions.push(tr.x, tr.y, tr.z);
        positions.push(bl.x, bl.y, bl.z);
        positions.push(br.x, br.y, br.z);
      }
  
      for (let i = 0; i < segments; i++) {
        const b = i * 4, n = b + 4;
        indices.push(b,   n,   b+1,  b+1, n,   n+1); // top face
        indices.push(b+2, b+3, n+2,  b+3, n+3, n+2); // bottom face
        indices.push(b,   b+2, n,    b+2, n+2, n);   // left edge
        indices.push(b+1, n+1, b+3,  b+3, n+1, n+3); // right edge
      }
  
      // end caps
      indices.push(0, 2, 1,  1, 2, 3);
      const L = segments * 4;
      indices.push(L, L+1, L+2,  L+1, L+3, L+2);
  
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
  
      const facePositions = [];
      const faceIndices   = [];
      const edgePositions = [];
      const edgeIndices   = [];
  
      for (let i = 0; i <= segments; i++) {
        const base = i * 4;
        facePositions.push(
          positions[base*3],   positions[base*3+1], positions[base*3+2],   // tl
          positions[(base+1)*3], positions[(base+1)*3+1], positions[(base+1)*3+2], // tr
          positions[(base+2)*3], positions[(base+2)*3+1], positions[(base+2)*3+2], // bl
          positions[(base+3)*3], positions[(base+3)*3+1], positions[(base+3)*3+2], // br
        );
        edgePositions.push(
          positions[base*3],   positions[base*3+1], positions[base*3+2],
          positions[(base+1)*3], positions[(base+1)*3+1], positions[(base+1)*3+2],
          positions[(base+2)*3], positions[(base+2)*3+1], positions[(base+2)*3+2],
          positions[(base+3)*3], positions[(base+3)*3+1], positions[(base+3)*3+2],
        );
      }
  
      for (let i = 0; i < segments; i++) {
        const b = i * 4, n = b + 4;
        // faces (top + bottom) → lighter
        faceIndices.push(b, n, b+1,  b+1, n, n+1);   // top
        faceIndices.push(b+2, b+3, n+2,  b+3, n+3, n+2); // bottom
        // edges (left + right) → darker
        edgeIndices.push(b, b+2, n,    b+2, n+2, n);
        edgeIndices.push(b+1, n+1, b+3,  b+3, n+1, n+3);
      }
  
      const faceGeo = new THREE.BufferGeometry();
      faceGeo.setAttribute('position', new THREE.Float32BufferAttribute(facePositions, 3));
      faceGeo.setIndex(faceIndices);
      faceGeo.computeVertexNormals();
  
      const edgeGeo = new THREE.BufferGeometry();
      edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
      edgeGeo.setIndex(edgeIndices);
      edgeGeo.computeVertexNormals();
  
      group.add(new THREE.Mesh(faceGeo, matInner));
      group.add(new THREE.Mesh(edgeGeo, matOuter));

  return group;
}
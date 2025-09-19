// Line 1: ThreeJSComponent.tsx
import React from 'react';
import * as THREE from 'three';

// Line 4: Component with Three.js elements (should be excluded)
export function ThreeJSComponent() {
  return (
    <div className="three-container">
      <canvas className="webgl-canvas">
        <scene>
          <perspectiveCamera position={[0, 0, 5]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />

          <group rotation={[0, 0, 0]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="hotpink" />
            </mesh>

            <mesh position={[2, 0, 0]}>
              <sphereGeometry args={[0.5, 32, 32]} />
              <meshBasicMaterial color="blue" />
            </mesh>
          </group>

          <points>
            <bufferGeometry />
            <pointsMaterial size={0.1} color="yellow" />
          </points>
        </scene>
      </canvas>

      <div className="controls">
        <button className="control-btn">Rotate X</button>
        <button className="control-btn">Rotate Y</button>
        <input type="range" min="0" max="360" className="rotation-slider" />
      </div>
    </div>
  );
}

// Line 37: Component with member expressions
export function MemberExpressionComponent() {
  return (
    <div>
      <React.Fragment>
        <Motion.div animate={{ x: 100 }}>
          <Framer.Text>Animated text</Framer.Text>
        </Motion.div>
      </React.Fragment>

      <THREE.Mesh>
        <THREE.BoxGeometry />
      </THREE.Mesh>
    </div>
  );
}
// src/constants.ts
// Constants and preset configurations for vite-plugin-component-debugger

import type { Preset, TagOptions } from './types';

/**
 * Default Three.js/React Three Fiber elements to exclude from tagging
 */
export const DEFAULT_THREE_FIBER_ELEMENTS = new Set([
  // Core objects
  'mesh', 'group', 'scene', 'primitive', 'object3D',
  'batchedMesh', 'instancedMesh', 'sprite', 'points', 'lineSegments',
  'lineLoop', 'lOD', 'skinnedMesh', 'skeleton', 'bone',

  // Cameras
  'perspectiveCamera', 'orthographicCamera', 'camera',
  'cubeCamera', 'arrayCamera',

  // Lights
  'ambientLight', 'directionalLight', 'pointLight', 'spotLight',
  'hemisphereLight', 'rectAreaLight', 'lightProbe',
  'ambientLightProbe', 'hemisphereLightProbe',
  'spotLightShadow', 'directionalLightShadow', 'lightShadow',

  // Geometries
  'boxGeometry', 'sphereGeometry', 'planeGeometry', 'cylinderGeometry',
  'coneGeometry', 'circleGeometry', 'ringGeometry', 'torusGeometry',
  'torusKnotGeometry', 'dodecahedronGeometry', 'icosahedronGeometry',
  'octahedronGeometry', 'tetrahedronGeometry', 'polyhedronGeometry',
  'tubeGeometry', 'shapeGeometry', 'extrudeGeometry', 'latheGeometry',
  'edgesGeometry', 'wireframeGeometry', 'capsuleGeometry',

  // Buffer geometries
  'bufferGeometry', 'instancedBufferGeometry',
  'boxBufferGeometry', 'circleBufferGeometry', 'coneBufferGeometry',
  'cylinderBufferGeometry', 'dodecahedronBufferGeometry',
  'extrudeBufferGeometry', 'icosahedronBufferGeometry',
  'latheBufferGeometry', 'octahedronBufferGeometry',
  'planeBufferGeometry', 'polyhedronBufferGeometry',
  'ringBufferGeometry', 'shapeBufferGeometry',
  'sphereBufferGeometry', 'tetrahedronBufferGeometry',
  'torusBufferGeometry', 'torusKnotBufferGeometry',
  'tubeBufferGeometry',

  // Materials
  'meshBasicMaterial', 'meshStandardMaterial', 'meshPhysicalMaterial',
  'meshPhongMaterial', 'meshToonMaterial', 'meshNormalMaterial',
  'meshLambertMaterial', 'meshDepthMaterial', 'meshDistanceMaterial',
  'meshMatcapMaterial', 'lineDashedMaterial', 'lineBasicMaterial',
  'material', 'rawShaderMaterial', 'shaderMaterial', 'shadowMaterial',
  'spriteMaterial', 'pointsMaterial',

  // Helpers
  'spotLightHelper', 'skeletonHelper', 'pointLightHelper',
  'hemisphereLightHelper', 'gridHelper', 'polarGridHelper',
  'directionalLightHelper', 'cameraHelper', 'boxHelper',
  'box3Helper', 'planeHelper', 'arrowHelper', 'axesHelper',

  // Textures
  'texture', 'videoTexture', 'dataTexture', 'dataTexture3D',
  'compressedTexture', 'cubeTexture', 'canvasTexture', 'depthTexture',

  // Math
  'vector2', 'vector3', 'vector4', 'euler', 'matrix3', 'matrix4',
  'quaternion', 'color', 'raycaster',

  // Attributes
  'bufferAttribute', 'float16BufferAttribute', 'float32BufferAttribute',
  'float64BufferAttribute', 'int8BufferAttribute', 'int16BufferAttribute',
  'int32BufferAttribute', 'uint8BufferAttribute', 'uint16BufferAttribute',
  'uint32BufferAttribute', 'instancedBufferAttribute',

  // Other
  'fog', 'fogExp2', 'shape'
]);

/**
 * Preset configurations for common use cases
 */
export const PRESETS: Record<Preset, Partial<TagOptions>> = {
  minimal: {
    includeAttributes: ['id'],
    includeProps: false,
    includeContent: false
  },
  testing: {
    includeAttributes: ['id', 'name', 'component'],
    includeProps: false,
    includeContent: false
  },
  debugging: {
    includeProps: true,
    includeContent: true,
    debug: true
  },
  production: {
    includeAttributes: ['id', 'line'],
    transformers: {
      path: (p) => p.split('/').slice(-2).join('/'), // Only last 2 segments
      id: (id) => {
        const parts = id.split(':');
        return parts.length > 2 ? parts.slice(-2).join(':') : id; // Only line:col
      }
    }
  }
};

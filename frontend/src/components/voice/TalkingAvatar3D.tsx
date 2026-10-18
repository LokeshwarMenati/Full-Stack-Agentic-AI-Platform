import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { VoiceState } from '../../types';

interface TalkingAvatar3DProps {
  state: VoiceState;
  audioLevels?: number[];
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'cinematic';
  className?: string;
}

export const TalkingAvatar3D: React.FC<TalkingAvatar3DProps> = ({
  state,
  audioLevels = [15, 20, 15, 25, 20, 15],
  size = 'cinematic',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [modelType, setModelType] = useState<'custom_glb' | 'procedural_3d'>('procedural_3d');

  // Audio intensity calculation (0 to 1)
  const avgLevel = audioLevels.reduce((a, b) => a + b, 0) / (audioLevels.length || 1);
  const normalizedLevel = Math.min(1, Math.max(0, avgLevel / 100));

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-36 h-36',
    lg: 'w-56 h-56 sm:w-64 sm:h-64',
    xl: 'w-72 h-72 sm:w-80 sm:h-80',
    '2xl': 'w-80 h-80 sm:w-96 sm:h-96',
    '3xl': 'w-96 h-96 md:w-[440px] md:h-[440px]',
    cinematic: 'w-72 h-72 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px] lg:w-[460px] lg:h-[460px]',
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    let width = container.clientWidth || 400;
    let height = container.clientHeight || 400;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.25, 3.4);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // 3. Cinematic Lighting
    const ambientLight = new THREE.AmbientLight(0x0c1e38, 1.8);
    scene.add(ambientLight);

    const frontKeyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    frontKeyLight.position.set(0.5, 1.5, 2.5);
    scene.add(frontKeyLight);

    const cyanRimLight = new THREE.DirectionalLight(0x00e5ff, 3.8);
    cyanRimLight.position.set(-1.8, 1.2, -1.5);
    scene.add(cyanRimLight);

    const blueFillLight = new THREE.DirectionalLight(0x176bff, 2.6);
    blueFillLight.position.set(1.8, -0.8, -1.2);
    scene.add(blueFillLight);

    // 4. Holographic Ambient Orbiting Particle Rings
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    const particleCount = 180;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 1.38 + Math.random() * 0.15;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.45;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      // Cyan to blue gradient
      colors[i * 3] = 0.0;
      colors[i * 3 + 1] = 0.85 + Math.random() * 0.15;
      colors[i * 3 + 2] = 1.0;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    ringGroup.add(particleSystem);

    // Thin Holographic Torus Ring
    const torusGeo = new THREE.TorusGeometry(1.42, 0.008, 16, 100);
    const torusMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.45,
    });
    const torusMesh = new THREE.Mesh(torusGeo, torusMat);
    torusMesh.rotation.x = Math.PI / 2.3;
    ringGroup.add(torusMesh);

    // 5. Rigged Avatar Anatomy
    const avatarGroup = new THREE.Group();
    scene.add(avatarGroup);

    // Morph target & blendshape references
    let gltfMeshList: THREE.Mesh[] = [];
    let jawMesh: THREE.Mesh | null = null;
    let upperLipMesh: THREE.Mesh | null = null;
    let leftEyeGroup: THREE.Group | null = null;
    let rightEyeGroup: THREE.Group | null = null;
    let leftEyelid: THREE.Mesh | null = null;
    let rightEyelid: THREE.Mesh | null = null;

    // Load custom GLB if available, otherwise procedural 3D model
    const gltfLoader = new GLTFLoader();
    let isGlbLoaded = false;

    const buildProceduralAvatar = () => {
      // Texture Loader for high-res photorealistic face projection
      const textureLoader = new THREE.TextureLoader();
      const faceTexture = textureLoader.load('/ai_avatar_v2.jpg');
      faceTexture.colorSpace = THREE.SRGBColorSpace;

      // Head Base Geometry with PBR Material
      const headGeo = new THREE.SphereGeometry(0.85, 48, 48);
      // Morph head slightly for natural human jaw and chin contours
      const pos = headGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const z = pos.getZ(i);
        // Slightly narrow the chin and jaw
        if (y < -0.2) {
          pos.setX(i, pos.getX(i) * 0.88);
        }
        // Project facial profile forward
        if (z > 0.3 && y > -0.4 && y < 0.4) {
          pos.setZ(i, z * 1.08);
        }
      }
      headGeo.computeVertexNormals();

      const headMat = new THREE.MeshStandardMaterial({
        map: faceTexture,
        roughness: 0.55,
        metalness: 0.1,
      });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.position.set(0, 0.15, 0);
      avatarGroup.add(headMesh);

      // Neck & Shoulder Bust
      const neckGeo = new THREE.CylinderGeometry(0.38, 0.58, 0.65, 32);
      const neckMat = new THREE.MeshStandardMaterial({
        color: 0x071329,
        roughness: 0.7,
        metalness: 0.2,
      });
      const neckMesh = new THREE.Mesh(neckGeo, neckMat);
      neckMesh.position.set(0, -0.65, 0);
      avatarGroup.add(neckMesh);

      // Shoulders Base Curve
      const shoulderGeo = new THREE.BoxGeometry(2.1, 0.45, 0.8);
      const shoulderMesh = new THREE.Mesh(shoulderGeo, neckMat);
      shoulderMesh.position.set(0, -0.92, 0);
      avatarGroup.add(shoulderMesh);

      // Articulated Jaw for Speech Lip-Sync
      const jawGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.14, 24);
      const jawMat = new THREE.MeshStandardMaterial({
        color: 0x061124,
        roughness: 0.6,
      });
      jawMesh = new THREE.Mesh(jawGeo, jawMat);
      jawMesh.position.set(0, -0.24, 0.76);
      jawMesh.rotation.x = 0.25;
      avatarGroup.add(jawMesh);

      // Articulated Upper Lip Accent
      const lipGeo = new THREE.BoxGeometry(0.26, 0.05, 0.08);
      const lipMat = new THREE.MeshStandardMaterial({
        color: 0x1a2e4a,
        roughness: 0.5,
      });
      upperLipMesh = new THREE.Mesh(lipGeo, lipMat);
      upperLipMesh.position.set(0, -0.16, 0.84);
      avatarGroup.add(upperLipMesh);

      // Eyes Left & Right Setup
      const createEye = (x: number) => {
        const eyeGroup = new THREE.Group();
        eyeGroup.position.set(x, 0.22, 0.75);

        // Eyeball Sclera
        const scleraGeo = new THREE.SphereGeometry(0.095, 24, 24);
        const scleraMat = new THREE.MeshStandardMaterial({
          color: 0xf5f8ff,
          roughness: 0.2,
        });
        const sclera = new THREE.Mesh(scleraGeo, scleraMat);
        eyeGroup.add(sclera);

        // Iris & Pupil
        const irisGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.03, 20);
        const irisMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
        const iris = new THREE.Mesh(irisGeo, irisMat);
        iris.rotation.x = Math.PI / 2;
        iris.position.z = 0.082;
        eyeGroup.add(iris);

        const pupilGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.035, 16);
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x02050e });
        const pupil = new THREE.Mesh(pupilGeo, pupilMat);
        pupil.rotation.x = Math.PI / 2;
        pupil.position.z = 0.085;
        eyeGroup.add(pupil);

        // Movable Eyelid for Blinking
        const eyelidGeo = new THREE.SphereGeometry(0.102, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const eyelidMat = new THREE.MeshStandardMaterial({
          color: 0x0a1830,
          roughness: 0.6,
        });
        const eyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
        eyelid.position.set(0, 0.015, 0);
        eyelid.rotation.x = -Math.PI / 2; // Open by default
        eyeGroup.add(eyelid);

        return { eyeGroup, eyelid };
      };

      const left = createEye(-0.25);
      leftEyeGroup = left.eyeGroup;
      leftEyelid = left.eyelid;
      avatarGroup.add(leftEyeGroup);

      const right = createEye(0.25);
      rightEyeGroup = right.eyeGroup;
      rightEyelid = right.eyelid;
      avatarGroup.add(rightEyeGroup);
    };

    // Attempt loading custom GLB if user provided one
    gltfLoader.load(
      '/models/avatar.glb',
      (gltf) => {
        isGlbLoaded = true;
        setModelType('custom_glb');
        const root = gltf.scene;
        root.scale.set(1.5, 1.5, 1.5);
        root.position.set(0, -1.2, 0);
        avatarGroup.add(root);

        // Collect all meshes with morph targets
        root.traverse((node) => {
          if ((node as THREE.Mesh).isMesh && (node as THREE.Mesh).morphTargetDictionary) {
            gltfMeshList.push(node as THREE.Mesh);
          }
        });
      },
      undefined,
      () => {
        // Fallback gracefully to procedural 3D avatar
        isGlbLoaded = false;
        setModelType('procedural_3d');
        buildProceduralAvatar();
      }
    );

    // 6. Dynamic Animation State Machine
    let blinkProgress = 0;
    let isBlinking = false;
    let nextBlinkTime = performance.now() + 2500;
    let nextGazeShiftTime = performance.now() + 2000;
    let targetGazeX = 0;
    let targetGazeY = 0;
    let currentGazeX = 0;
    let currentGazeY = 0;
    let currentJawOpen = 0;
    let targetJawOpen = 0;
    let currentHeadPitch = 0;
    let currentHeadYaw = 0;
    let currentHeadRoll = 0;
    let animFrameId: number;

    const clock = new THREE.Clock();

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const now = performance.now();
      const elapsedTime = clock.getElapsedTime();

      // Ambient Holographic Particle Ring Rotation
      ringGroup.rotation.y = elapsedTime * 0.15;
      ringGroup.rotation.z = Math.sin(elapsedTime * 0.25) * 0.08;

      // A. Organic Breathing Simulation (0.2 Hz Sine Wave)
      const breathOffset = Math.sin(elapsedTime * 1.6) * 0.022;
      avatarGroup.position.y = breathOffset;

      // B. Autonomous Blinking Logic (every 2.5 - 4.5s, duration ~140ms)
      if (now > nextBlinkTime && !isBlinking) {
        isBlinking = true;
        blinkProgress = 0;
      }

      if (isBlinking) {
        blinkProgress += 0.16;
        if (blinkProgress >= Math.PI) {
          isBlinking = false;
          blinkProgress = 0;
          nextBlinkTime = now + 2400 + Math.random() * 2600;
        }
      }
      const blinkValue = Math.sin(blinkProgress);

      // C. Autonomous Saccadic Eye Movements
      if (now > nextGazeShiftTime) {
        targetGazeX = (Math.random() - 0.5) * 0.12;
        targetGazeY = (Math.random() - 0.5) * 0.08;
        nextGazeShiftTime = now + 1800 + Math.random() * 2200;
      }
      currentGazeX += (targetGazeX - currentGazeX) * 0.08;
      currentGazeY += (targetGazeY - currentGazeY) * 0.08;

      if (leftEyeGroup && rightEyeGroup) {
        leftEyeGroup.rotation.y = currentGazeX;
        leftEyeGroup.rotation.x = -currentGazeY;
        rightEyeGroup.rotation.y = currentGazeX;
        rightEyeGroup.rotation.x = -currentGazeY;
      }

      // Eyelid blinking movement
      if (leftEyelid && rightEyelid) {
        const lidRot = -Math.PI / 2 + blinkValue * (Math.PI / 2);
        leftEyelid.rotation.x = lidRot;
        rightEyelid.rotation.x = lidRot;
      }

      // D. Speech-Driven Real-Time Lip-Sync
      if (state === 'speaking') {
        // Modulate mouth opening based on live audio intensity & rapid vocal cadence fluctuations
        const syllableRhythm = (Math.sin(elapsedTime * 22) + 1) * 0.5;
        targetJawOpen = Math.min(1.0, normalizedLevel * 1.35 * (0.6 + syllableRhythm * 0.4));
      } else {
        targetJawOpen = 0;
      }
      currentJawOpen += (targetJawOpen - currentJawOpen) * 0.28;

      if (jawMesh) {
        jawMesh.position.y = -0.24 - currentJawOpen * 0.095;
        jawMesh.scale.set(1 + currentJawOpen * 0.15, 1, 1 + currentJawOpen * 0.2);
      }
      if (upperLipMesh) {
        upperLipMesh.position.y = -0.16 + currentJawOpen * 0.02;
      }

      // E. Head Gestures & Attentive Posture by Voice State
      let targetHeadPitch = 0;
      let targetHeadYaw = 0;
      let targetHeadRoll = 0;

      if (state === 'speaking') {
        // Natural speech micro-head nodding and cadence accents
        targetHeadPitch = Math.sin(elapsedTime * 4.5) * 0.045 + currentJawOpen * 0.04;
        targetHeadYaw = Math.sin(elapsedTime * 2.2) * 0.05;
        targetHeadRoll = Math.sin(elapsedTime * 1.8) * 0.025;
      } else if (state === 'listening') {
        // Attentive listening posture: slight forward pitch & inquisitive tilt
        const listeningNod = Math.sin(elapsedTime * 3) * (0.015 + normalizedLevel * 0.035);
        targetHeadPitch = -0.04 + listeningNod;
        targetHeadYaw = 0.03;
        targetHeadRoll = -0.035;
      } else if (state === 'processing' || state === 'transcribing') {
        // Thinking posture: head turns slightly upwards and aside
        targetHeadPitch = 0.08 + Math.sin(elapsedTime * 1.5) * 0.02;
        targetHeadYaw = -0.08;
        targetHeadRoll = 0.04;
      } else {
        // Idle calm posture
        targetHeadPitch = Math.sin(elapsedTime * 0.8) * 0.02;
        targetHeadYaw = Math.sin(elapsedTime * 0.6) * 0.02;
        targetHeadRoll = 0;
      }

      currentHeadPitch += (targetHeadPitch - currentHeadPitch) * 0.08;
      currentHeadYaw += (targetHeadYaw - currentHeadYaw) * 0.08;
      currentHeadRoll += (targetHeadRoll - currentHeadRoll) * 0.08;

      avatarGroup.rotation.x = currentHeadPitch;
      avatarGroup.rotation.y = currentHeadYaw;
      avatarGroup.rotation.z = currentHeadRoll;

      // F. Custom GLB Morph Targets (if glb loaded)
      if (isGlbLoaded && gltfMeshList.length > 0) {
        gltfMeshList.forEach((mesh) => {
          if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
          const dict = mesh.morphTargetDictionary;
          const inf = mesh.morphTargetInfluences;

          // Standard ARKit / Oculus blendshapes
          const jawIndices = [dict['jawOpen'], dict['mouthOpen'], dict['viseme_aa'], dict['v_aa']];
          jawIndices.forEach((idx) => {
            if (idx !== undefined) inf[idx] = currentJawOpen;
          });

          const blinkIndices = [dict['eyesClosed'], dict['eyeBlinkLeft'], dict['eyeBlinkRight'], dict['blink']];
          blinkIndices.forEach((idx) => {
            if (idx !== undefined) inf[idx] = blinkValue;
          });
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    // 7. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !renderer || !camera) return;
      const newW = containerRef.current.clientWidth || 400;
      const newH = containerRef.current.clientHeight || 400;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      particleGeometry.dispose();
      particleMaterial.dispose();
      torusGeo.dispose();
      torusMat.dispose();
      renderer.dispose();
    };
  }, [state, normalizedLevel]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center ${sizeClasses[size]} ${className}`}
      role="img"
      aria-label={`NEXUS AI 3D Living Human Avatar: Current state is ${state}`}
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="relative z-10 w-full h-full object-contain pointer-events-none drop-shadow-[0_0_35px_rgba(0,229,255,0.45)]"
      />

      {/* Subtle Bottom Holographic Grounding Glow */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-12 rounded-full bg-cyan-500/20 blur-2xl pointer-events-none" />

      {/* Model Mode Indicator Tag */}
      <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-cyan-500/30 bg-[#071329]/90 text-[10px] font-mono text-cyan-300 backdrop-blur-md pointer-events-none shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span>{modelType === 'custom_glb' ? '3D Rigged Model' : 'Three.js Living Avatar'}</span>
      </div>
    </div>
  );
};

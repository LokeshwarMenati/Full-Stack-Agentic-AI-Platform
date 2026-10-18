# NEXUS AI 3D Avatar Models Directory

Place custom 3D rigged avatar files in this directory.

### Supported Model Formats:
- **`avatar.glb`** or **`avatar.gltf`**: Standard glTF 2.0 binary format.
- Supported blendshapes/morph targets (ARKit / Oculus standard):
  - `jawOpen` / `mouthOpen`: Real-time lip-sync driving mouth vertical opening.
  - `mouthSmile` / `mouthSmileLeft` / `mouthSmileRight`: Expressive emotional feedback.
  - `eyesClosed` / `eyeBlinkLeft` / `eyeBlinkRight`: Natural blinking and eye expressions.
  - `eyeLookUp` / `eyeLookDown` / `eyeLookIn` / `eyeLookOut`: Gaze saccades.
  - `head` / `neck` bones: Head rotation, nodding, and expressive micro-gestures.

If no custom `.glb` model is present, NEXUS AI automatically activates its high-performance procedural 3D humanoid facial mesh with live blendshapes, eye saccades, natural blinking, and speech amplitude lip-sync.

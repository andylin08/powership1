# Airship Demo - Apple-Style 3D Product Page

A cinematic product demo page featuring a 3D airship model with scroll-driven animations, inspired by Apple's product reveal pages.

## Setup Instructions

1. **Place your 3D model**: Add `airship.glb` to the `/public` folder
2. **Install dependencies**: The project will auto-install Three.js and GSAP
3. **Run locally**: Use a local development server to view (required for Three.js)

## Features

- **Scroll-driven 3D animations**: Camera smoothly transitions between feature shots
- **Cinematic lighting**: Physically based rendering with key, fill, and rim lights
- **5 Feature sections**: Wind Turbines, Carbon Sails, Propeller Pods, Stabilizing Fins, Structural Frame
- **Responsive design**: Works on all screen sizes
- **Performance optimized**: DPR capping, efficient animation loop

## Adjusting Camera Shots

The camera positions are configured in the `SHOTS` array in `app/page.tsx`. To customize:

1. **Debug mode**: Press `C` while scrolling to log current camera position to console
2. **Copy coordinates**: Use the logged values to update shot positions
3. **Update SHOTS array**: Modify `cameraPosition`, `cameraLookAt`, and `modelRotation` values

Example shot configuration:
```javascript
{
  name: 'Feature Name',
  label: 'FEATURE 01',
  headline: 'Feature Headline',
  description: 'Feature description text',
  cameraPosition: { x: 8, y: 3, z: 8 },
  cameraLookAt: { x: 0, y: 2, z: 0 },
  modelRotation: { x: 0, y: Math.PI * 0.25, z: 0 }
}
```

## Technical Details

- **Three.js**: 3D rendering with GLTFLoader
- **GSAP + ScrollTrigger**: Smooth scroll-based animations
- **Next.js 15**: Modern React framework
- **Tailwind CSS v4**: Utility-first styling
- **TypeScript**: Type-safe development

## Performance Notes

- Renderer uses `physicallyCorrectLights` for realistic lighting
- ACES tone mapping for cinematic look
- DPR capped at 2 for optimal performance
- Uses `requestAnimationFrame` for smooth 60fps rendering

## Model Requirements

If `airship.glb` is not found, a placeholder cylinder will be displayed. For best results:
- Use a properly scaled GLB/GLTF model
- Ensure model is centered at origin
- Optimize polygon count for web performance

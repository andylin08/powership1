"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

/**
 * SMOOTH VERSION
 * - Single smoothing layer via GSAP scrub (no fighting systems)
 * - Direct camera animation (no lerp jitter)
 * - Continuous flow between sections (no reset jumps)
 * - Proper easing curves for cinematic feel
 */

type Shot = {
  name: string
  label: string
  headline: string
  description: string
  wide: { cam: [number, number, number]; look: [number, number, number]; rotY?: number }
  close: { cam: [number, number, number]; look: [number, number, number]; rotY?: number }
}

const SHOTS: Shot[] = [
  {
    name: "Wind Turbines",
    label: "FEATURE 01",
    headline: "Wind Turbines",
    description: "At cruising altitudes between 6,000 and 8,000 meters, wind speeds regularly exceed 25 meters per second. This airship integrates dual compact wind turbines designed specifically for high-altitude, low-density air, converting jet stream energy directly into electrical power. Unlike ground-based turbines, relative wind speeds at altitude allow small, lightweight rotors to generate disproportionately large power output. Under favorable conditions, the turbines alone can supply hundreds of kilowatts, and at peak wind speeds, they can meet the full propulsion demand of the airship without burning fuel.",

    wide: { cam: [1.65, 0.22, 2.0], look: [1.35, 0.08, 0.3], rotY: 0.35 },
    close: { cam: [1.35, 0.15, 1.4], look: [1.05, 0.05, 0.2], rotY: 0.4 },
  },
  {
    name: "Carbon Sails",
    label: "FEATURE 02",
    headline: "Carbon Sails",
    description: "Five hinged carbon-fiber sails transform the airship’s large surface area into an active energy-harvesting system. Oriented perpendicular to jet stream flow, the sails convert wind force into forward thrust while minimizing drag. The sail geometry and placement are optimized using aerodynamic modeling and finite element analysis, allowing the system to dynamically adjust exposed surface area as wind conditions change. When wind speeds exceed the airship’s cruising velocity, the sails provide sustained propulsion while reducing mechanical load on the engines.",

    wide: { cam: [1.05, 0.72, 1.7], look: [0.65, -.2, 0.0], rotY: 0.12 },
    close: { cam: [0.55, 1.02, 1.35], look: [0.55, -.2, 0.0], rotY: 0.05 },
  },
  {
    name: "Propeller Pods",
    label: "FEATURE 03",
    headline: "Propeller Pods",
    description: "Electric swivel propellers provide precise thrust control during ascent, descent, and low-wind conditions. Powered by turbine-generated electricity or stored energy, the propulsion system is designed for efficiency rather than speed. At altitude, propulsion shifts from traditional engine-driven flight to a hybrid mode where wind-generated power drives the propellers, and direct wind force contributes to forward motion. This dual approach enables stable, controllable flight even within highly variable jet stream environments.",

    wide: { cam: [1.2, 0.55, 2.25], look: [0.6, 0.18, 0.0], rotY: 0.55 },
    close: { cam: [1.05, 0.35, 1.15], look: [0.95, 0.1, 0.25], rotY: 0.55 },
  },
  {
    name: "Stabilizing Fins",
    label: "FEATURE 04",
    headline: "Stabilizing Fins",
    description: "High-altitude winds demand stability. The airship’s rear fins are engineered to counteract pitch, yaw, and roll introduced by turbulent flow while maintaining a low drag profile. Computational fluid dynamics and structural stress testing confirm that fin placement channels wind flow toward the sails and turbines while preserving aerodynamic balance. The result is a platform capable of sustained flight in jet stream conditions without sacrificing control or structural integrity.",

    // PULLED WAY UP + zoomed out
    wide:  { cam: [-0.75, 1.45, -3.35], look: [0.10, -0.15, 0.0], rotY: 1.25 },
    close: { cam: [-0.55, 1.25, -2.85], look: [-0.05, -0.35, -0.15], rotY: 1.25 },
  },
]
export default function AirshipDemo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const heroTextRef = useRef<HTMLDivElement>(null)
  const featureRefs = useRef<(HTMLElement | null)[]>([])
  const footerRef = useRef<HTMLDivElement>(null)

  const [isLoaded, setIsLoaded] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    // Camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000)
    
    // Create a rig object for smooth camera control (GSAP animates this directly)
    const cameraRig = {
      position: new THREE.Vector3(0, 0, 0),
      lookAt: new THREE.Vector3(0, 0, 0),
    }

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.65
    renderer.outputColorSpace = THREE.SRGBColorSpace

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.16))
    scene.add(new THREE.HemisphereLight(0xffffff, 0x080808, 0.16))

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.75)
    keyLight.position.set(6, 10, 6)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x88ccff, 0.16)
    fillLight.position.set(-7, 3, -6)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xffddaa, 0.18)
    rimLight.position.set(-4, 3, 9)
    scene.add(rimLight)

    let airshipModel: THREE.Group | null = null
    let modelCenter = new THREE.Vector3(0, 0, 0)
    let modelRadius = 5
    let baseYaw = 0

    // Helper to get world coordinates from shot config
    const getWorldCoords = (shot: [number, number, number]) => ({
      x: modelCenter.x + shot[0] * modelRadius,
      y: modelCenter.y + shot[1] * modelRadius,
      z: modelCenter.z + shot[2] * modelRadius,
    })

    // GSAP setup
    let gsapCtx: gsap.Context | null = null
    
    const setupScroll = () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())

      // Starting position (hero)
      const heroStart = { cam: [0.0, 0.62, 2.8], look: [0.0, 0.20, 0.0], rotY: 0.0 }
      const startCam = getWorldCoords(heroStart.cam as [number, number, number])
      const startLook = getWorldCoords(heroStart.look as [number, number, number])
      
      cameraRig.position.set(startCam.x, startCam.y, startCam.z)
      cameraRig.lookAt.set(startLook.x, startLook.y, startLook.z)
      camera.position.copy(cameraRig.position)
      camera.lookAt(cameraRig.lookAt)
      
      if (airshipModel) {
        airshipModel.rotation.y = baseYaw + heroStart.rotY
      }

      gsapCtx = gsap.context(() => {
        
        // HERO - fade out text, camera stays put
        gsap.timeline({
          scrollTrigger: {
            trigger: heroTextRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 1.5,
          },
        }).to(heroTextRef.current, {
          opacity: 0,
          y: -50,
          ease: "none",
        })

        // Transition from hero to first feature
        const firstShot = SHOTS[0]
        const firstWide = getWorldCoords(firstShot.wide.cam)
        const firstWideLook = getWorldCoords(firstShot.wide.look)
        
        gsap.timeline({
          scrollTrigger: {
            trigger: featureRefs.current[0],
            start: "top bottom",
            end: "top center",
            scrub: 1.5,
          },
        })
        .to(cameraRig.position, {
          x: firstWide.x,
          y: firstWide.y,
          z: firstWide.z,
          ease: "none",
        }, 0)
        .to(cameraRig.lookAt, {
          x: firstWideLook.x,
          y: firstWideLook.y,
          z: firstWideLook.z,
          ease: "none",
        }, 0)
        .to(airshipModel?.rotation ?? {}, {
          y: baseYaw + (firstShot.wide.rotY ?? 0),
          ease: "none",
        }, 0)

        // FEATURES - smooth continuous animation
        SHOTS.forEach((shot, index) => {
          const featureEl = featureRefs.current[index]
          if (!featureEl) return

          const wide = getWorldCoords(shot.wide.cam)
          const wideLook = getWorldCoords(shot.wide.look)
          const close = getWorldCoords(shot.close.cam)
          const closeLook = getWorldCoords(shot.close.look)

          // Main feature animation: wide -> close
          const featureTl = gsap.timeline({
            scrollTrigger: {
              trigger: featureEl,
              start: "top center",
              end: "center center",
              scrub: 1.5,
            },
          })

          featureTl
            .to(cameraRig.position, {
              x: close.x,
              y: close.y,
              z: close.z,
              ease: "none",
            }, 0)
            .to(cameraRig.lookAt, {
              x: closeLook.x,
              y: closeLook.y,
              z: closeLook.z,
              ease: "none",
            }, 0)
          
          if (airshipModel) {
            featureTl.to(airshipModel.rotation, {
              y: baseYaw + (shot.close.rotY ?? 0),
              ease: "none",
            }, 0)
          }

          // Text fade in
          featureTl.fromTo(
            featureEl.querySelector(".feature-content"),
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, ease: "none" },
            0
          )

          // Transition to next section (or back to wide for last)
          const nextShot = SHOTS[index + 1]
          const exitTl = gsap.timeline({
            scrollTrigger: {
              trigger: featureEl,
              start: "center center",
              end: "bottom center",
              scrub: 1.5,
            },
          })

          if (nextShot) {
            // Transition to next feature's wide position
            const nextWide = getWorldCoords(nextShot.wide.cam)
            const nextWideLook = getWorldCoords(nextShot.wide.look)

            exitTl
              .to(cameraRig.position, {
                x: nextWide.x,
                y: nextWide.y,
                z: nextWide.z,
                ease: "none",
              }, 0)
              .to(cameraRig.lookAt, {
                x: nextWideLook.x,
                y: nextWideLook.y,
                z: nextWideLook.z,
                ease: "none",
              }, 0)

            if (airshipModel) {
              exitTl.to(airshipModel.rotation, {
                y: baseYaw + (nextShot.wide.rotY ?? 0),
                ease: "none",
              }, 0)
            }
          } else {
            // Last feature - go back to wide
            exitTl
              .to(cameraRig.position, {
                x: wide.x,
                y: wide.y,
                z: wide.z,
                ease: "none",
              }, 0)
              .to(cameraRig.lookAt, {
                x: wideLook.x,
                y: wideLook.y,
                z: wideLook.z,
                ease: "none",
              }, 0)

            if (airshipModel) {
              exitTl.to(airshipModel.rotation, {
                y: baseYaw + (shot.wide.rotY ?? 0),
                ease: "none",
              }, 0)
            }
          }

          // Text fade out
          exitTl.to(
            featureEl.querySelector(".feature-content"),
            { opacity: 0, y: -30, ease: "none" },
            0
          )
        })

        // FOOTER - return to centered hero-like view
        if (footerRef.current) {
          const endCam = getWorldCoords([0.0, 0.65, 2.95])
          const endLook = getWorldCoords([0.0, 0.20, 0.0])

          gsap.timeline({
            scrollTrigger: {
              trigger: footerRef.current,
              start: "top center",
              end: "center center",
              scrub: 1.5,
            },
          })
          .to(cameraRig.position, {
            x: endCam.x,
            y: endCam.y,
            z: endCam.z,
            ease: "none",
          }, 0)
          .to(cameraRig.lookAt, {
            x: endLook.x,
            y: endLook.y,
            z: endLook.z,
            ease: "none",
          }, 0)
          .to(airshipModel?.rotation ?? {}, {
            y: baseYaw + 0.0,
            ease: "none",
          }, 0)
        }
      }, containerRef)

      ScrollTrigger.refresh()
    }

    // Load model
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/"); // served from /public/draco
    loader.setDRACOLoader(dracoLoader);
    loader.load(
      "/models/airship1.glb",
      (gltf) => {
        airshipModel = gltf.scene

        // Optimize geometry
        airshipModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.frustumCulled = true
            if (child.geometry) {
              child.geometry.computeBoundingSphere()
            }
          }
        })

        scene.add(airshipModel)

        const box = new THREE.Box3().setFromObject(airshipModel)
        const center = box.getCenter(new THREE.Vector3())
        airshipModel.position.sub(center)

        const box2 = new THREE.Box3().setFromObject(airshipModel)
        const sphere = box2.getBoundingSphere(new THREE.Sphere())
        modelCenter = sphere.center.clone()
        modelRadius = Math.max(0.0001, sphere.radius)

        baseYaw = airshipModel.rotation.y

        setupScroll()

        setLoadProgress(100)
        setTimeout(() => {
          setIsLoaded(true)
          document.body.style.overflow = prevOverflow || "auto"
        }, 250)
      },
      (progress) => {
        const pct =
          progress.total && progress.total > 0 ? (progress.loaded / progress.total) * 100 : Math.min(95, loadProgress + 1)
        setLoadProgress((p) => Math.max(p, Math.round(pct)))
      },
      (error) => {
        console.error("[glb] load failed:", error)
        setLoadProgress(100)
        setTimeout(() => {
          setIsLoaded(true)
          document.body.style.overflow = prevOverflow || "auto"
        }, 250)
      },
    )

    // Render loop - direct camera update from GSAP-controlled rig
    let raf = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      
      // Direct copy from rig (GSAP handles all smoothing via scrub)
      camera.position.copy(cameraRig.position)
      camera.lookAt(cameraRig.lookAt)
      
      renderer.render(scene, camera)
    }
    animate()

    // Debounced resize
    let resizeTimeout: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
        ScrollTrigger.refresh()
      }, 100)
    }
    window.addEventListener("resize", handleResize)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(resizeTimeout)
      window.removeEventListener("resize", handleResize)
      try {
        gsapCtx?.revert()
      } catch {}
      ScrollTrigger.getAll().forEach((t) => t.kill())
      renderer.dispose()
      document.body.style.overflow = prevOverflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={containerRef} className="relative">
      {/* Loading Overlay */}
      <div
        className={[
          "fixed inset-0 z-[999] flex items-center justify-center",
          "bg-black/80 backdrop-blur-xl",
          "transition-opacity duration-500",
          isLoaded ? "opacity-0 pointer-events-none" : "opacity-100",
        ].join(" ")}
      >
        <div className="w-full max-w-xl px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-white/70 text-xs tracking-[0.35em] uppercase">Initializing</div>
            <div className="text-white/60 text-xs tracking-[0.25em] tabular-nums">{loadProgress}%</div>
          </div>

          <div className="text-white text-4xl md:text-5xl font-semibold tracking-tight">POWER</div>
          <div className="mt-3 text-white/65 text-sm leading-relaxed">
            Loading model and lighting for a smooth scroll experience.
          </div>

          <div className="mt-8">
            <div className="h-[2px] w-full bg-white/10 overflow-hidden rounded-full">
              <div
                className="h-full bg-white/70 rounded-full transition-[width] duration-200"
                style={{ width: `${Math.min(100, Math.max(0, loadProgress))}%` }}
              />
            </div>

            <div className="mt-5 flex items-center gap-3 text-white/45 text-xs">
              <div className="h-3 w-3 rounded-full border border-white/30 border-t-white/80 animate-spin" />
              <span className="tracking-[0.18em] uppercase">Please wait</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed 3D Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-6">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="text-white text-xl font-semibold tracking-tight">POWER</div>
          <div className="flex items-center gap-8">
            <a href="#" className="text-white/70 hover:text-white text-sm transition-colors">
              Overview
            </a>
            <a href="#" className="text-white/70 hover:text-white text-sm transition-colors">
              Specs
            </a>
            <a href="#" className="text-white/70 hover:text-white text-sm transition-colors">
              Contact
            </a>
          </div>
        </div>
      </nav>

      {/* Scrollable content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="h-screen flex items-center justify-center">
          <div ref={heroTextRef} className="text-center px-8">
            <div className="text-sm text-white/60 mb-4 tracking-[0.2em] uppercase">The Future of High-Altitude Flight</div>
            <h1 className="text-7xl md:text-8xl lg:text-9xl font-bold text-white mb-6 tracking-tight text-balance">
              POWER
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto text-pretty">
              Propulsion Optimization by Wind Energy Resources - Leveraging Jet Stream Energy to Reduce CO2 Footprint
            </p>
            <div className="mt-12 flex items-center justify-center gap-2 text-white/50 text-sm">
              <div className="w-px h-12 bg-white/30 animate-bounce" />
              <span>Scroll to explore</span>
            </div>
          </div>
        </section>

        {/* Feature Sections */}
        {SHOTS.map((shot, index) => (
          <section
            key={shot.name}
            ref={(el) => {
              featureRefs.current[index] = el
            }}
            className="h-screen flex items-center justify-end px-8 md:px-16 lg:px-24"
          >
            <div className="feature-content max-w-xl">
              <div className="text-xs text-white/50 mb-3 tracking-[0.3em] uppercase">{shot.label}</div>
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight text-balance">
                {shot.headline}
              </h2>
              <p className="text-lg md:text-xl text-white/70 leading-relaxed text-pretty">{shot.description}</p>
            </div>
          </section>
        ))}

        {/* Footer */}
        <section ref={footerRef} className="h-screen flex items-center justify-center px-8">
          <div className="text-center max-w-3xl">
            <h2 className="text-6xl md:text-7xl font-bold text-white mb-6 tracking-tight text-balance">
              Designed for Scale. Built for Impact.
            </h2>
            <p className="text-xl text-white/70 mb-12 text-pretty">
              By harvesting high-altitude wind energy, this airship reduces fuel use, lowers emissions, and rethinks how long-range cargo moves through the sky.
            </p>
            <a
              href="https://youtu.be/ByLC-EhlYDg"
              target="_blank"
              rel="noopener noreferrer"
            >
              <button className="bg-white text-black px-8 py-4 rounded-full text-lg font-semibold hover:bg-white/90 transition-colors">
                Watch Here!
              </button>
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}

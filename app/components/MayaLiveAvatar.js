"use client";

import { useEffect, useRef, useState } from "react";

const moodExpressions = {
  happy: "happy",
  caring: "happy",
  playful: "happy",
  calm: "relaxed",
  upset: "sad",
  sad: "sad",
  angry: "angry",
  surprised: "surprised",
  neutral: "neutral",
};

const fallbackMoodImage = {
  happy: "happy",
  caring: "caring",
  playful: "playful",
  calm: "calm",
  upset: "upset",
  sad: "sad",
  angry: "angry",
  surprised: "surprised",
  neutral: "neutral",
};

export default function MayaLiveAvatar({
  mood = "calm",
  loading = false,
  speaking = false,
  listening = false,
  reacting = false,
  modelUrl = "/models/maya.vrm",
}) {
  const mountRef = useRef(null);
  const vrmRef = useRef(null);
  const targetRef = useRef(null);
  const [modelState, setModelState] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    let renderer;
    let scene;
    let camera;
    let animationFrame;
    let clock;
    let resizeObserver;
    let model;
    let target;
    let rendererDispose = false;

    async function init() {
      if (!mountRef.current) return;

      try {
        const THREE = await import("three");
        const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
        const { VRMLoaderPlugin } = await import("@pixiv/three-vrm");

        if (cancelled || !mountRef.current) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf7f7fa);

        camera = new THREE.PerspectiveCamera(27, 1, 0.01, 100);
        camera.position.set(0, 0.95, 3.05);

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.className = "maya3DCanvas";
        mountRef.current.appendChild(renderer.domElement);

        const hemi = new THREE.HemisphereLight(0xffffff, 0xdce7ff, 2.2);
        scene.add(hemi);

        const key = new THREE.DirectionalLight(0xffffff, 2.4);
        key.position.set(2.5, 4, 4);
        scene.add(key);

        const fill = new THREE.DirectionalLight(0xb9d5ff, 1.1);
        fill.position.set(-3, 1.5, 2);
        scene.add(fill);

        target = new THREE.Object3D();
        target.position.set(0, 1.15, 1.8);
        scene.add(target);
        targetRef.current = target;

        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));

        await new Promise((resolve, reject) => {
          loader.load(modelUrl, resolve, undefined, reject);
        }).then((gltf) => {
          if (cancelled) return;

          model = gltf.userData.vrm;
          if (!model) throw new Error("The VRM file did not contain a VRM avatar.");

          const box = new THREE.Box3().setFromObject(model.scene);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const height = Math.max(size.y, 1);
          const scale = 1.75 / height;

          model.scene.scale.setScalar(scale);
          model.scene.position.x = -center.x * scale;
          model.scene.position.y = -center.y * scale - 0.18;

          const finalBox = new THREE.Box3().setFromObject(model.scene);
          const finalCenter = finalBox.getCenter(new THREE.Vector3());
          target.position.set(finalCenter.x, finalCenter.y + 0.22, 2);

          camera.position.set(0, finalCenter.y + 0.08, 3.05);
          camera.lookAt(target.position);

          scene.add(model.scene);
          vrmRef.current = model;
          setModelState("ready");
        });

        clock = new THREE.Clock();

        const baseY = model?.scene?.position.y ?? 0;

        const render = () => {
          if (cancelled) return;
          animationFrame = requestAnimationFrame(render);

          const delta = Math.min(clock.getDelta(), 0.05);
          const elapsed = clock.elapsedTime;
          const vrm = vrmRef.current;

          if (vrm) {
            const idleSway = Math.sin(elapsed * 0.65) * 0.018;
            const idleBreath = Math.sin(elapsed * 1.15) * 0.004;
            vrm.scene.rotation.y = idleSway;
            vrm.scene.position.y = baseY + idleBreath;

            if (vrm.lookAt && target) {
              target.position.x = Math.sin(elapsed * 0.34) * 0.045;
              target.position.y += Math.sin(elapsed * 0.23) * 0.001;
              vrm.lookAt.target = target;
            }

            const expressions = vrm.expressionManager;
            if (expressions) {
              const expression = moodExpressions[mood] || "relaxed";
              const moodNames = ["happy", "relaxed", "sad", "angry", "surprised", "neutral"];
              for (const name of moodNames) {
                if (expressions.getExpression(name)) {
                  expressions.setValue(name, name === expression ? 0.72 : 0);
                }
              }

              const blinkPulse = Math.max(0, Math.sin(elapsed * 0.52 - 1.1));
              const blink = Math.pow(blinkPulse, 26);
              if (expressions.getExpression("blink")) {
                expressions.setValue("blink", blink);
              }

              let mouth = 0;
              if (speaking) {
                const wave = Math.abs(Math.sin(elapsed * 8.5)) * 0.72 + Math.abs(Math.sin(elapsed * 4.2)) * 0.2;
                mouth = Math.min(1, wave);
              } else if (listening) {
                mouth = 0.02;
              }

              const mouthNames = ["aa", "ih", "ou", "ee", "oh"];
              const mouthWeights = [mouth, mouth * 0.25, mouth * 0.18, mouth * 0.12, mouth * 0.32];
              mouthNames.forEach((name, index) => {
                if (expressions.getExpression(name)) {
                  expressions.setValue(name, mouthWeights[index]);
                }
              });

              expressions.update();
            }

            vrm.update(delta);
          }

          renderer.render(scene, camera);
        };

        const resize = () => {
          if (!mountRef.current || !renderer || !camera) return;
          const width = Math.max(1, mountRef.current.clientWidth);
          const height = Math.max(1, mountRef.current.clientHeight);
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };

        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mountRef.current);
        resize();
        render();
      } catch (error) {
        console.error("Maya VRM avatar failed to load", error);
        if (!cancelled) setModelState("fallback");
      }
    }

    init();

    return () => {
      cancelled = true;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect?.();
      if (renderer && !rendererDispose) {
        rendererDispose = true;
        renderer.dispose();
        renderer.domElement?.remove?.();
      }
      vrmRef.current = null;
      targetRef.current = null;
    };
  }, [modelUrl]);

  const fallbackAsset = fallbackMoodImage[mood] || "calm";

  return (
    <div className={`mayaAvatarWrap ${reacting ? "reacting" : ""} ${speaking ? "speaking" : ""} ${listening ? "listening" : ""}`}>
      <div className="maya3DFrame">
        <div ref={mountRef} className="maya3DViewport" aria-label="Maya 3D live avatar" />

        {modelState !== "ready" && (
          <div className="mayaFallbackLayer">
            <img src={`/maya/${fallbackAsset}.jpg`} alt="Maya" className="mayaFallbackPortrait" draggable="false" />
            <div className="mayaFallbackShade" />
            {modelState === "loading" && <div className="mayaModelLoading">Loading 3D Maya…</div>}
            {modelState === "fallback" && <div className="mayaModelLoading">Add <strong>/public/models/maya.vrm</strong></div>}
          </div>
        )}

        <div className="mayaAvatarGlow" />
        {loading && <div className="mayaStateBadge">Thinking…</div>}
        {listening && !loading && <div className="mayaStateBadge listeningBadge">Listening…</div>}
        {speaking && !loading && <div className="mayaStateBadge speakingBadge">Speaking…</div>}
      </div>
    </div>
  );
}

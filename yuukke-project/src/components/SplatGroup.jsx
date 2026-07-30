import React, { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";

// Shared Gaussian Splat loader/renderer, reused by SplatViewer (single model)
// and ARPlayboard (background + product composited in one scene).
export default function SplatGroup({ url, onLoaded, onError, alphaRemovalThreshold = 5, fixOrientation = true, ...groupProps }) {
  const groupRef = useRef();
  const viewerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const viewer = new GaussianSplats3D.DropInViewer({
      gpuAcceleratedSort: false,
      sharedMemoryForWorkers: false,
    });
    viewerRef.current = viewer;
    groupRef.current?.add(viewer);

    // Tripo3D's model URLs are signed CDN links with no ".splat" extension,
    // so extension-sniffing can't detect the format — force it explicitly.
    // rotation is a 180° flip around X: Tripo's splats load upside down
    // relative to this viewer's camera/world orientation.
    const sceneOptions = { path: url, splatAlphaRemovalThreshold: alphaRemovalThreshold, format: GaussianSplats3D.SceneFormat.Splat };
    if (fixOrientation) sceneOptions.rotation = [1, 0, 0, 0];

    Promise.resolve(viewer.addSplatScenes([sceneOptions], false))
      .then(() => { if (!cancelled) onLoaded?.(); })
      .catch((err) => { if (!cancelled) onError?.(err); });

    return () => {
      cancelled = true;
      groupRef.current?.remove(viewer);
      viewer.dispose?.();
    };
  }, [url]);

  useFrame(() => {
    viewerRef.current?.update?.();
  });

  return <group ref={groupRef} {...groupProps} />;
}

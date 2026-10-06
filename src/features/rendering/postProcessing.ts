import * as THREE from 'three';
import { SETTINGS } from '@/common/settings';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/** Bloom HDR light cores before tone mapping, retaining the ordinary block colors. */
export function createPostProcessing(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    const size = renderer.getSize(new THREE.Vector2());
    const composer = new EffectComposer(renderer);
    composer.renderTarget1.samples = Math.min(SETTINGS.postProcessing.maxSamples, renderer.capabilities.maxSamples);
    composer.renderTarget2.samples = composer.renderTarget1.samples;
    const renderPass = new RenderPass(scene, camera);
    const bloom = new UnrealBloomPass(size, SETTINGS.postProcessing.bloomStrength, SETTINGS.postProcessing.bloomRadius, SETTINGS.postProcessing.bloomThreshold);
    const output = new OutputPass();
    composer.addPass(renderPass);
    composer.addPass(bloom);
    composer.addPass(output);

    return {
        render: () => composer.render(),
        resize: (width: number, height: number) => composer.setSize(width, height),
        dispose() {
            renderPass.dispose();
            bloom.dispose();
            output.dispose();
            composer.dispose();
        },
    };
}

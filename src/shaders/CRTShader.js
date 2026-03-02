/**
 * CRTShader — WebGL post-processing pipeline for retro CRT monitor effect.
 *
 * Features:
 * - Scanlines (horizontal lines)
 * - Vignette (darkened corners)
 * - Chromatic aberration (RGB color fringing)
 * - Screen curvature
 * - Subtle bloom/glow
 * - Flicker effect
 *
 * Usage:
 *   const crtPipeline = this.renderer.pipelines.get('CRTShader');
 *   this.cameras.main.setPostPipeline(CRTShader);
 */

const CRT_FRAG_SHADER = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uTime;
uniform float uIntensity;
uniform float uScanlineWeight;
uniform float uVignetteStrength;
uniform float uChromaticAmount;
uniform float uCurvature;
uniform float uFlicker;

varying vec2 outTexCoord;

// Apply barrel distortion for CRT curvature
vec2 curveRemapUV(vec2 uv) {
    if (uCurvature < 0.01) return uv;

    uv = uv * 2.0 - 1.0;
    vec2 offset = abs(uv.yx) / vec2(uCurvature, uCurvature);
    uv = uv + uv * offset * offset;
    uv = uv * 0.5 + 0.5;
    return uv;
}

// Vignette effect
float vignette(vec2 uv) {
    uv = (uv - 0.5) * 2.0;
    return clamp(1.0 - dot(uv, uv) * uVignetteStrength, 0.0, 1.0);
}

// Scanline effect
float scanline(vec2 uv) {
    float scanlineY = sin(uv.y * uResolution.y * 3.14159);
    return 1.0 - uScanlineWeight * (0.5 - 0.5 * scanlineY);
}

void main() {
    // Apply curvature
    vec2 uv = curveRemapUV(outTexCoord);

    // Check if we're outside the curved screen bounds
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // Chromatic aberration (RGB split)
    float aberration = uChromaticAmount * uIntensity * 0.01;
    vec2 distFromCenter = uv - 0.5;
    float distMag = length(distFromCenter);

    float r = texture2D(uMainSampler, uv + distFromCenter * aberration * distMag).r;
    float g = texture2D(uMainSampler, uv).g;
    float b = texture2D(uMainSampler, uv - distFromCenter * aberration * distMag).b;

    vec3 color = vec3(r, g, b);

    // Apply scanlines
    float scan = scanline(uv);
    color *= mix(1.0, scan, uIntensity);

    // Apply vignette
    float vig = vignette(uv);
    color *= mix(1.0, vig, uIntensity);

    // Flicker effect (subtle brightness variation)
    float flicker = 1.0 - uFlicker * uIntensity * 0.03 * sin(uTime * 8.0 + uv.y * 10.0);
    color *= flicker;

    // Slight bloom/glow (brighten highlights)
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    color += color * smoothstep(0.7, 1.0, luma) * 0.15 * uIntensity;

    // Add subtle noise/grain
    float noise = fract(sin(dot(uv + uTime * 0.001, vec2(12.9898, 78.233))) * 43758.5453);
    color += (noise - 0.5) * 0.02 * uIntensity;

    // Phosphor persistence (slight trailing/ghosting)
    color = pow(color, vec3(1.0 / 1.1));

    gl_FragColor = vec4(color, 1.0);
}
`;

export class CRTShader extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game,
            name: 'CRTShader',
            fragShader: CRT_FRAG_SHADER
        });

        // Default settings (0-1 range)
        this._intensity = 0.7;
        this._scanlineWeight = 0.15;
        this._vignetteStrength = 0.3;
        this._chromaticAmount = 1.0;
        this._curvature = 6.0;
        this._flicker = 0.5;
    }

    onPreRender() {
        // Update time uniform for animations
        this.set1f('uTime', this.game.loop.time * 0.001);
        this.set2f('uResolution', this.renderer.width, this.renderer.height);
        this.set1f('uIntensity', this._intensity);
        this.set1f('uScanlineWeight', this._scanlineWeight);
        this.set1f('uVignetteStrength', this._vignetteStrength);
        this.set1f('uChromaticAmount', this._chromaticAmount);
        this.set1f('uCurvature', this._curvature);
        this.set1f('uFlicker', this._flicker);
    }

    /**
     * Set overall effect intensity (0-1).
     * 0 = no effect, 1 = full effect
     */
    setIntensity(value) {
        this._intensity = Phaser.Math.Clamp(value, 0, 1);
        return this;
    }

    /**
     * Set scanline weight (0-1).
     */
    setScanlineWeight(value) {
        this._scanlineWeight = Phaser.Math.Clamp(value, 0, 1);
        return this;
    }

    /**
     * Set vignette strength (0-1).
     */
    setVignetteStrength(value) {
        this._vignetteStrength = Phaser.Math.Clamp(value, 0, 1);
        return this;
    }

    /**
     * Set chromatic aberration amount (0-5).
     */
    setChromaticAmount(value) {
        this._chromaticAmount = Phaser.Math.Clamp(value, 0, 5);
        return this;
    }

    /**
     * Set screen curvature (0 = flat, 3-10 = curved).
     */
    setCurvature(value) {
        this._curvature = Math.max(0, value);
        return this;
    }

    /**
     * Set flicker intensity (0-1).
     */
    setFlicker(value) {
        this._flicker = Phaser.Math.Clamp(value, 0, 1);
        return this;
    }

    /**
     * Apply a preset configuration.
     */
    applyPreset(preset) {
        const presets = {
            off: { intensity: 0 },
            subtle: {
                intensity: 0.3,
                scanlineWeight: 0.08,
                vignetteStrength: 0.15,
                chromaticAmount: 0.3,
                curvature: 0,
                flicker: 0.2
            },
            classic: {
                intensity: 0.7,
                scanlineWeight: 0.15,
                vignetteStrength: 0.3,
                chromaticAmount: 1.0,
                curvature: 6.0,
                flicker: 0.5
            },
            arcade: {
                intensity: 1.0,
                scanlineWeight: 0.25,
                vignetteStrength: 0.4,
                chromaticAmount: 1.5,
                curvature: 4.0,
                flicker: 0.8
            },
            broken: {
                intensity: 1.0,
                scanlineWeight: 0.3,
                vignetteStrength: 0.5,
                chromaticAmount: 3.0,
                curvature: 3.0,
                flicker: 1.0
            }
        };

        const p = presets[preset] || presets.classic;
        if (p.intensity !== undefined) this._intensity = p.intensity;
        if (p.scanlineWeight !== undefined) this._scanlineWeight = p.scanlineWeight;
        if (p.vignetteStrength !== undefined) this._vignetteStrength = p.vignetteStrength;
        if (p.chromaticAmount !== undefined) this._chromaticAmount = p.chromaticAmount;
        if (p.curvature !== undefined) this._curvature = p.curvature;
        if (p.flicker !== undefined) this._flicker = p.flicker;

        return this;
    }
}

/**
 * Helper to register and apply CRT shader to a scene's camera.
 * @param {Phaser.Scene} scene
 * @param {string} preset - 'off', 'subtle', 'classic', 'arcade', 'broken'
 * @returns {CRTShader|null}
 */
export function applyCRTShader(scene, preset = 'classic') {
    const renderer = scene.game.renderer;

    // Only works with WebGL
    if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) {
        console.warn('CRT shader requires WebGL renderer');
        return null;
    }

    try {
        // Register post pipeline (uses postPipelineClasses map, not regular pipelines)
        renderer.pipelines.addPostPipeline('CRTShader', CRTShader);

        // Apply to main camera using string key (more reliable than class ref)
        scene.cameras.main.setPostPipeline('CRTShader');

        // Get pipeline instance and apply preset
        const pipeline = scene.cameras.main.getPostPipeline('CRTShader');
        if (pipeline) {
            pipeline.applyPreset(preset);
            return pipeline;
        }
    } catch (e) {
        console.warn('CRT shader failed to apply:', e.message);
    }

    return null;
}

/**
 * Remove CRT shader from a scene's camera.
 * @param {Phaser.Scene} scene
 */
export function removeCRTShader(scene) {
    scene.cameras.main.removePostPipeline('CRTShader');
}

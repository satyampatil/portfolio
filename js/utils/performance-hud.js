const SAMPLE_INTERVAL = 300;
const TARGET_FRAME_MS = 1000 / 60;
const GPU_HISTORY_LIMIT = 8;

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function createHudElement() {
    const hud = document.createElement('aside');
    hud.className = 'performance-hud';
    hud.setAttribute('aria-hidden', 'true');
    hud.innerHTML = `
        <div class="performance-hud__scan"></div>
        <div class="performance-hud__topline">
            <span>Live Engine</span>
            <i></i>
        </div>
        <div class="performance-hud__metrics">
            <div class="performance-hud__metric" data-metric="fps">
                <span>FPS</span>
                <strong data-perf-value="fps">--</strong>
                <div class="performance-hud__bar"><em data-perf-bar="fps"></em></div>
            </div>
            <div class="performance-hud__metric" data-metric="gpu">
                <span>GPU</span>
                <strong><b data-perf-value="gpu">--</b><small>%</small></strong>
                <div class="performance-hud__bar"><em data-perf-bar="gpu"></em></div>
            </div>
            <div class="performance-hud__metric" data-metric="cpu">
                <span>CPU</span>
                <strong><b data-perf-value="cpu">--</b><small>%</small></strong>
                <div class="performance-hud__bar"><em data-perf-bar="cpu"></em></div>
            </div>
        </div>
    `;
    document.body.appendChild(hud);
    return hud;
}

function createGpuTimer(renderer) {
    if (!renderer || typeof renderer.getContext !== 'function') return null;

    const gl = renderer.getContext();
    const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    const ext = isWebGL2
        ? gl.getExtension('EXT_disjoint_timer_query_webgl2')
        : gl.getExtension('EXT_disjoint_timer_query');

    if (!ext) return null;

    const pending = [];
    let activeQuery = null;
    let disabled = false;

    const createQuery = () => isWebGL2 ? gl.createQuery() : ext.createQueryEXT();
    const deleteQuery = (query) => isWebGL2 ? gl.deleteQuery(query) : ext.deleteQueryEXT(query);
    const beginQuery = (query) => {
        if (isWebGL2) gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
        else ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query);
    };
    const endQuery = () => {
        if (isWebGL2) gl.endQuery(ext.TIME_ELAPSED_EXT);
        else ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
    };
    const isAvailable = (query) => isWebGL2
        ? gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)
        : ext.getQueryObjectEXT(query, ext.QUERY_RESULT_AVAILABLE_EXT);
    const getResult = (query) => isWebGL2
        ? gl.getQueryParameter(query, gl.QUERY_RESULT)
        : ext.getQueryObjectEXT(query, ext.QUERY_RESULT_EXT);

    return {
        get available() {
            return !disabled;
        },
        begin() {
            if (disabled || activeQuery || pending.length >= GPU_HISTORY_LIMIT) return;

            try {
                if (gl.getParameter(ext.GPU_DISJOINT_EXT)) return;
                activeQuery = createQuery();
                beginQuery(activeQuery);
            } catch (error) {
                activeQuery = null;
                disabled = true;
            }
        },
        end(frameBudget) {
            if (disabled || !activeQuery) return;

            try {
                endQuery();
                pending.push({ query: activeQuery, frameBudget });
                activeQuery = null;
            } catch (error) {
                activeQuery = null;
                disabled = true;
            }
        },
        poll() {
            if (disabled || !pending.length) return null;

            try {
                const sample = pending[0];
                if (!isAvailable(sample.query)) return null;

                pending.shift();
                const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
                const elapsedNs = getResult(sample.query);
                deleteQuery(sample.query);

                if (disjoint || !elapsedNs) return null;
                const elapsedMs = elapsedNs / 1000000;
                return clamp((elapsedMs / Math.max(sample.frameBudget, TARGET_FRAME_MS)) * 100);
            } catch (error) {
                disabled = true;
                return null;
            }
        }
    };
}

function observeLongTasks(onLongTask) {
    if (!('PerformanceObserver' in window)) return null;

    try {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                onLongTask(entry.duration);
            }
        });
        observer.observe({ entryTypes: ['longtask'] });
        return observer;
    } catch (error) {
        return null;
    }
}

export function initPerformanceHud({ renderer } = {}) {
    const hud = createHudElement();
    const values = {
        fps: hud.querySelector('[data-perf-value="fps"]'),
        gpu: hud.querySelector('[data-perf-value="gpu"]'),
        cpu: hud.querySelector('[data-perf-value="cpu"]')
    };
    const bars = {
        fps: hud.querySelector('[data-perf-bar="fps"]'),
        gpu: hud.querySelector('[data-perf-bar="gpu"]'),
        cpu: hud.querySelector('[data-perf-bar="cpu"]')
    };

    const gpuTimer = createGpuTimer(renderer);
    let sampleStart = performance.now();
    let frameStart = sampleStart;
    let lastRafTime = 0;
    let frameBudget = TARGET_FRAME_MS;
    let frameCount = 0;
    let mainThreadMs = 0;
    let longTaskMs = 0;
    let gpuLoad = 0;
    let fallbackGpuLoad = 0;

    observeLongTasks((duration) => {
        longTaskMs += duration;
    });

    const updateDisplay = (now) => {
        const elapsed = now - sampleStart;
        if (elapsed < SAMPLE_INTERVAL) return;

        const fps = frameCount ? Math.round((frameCount * 1000) / elapsed) : 0;
        const cpuFromFrames = (mainThreadMs / elapsed) * 100;
        const cpuFromLongTasks = (longTaskMs / elapsed) * 100;
        const cpu = clamp(Math.max(cpuFromFrames, cpuFromLongTasks));
        const gpu = gpuTimer && gpuTimer.available ? gpuLoad : fallbackGpuLoad;

        values.fps.textContent = String(fps);
        values.cpu.textContent = String(Math.round(cpu));
        values.gpu.textContent = String(Math.round(gpu));

        bars.fps.style.transform = `scaleX(${clamp(fps / 60, 0, 1)})`;
        bars.cpu.style.transform = `scaleX(${cpu / 100})`;
        bars.gpu.style.transform = `scaleX(${gpu / 100})`;

        hud.dataset.state = fps >= 50 && cpu < 72 && gpu < 78 ? 'cool' : 'warm';

        sampleStart = now;
        frameCount = 0;
        mainThreadMs = 0;
        longTaskMs = 0;
    };

    return {
        beginFrame(rafTime = performance.now()) {
            const now = performance.now();
            frameStart = now;
            frameBudget = lastRafTime ? clamp(rafTime - lastRafTime, 8, 100) : TARGET_FRAME_MS;
            lastRafTime = rafTime;
            frameCount += 1;

            const gpuSample = gpuTimer ? gpuTimer.poll() : null;
            if (gpuSample !== null) {
                gpuLoad += (gpuSample - gpuLoad) * 0.24;
            }
        },
        beginGpuSample() {
            if (gpuTimer) gpuTimer.begin();
        },
        endGpuSample() {
            if (gpuTimer) gpuTimer.end(frameBudget);
        },
        endFrame() {
            const now = performance.now();
            const jsMs = now - frameStart;
            mainThreadMs += jsMs;

            if ((!gpuTimer || !gpuTimer.available) && renderer && renderer.info) {
                const { calls = 0, triangles = 0 } = renderer.info.render;
                const scenePressure = clamp((calls * 0.85) + (triangles / 90000), 0, 68);
                const pacingPressure = clamp(((frameBudget - TARGET_FRAME_MS) / TARGET_FRAME_MS) * 100, 0, 100);
                const nextFallback = clamp(scenePressure + (pacingPressure * 0.36));
                fallbackGpuLoad += (nextFallback - fallbackGpuLoad) * 0.18;
            }

            updateDisplay(now);
        }
    };
}

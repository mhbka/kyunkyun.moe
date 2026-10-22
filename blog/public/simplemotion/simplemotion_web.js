/* @ts-self-types="./simplemotion_web.d.ts" */

/**
 * Runs the SD002 pendulum override demonstration.
 */
export class PendulumDemo {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PendulumDemoFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pendulumdemo_free(ptr, 0);
    }
    /**
     * Advances the simulation before evaluating an SVG or canvas frame.
     * @param {number} delta_seconds
     * @param {boolean} clicked
     */
    advance(delta_seconds, clicked) {
        wasm.pendulumdemo_advance(this.__wbg_ptr, delta_seconds, clicked);
    }
    /**
     * Returns the pendulum's current angle in degrees.
     * @returns {number}
     */
    get angleDegrees() {
        const ret = wasm.pendulumdemo_angleDegrees(this.__wbg_ptr);
        return ret;
    }
    /**
     * Returns the pendulum's current angular velocity.
     * @returns {number}
     */
    get angularVelocity() {
        const ret = wasm.pendulumdemo_angularVelocity(this.__wbg_ptr);
        return ret;
    }
    /**
     * Evaluates the current pendulum state into SVG-friendly draw commands.
     * @param {number} frame
     * @returns {any}
     */
    commands(frame) {
        const ret = wasm.pendulumdemo_commands(this.__wbg_ptr, frame);
        return ret;
    }
    /**
     * Advances the simulation from browser input, then draws the current frame.
     * @param {CanvasRenderingContext2D} canvas
     * @param {Map<any, any>} images
     * @param {number} delta_seconds
     * @param {boolean} clicked
     * @param {number} frame
     */
    draw(canvas, images, delta_seconds, clicked, frame) {
        const ret = wasm.pendulumdemo_draw(this.__wbg_ptr, canvas, images, delta_seconds, clicked, frame);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Returns the exported image labels expected in the image map passed to `draw`.
     * @returns {string[]}
     */
    iconLabels() {
        const ret = wasm.pendulumdemo_iconLabels(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Returns the icon details collected by the most recent `draw` call.
     * @returns {string[]}
     */
    lastIconDetails() {
        const ret = wasm.pendulumdemo_lastIconDetails(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Returns the layer details collected by the most recent `draw` call.
     * @returns {string[]}
     */
    lastLayerDetails() {
        const ret = wasm.pendulumdemo_lastLayerDetails(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Creates the SD002 pendulum demonstration from its Motion JSON.
     * @param {string} json
     */
    constructor(json) {
        const ptr0 = passStringToWasm0(json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.pendulumdemo_new(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0];
        PendulumDemoFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Returns the Motion document canvas height.
     * @returns {number}
     */
    get screenHeight() {
        const ret = wasm.pendulumdemo_screenHeight(this.__wbg_ptr);
        return ret;
    }
    /**
     * Returns the Motion document canvas width.
     * @returns {number}
     */
    get screenWidth() {
        const ret = wasm.pendulumdemo_screenWidth(this.__wbg_ptr);
        return ret;
    }
    /**
     * Enables or disables collection of the most recently evaluated icon commands.
     * @param {boolean} enabled
     */
    setDebugIcons(enabled) {
        wasm.pendulumdemo_setDebugIcons(this.__wbg_ptr, enabled);
    }
    /**
     * Enables or disables collection of the most recently evaluated layer transforms.
     * @param {boolean} enabled
     */
    setDebugLayers(enabled) {
        wasm.pendulumdemo_setDebugLayers(this.__wbg_ptr, enabled);
    }
}
if (Symbol.dispose) PendulumDemo.prototype[Symbol.dispose] = PendulumDemo.prototype.free;

/**
 * Evaluates a Motion document and renders its commands to a browser canvas.
 */
export class SimpleMotionPlayer {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SimpleMotionPlayerFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_simplemotionplayer_free(ptr, 0);
    }
    /**
     * Appends a translation and rotation transform to one layer.
     * @param {string} path
     * @param {number} angle
     * @param {number} translate_x
     * @param {number} translate_y
     * @param {number} opacity
     * @param {boolean} direct_icon_only
     */
    appendLayerTransform(path, angle, translate_x, translate_y, opacity, direct_icon_only) {
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.simplemotionplayer_appendLayerTransform(this.__wbg_ptr, ptr0, len0, angle, translate_x, translate_y, opacity, direct_icon_only);
    }
    /**
     * Clears one external layer replacement.
     * @param {string} path
     */
    clearLayerReplacement(path) {
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.simplemotionplayer_clearLayerReplacement(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Clears one external transform override.
     * @param {string} path
     */
    clearLayerTransform(path) {
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.simplemotionplayer_clearLayerTransform(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Evaluates one root motion into SVG-friendly draw commands.
     * @param {number} root_index
     * @param {number} frame
     * @returns {any}
     */
    commands(root_index, frame) {
        const ret = wasm.simplemotionplayer_commands(this.__wbg_ptr, root_index, frame);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Draws one root motion at a timeline frame without clearing the canvas.
     *
     * `images` maps each exported icon label from `iconLabels()` to an `HTMLImageElement`.
     * @param {CanvasRenderingContext2D} canvas
     * @param {Map<any, any>} images
     * @param {number} root_index
     * @param {number} frame
     */
    draw(canvas, images, root_index, frame) {
        const ret = wasm.simplemotionplayer_draw(this.__wbg_ptr, canvas, images, root_index, frame);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Returns the exported image labels expected in the image map passed to `draw`.
     * @returns {string[]}
     */
    iconLabels() {
        const ret = wasm.simplemotionplayer_iconLabels(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Returns the icon details collected by the most recent `draw` call.
     * @returns {string[]}
     */
    lastIconDetails() {
        const ret = wasm.simplemotionplayer_lastIconDetails(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Returns the layer details collected by the most recent `draw` call.
     * @returns {string[]}
     */
    lastLayerDetails() {
        const ret = wasm.simplemotionplayer_lastLayerDetails(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Locks one layer to a point on its inherited timeline.
     * @param {string} path
     * @param {number} inherited_time
     */
    lockLayer(path, inherited_time) {
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.simplemotionplayer_lockLayer(this.__wbg_ptr, ptr0, len0, inherited_time);
    }
    /**
     * Creates a player from the contents of one Motion JSON document.
     * @param {string} json
     */
    constructor(json) {
        const ptr0 = passStringToWasm0(json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.simplemotionplayer_new(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0];
        SimpleMotionPlayerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Replaces one layer with a donor layer selected by path.
     * @param {string} target
     * @param {string} donor
     */
    replaceLayer(target, donor) {
        const ptr0 = passStringToWasm0(target, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(donor, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.simplemotionplayer_replaceLayer(this.__wbg_ptr, ptr0, len0, ptr1, len1);
    }
    /**
     * Returns the root-motion labels that can be passed to `draw` by index.
     * @returns {string[]}
     */
    rootLabels() {
        const ret = wasm.simplemotionplayer_rootLabels(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Returns the Motion document canvas height.
     * @returns {number}
     */
    get screenHeight() {
        const ret = wasm.simplemotionplayer_screenHeight(this.__wbg_ptr);
        return ret;
    }
    /**
     * Returns the Motion document canvas width.
     * @returns {number}
     */
    get screenWidth() {
        const ret = wasm.simplemotionplayer_screenWidth(this.__wbg_ptr);
        return ret;
    }
    /**
     * Enables or disables collection of the most recently evaluated icon commands.
     * @param {boolean} enabled
     */
    setDebugIcons(enabled) {
        wasm.simplemotionplayer_setDebugIcons(this.__wbg_ptr, enabled);
    }
    /**
     * Enables or disables collection of the most recently evaluated layer transforms.
     * @param {boolean} enabled
     */
    setDebugLayers(enabled) {
        wasm.simplemotionplayer_setDebugLayers(this.__wbg_ptr, enabled);
    }
}
if (Symbol.dispose) SimpleMotionPlayer.prototype[Symbol.dispose] = SimpleMotionPlayer.prototype.free;
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_debug_string_4687d8d8c2017d52: function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_41e9ee4f547fc59a: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_drawImage_4c91e25ed237ce22: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
            arg0.drawImage(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9);
        }, arguments); },
        __wbg_error_757e9472f8410341: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_get_464ae6d03ecb8ac7: function(arg0, arg1) {
            const ret = arg0.get(arg1);
            return ret;
        },
        __wbg_instanceof_HtmlImageElement_1e066996b10acb3d: function(arg0) {
            let result;
            try {
                result = arg0 instanceof HTMLImageElement;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_naturalHeight_df41ba6a4a6b0d33: function(arg0) {
            const ret = arg0.naturalHeight;
            return ret;
        },
        __wbg_naturalWidth_c4c567dc88a9ee9a: function(arg0) {
            const ret = arg0.naturalWidth;
            return ret;
        },
        __wbg_new_227d7c05414eb861: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_new_617a8cdb8bb1130e: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_new_ee2291f50781bf1d: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_push_2baf45db356cf468: function(arg0, arg1) {
            const ret = arg0.push(arg1);
            return ret;
        },
        __wbg_restore_c93ba7571816b182: function(arg0) {
            arg0.restore();
        },
        __wbg_save_f32554f1747071d1: function(arg0) {
            arg0.save();
        },
        __wbg_set_145a351398b48c65: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = Reflect.set(arg0, arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_set_globalAlpha_ae4b85201dda64c5: function(arg0, arg1) {
            arg0.globalAlpha = arg1;
        },
        __wbg_stack_3b0d974bbf31e44f: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_transform_4b6d4da6c1cb61d0: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            arg0.transform(arg1, arg2, arg3, arg4, arg5, arg6);
        }, arguments); },
        __wbindgen_generic_0000000000000001: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_generic_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./simplemotion_web_bg.js": import0,
    };
}

const PendulumDemoFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pendulumdemo_free(ptr, 1));
const SimpleMotionPlayerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_simplemotionplayer_free(ptr, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('simplemotion_web_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };

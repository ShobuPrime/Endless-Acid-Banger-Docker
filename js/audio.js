/*
  Copyright 2021 David Whiting
  This work is licensed under a Creative Commons Attribution 4.0 International License
  https://creativecommons.org/licenses/by/4.0/
*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { biRnd } from "./math.js";
const lookupTable = new Map();
const revLook = new Map();
(() => {
    function add(note, n) {
        lookupTable.set(note, n);
        revLook.set(n, note);
    }
    add('A', 9);
    add('A#', 10);
    add('B', 11);
    add('C', 0);
    add('C#', 1);
    add('D', 2);
    add('D#', 3);
    add('E', 4);
    add('F', 5);
    add('F#', 6);
    add('G', 7);
    add('G#', 8);
})();
export function textNoteToNumber(note) {
    const o = note.substring(note.length - 1);
    const n = note.substring(0, note.length - 1);
    // @ts-ignore
    return parseInt(o) * 12 + lookupTable.get(n) + 12;
}
function midiNoteToFrequency(noteNumber) {
    return 440 * Math.pow(2, (noteNumber - 69) / 12);
}
export function midiNoteToText(note) {
    const octave = Math.floor(note / 12);
    const n = Math.floor(note % 12);
    const noteName = revLook.get(n);
    return `${noteName}${octave}`;
}
export function pitch(note) {
    if (typeof (note) === 'number') {
        return midiNoteToFrequency(note);
    }
    else {
        return midiNoteToFrequency(textNoteToNumber(note));
    }
}
// @ts-ignore
export function Audio(au = new (window.AudioContext || window.webkitAudioContext)()) {
    function masterChannel() {
        const gain = au.createGain();
        gain.gain.value = 0.5;
        const limiter = au.createDynamicsCompressor();
        limiter.attack.value = 0.005;
        limiter.release.value = 0.1;
        limiter.ratio.value = 15.0;
        limiter.knee.value = 0.0;
        limiter.threshold.value = -0.5;
        const analyser = au.createAnalyser();
        analyser.fftSize = 2048;
        limiter.connect(analyser);
        gain.connect(limiter);
        limiter.connect(au.destination);
        return {
            in: gain,
            analyser
        };
    }
    function constantSourceCompatible() {
        if (au.createConstantSource) {
            return au.createConstantSource();
        }
        else {
            const src = au.createBufferSource();
            src.buffer = au.createBuffer(1, 256, au.sampleRate);
            const array = src.buffer.getChannelData(0);
            for (let i = 0; i < array.length; i++) {
                array[i] = 1.0;
            }
            const gain = au.createGain();
            const offsetParam = gain.gain;
            src.loop = true;
            src.connect(gain);
            return Object.assign(gain, { offset: offsetParam, start: () => src.start() });
        }
    }
    function decodeAudioDataCompatible(audioData) {
        return new Promise((resolve, reject) => {
            return au.decodeAudioData(audioData, resolve, reject);
        });
    }
    const master = masterChannel();
    function time(s) {
        return new Promise(resolve => { setTimeout(() => resolve(), s * 1000); });
    }
    function tone(pitch, attack, sustain, release, pan = 0.0, destination = master.in) {
        return __awaiter(this, void 0, void 0, function* () {
            const osc = au.createOscillator();
            osc.type = "sawtooth";
            osc.frequency.value = pitch;
            osc.start();
            const filter = au.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = pitch * 4;
            filter.Q.value = 5;
            const gain = au.createGain();
            gain.gain.value = 0.0;
            const panner = au.createPanner();
            panner.panningModel = "equalpower";
            panner.setPosition(pan, 0, 1 - Math.abs(pan));
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(panner);
            panner.connect(destination);
            gain.gain.linearRampToValueAtTime(0.1, au.currentTime + attack);
            yield time(sustain + attack);
            gain.gain.setValueAtTime(0.1, au.currentTime);
            gain.gain.linearRampToValueAtTime(0, au.currentTime + release);
            filter.frequency.linearRampToValueAtTime(Math.max(pitch / 2, 400), au.currentTime + release);
            yield time(release + 0.01);
            osc.stop(au.currentTime);
            panner.disconnect();
        });
    }
    function SimpleToneSynth(attack, sustain, release, destination = master.in) {
        function play(note) {
            tone(pitch(note), attack, sustain, release, biRnd(), destination);
        }
        return {
            play
        };
    }
    function DelayInsert(time, feedback, wet, destination = master.in) {
        const delayNode = au.createDelay(1);
        delayNode.delayTime.value = time;
        const feedbackGain = au.createGain();
        feedbackGain.gain.value = feedback;
        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        const delayGain = au.createGain();
        delayGain.gain.value = wet;
        delayNode.connect(delayGain);
        delayGain.connect(destination);
        const synthOut = au.createGain();
        synthOut.gain.value = 1.0;
        synthOut.connect(delayNode);
        synthOut.connect(destination);
        return {
            in: synthOut,
            feedback: feedbackGain.gain,
            wet: delayGain.gain,
            delayTime: delayNode.delayTime
        };
    }
    function ThreeOh(type = "sawtooth", out = master.in) {
        const filter = au.createBiquadFilter();
        filter.type = "lowpass";
        filter.Q.value = 20;
        filter.frequency.value = 300;
        const pResonance = filter.Q;
        const pCutoff = filter.frequency;
        const decayTimeNode = constantSourceCompatible();
        decayTimeNode.start();
        const pDecay = decayTimeNode.offset;
        const env = constantSourceCompatible();
        env.start();
        env.offset.value = 0.0;
        function trigger() {
        }
        const scaleNode = au.createGain();
        scaleNode.gain.value = 4000;
        const pEnvMod = scaleNode.gain;
        env.connect(scaleNode);
        scaleNode.connect(filter.detune);
        const osc = au.createOscillator();
        osc.type = type;
        osc.frequency.value = 440;
        osc.start();
        const vca = au.createGain();
        vca.gain.value = 0.0;
        osc.connect(vca);
        vca.connect(filter);
        filter.connect(out);
        function noteOn(note, accent = false, glide = false) {
            if (accent) {
                env.offset.cancelScheduledValues(au.currentTime);
                //env.offset.setTargetAtTime(1.0,au.currentTime, 0.001);
                env.offset.setValueAtTime(1.0, au.currentTime);
                env.offset.exponentialRampToValueAtTime(0.01, au.currentTime + pDecay.value / 3);
            }
            else {
                env.offset.cancelScheduledValues(au.currentTime);
                //env.offset.setTargetAtTime(1.0,au.currentTime, 0.001);
                env.offset.setValueAtTime(1.0, au.currentTime);
                env.offset.exponentialRampToValueAtTime(0.01, au.currentTime + pDecay.value);
            }
            osc.frequency.cancelScheduledValues(au.currentTime);
            osc.frequency.setTargetAtTime(midiNoteToFrequency(textNoteToNumber(note)), au.currentTime, glide ? 0.02 : 0.002);
            vca.gain.cancelScheduledValues(au.currentTime);
            vca.gain.setValueAtTime(accent ? 0.2 : 0.15, au.currentTime);
            //vca.gain.setTargetAtTime(accent ? 0.5 : 0.3,au.currentTime, 0.001);
            //vca.gain.setValueAtTime(0.2, au.currentTime);
            vca.gain.linearRampToValueAtTime(0.1, au.currentTime + 0.2);
            trigger();
        }
        function noteOff() {
            vca.gain.cancelScheduledValues(au.currentTime);
            vca.gain.setTargetAtTime(0.0, au.currentTime, 0.01);
        }
        return {
            noteOn,
            noteOff,
            params: {
                cutoff: pCutoff,
                resonance: pResonance,
                envMod: pEnvMod,
                decay: pDecay
            }
        };
    }
    function kick(out = master.in) {
        const osc = au.createOscillator();
        osc.frequency.value = 400;
        const gain = au.createGain();
        gain.gain.value = 0.3;
        osc.start();
        osc.frequency.exponentialRampToValueAtTime(50, au.currentTime + 0.04);
        gain.gain.setValueCurveAtTime([0.5, 0.5, 0.45, 0.4, 0.25, 0.0], au.currentTime, 0.09);
        osc.stop(au.currentTime + 0.1);
        window.setTimeout(() => gain.disconnect(), 200);
        osc.connect(gain);
        gain.connect(out);
    }
    function loadBuffer(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch(filePath);
            const arraybuffer = yield response.arrayBuffer();
            const audioBuffer = yield decodeAudioDataCompatible(arraybuffer);
            return audioBuffer;
        });
    }
    function Sampler(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const sampleBuffer = yield loadBuffer(file);
            function play(gain = 0.4, decay = 1.0, out = master.in) {
                const bufferSource = au.createBufferSource();
                bufferSource.buffer = sampleBuffer;
                bufferSource.loop = false;
                const gainNode = au.createGain();
                gainNode.gain.setValueAtTime(gain, au.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.0, au.currentTime + decay);
                bufferSource.connect(gainNode);
                gainNode.connect(out);
                bufferSource.start(au.currentTime);
            }
            return {
                play
            };
        });
    }
    function SamplerDrumMachine(files, out = master.in) {
        return __awaiter(this, void 0, void 0, function* () {
            const sum = au.createGain();
            sum.gain.value = 1.0;
            sum.connect(out);
            const promisedMachines = files.map(Sampler);
            const samplers = yield Promise.all(promisedMachines);
            const mapped = samplers.map(sampler => ({
                play: (vel) => sampler.play(0.7 * vel, vel * 0.5, sum)
            }));
            return {
                triggers: mapped
            };
        });
    }
    return {
        tone,
        SimpleToneSynth,
        DelayInsert,
        ThreeOh,
        kick,
        Sampler,
        SamplerDrumMachine,
        master,
        context: au
    };
}
//# sourceMappingURL=audio.js.map
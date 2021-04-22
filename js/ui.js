/*
  Copyright 2021 David Whiting
  This work is licensed under a Creative Commons Attribution 4.0 International License
  https://creativecommons.org/licenses/by/4.0/
*/
import { textNoteToNumber } from "./audio.js";
import { Dial } from "./dial.js";
const defaultColors = {
    bg: "#222266",
    note: "#88aacc",
    accent: "#AA88CC",
    glide: "#CCAA88",
    text: "#CCCCFF",
    highlight: "rgba(255,255,255,0.2)",
    grid: "rgba(255,255,255,0.2)",
    dial: "#AA88CC"
};
function DialSet(parameters, ...classes) {
    const params = Array.isArray(parameters) ? parameters : Object.keys(parameters).map(k => parameters[k]);
    const container = document.createElement("div");
    container.classList.add("params", ...classes);
    params.forEach(param => {
        //const param = parameters[p];
        const dial = Dial(param.bounds, param.name, defaultColors.dial, defaultColors.text);
        // Change the parameter if we move the dial
        dial.bind(v => { param.value = v; });
        // Move the dial if the parameter changes elsewhere
        param.subscribe(v => dial.value = v);
        container.append(dial.element);
    });
    return container;
}
function triggerButton(target) {
    const but = document.createElement("button");
    but.classList.add("trigger-button");
    but.innerText = "⟳";
    target.subscribe(v => {
        if (v)
            but.classList.add("waiting");
        else
            but.classList.remove("waiting");
    });
    but.addEventListener("click", function () {
        target.value = true;
    });
    return but;
}
function toggleButton(param, ...classes) {
    const button = document.createElement("button");
    button.classList.add(...classes);
    button.innerText = param.name;
    button.addEventListener("click", () => param.value = !param.value);
    param.subscribe(v => {
        if (v) {
            button.classList.add("on");
            button.classList.remove("off");
        }
        else {
            button.classList.add("off");
            button.classList.remove("on");
        }
    });
    return button;
}
function label(text) {
    const element = document.createElement("div");
    element.classList.add("label");
    element.innerText = text;
    return element;
}
function machine(...contents) {
    const element = document.createElement("div");
    element.classList.add("machine");
    element.append(...contents);
    return element;
}
function controlGroup(label, content, ...classes) {
    const element = document.createElement("div");
    element.classList.add("control-group", ...classes);
    element.append(label, content);
    return element;
}
function controls(...contents) {
    const element = document.createElement("div");
    element.classList.add("controls");
    element.append(...contents);
    return element;
}
function group(...contents) {
    const element = document.createElement("div");
    element.classList.add("group");
    element.append(...contents);
    return element;
}
function PatternDisplay(patternParam, stepParam, colors = defaultColors) {
    const canvas = document.createElement("canvas");
    canvas.classList.add("pattern");
    function repaint() {
        const pattern = patternParam.value;
        const w = canvas.width = canvas.clientWidth;
        const h = canvas.height = 200;
        const vScale = h / 50;
        const g = canvas.getContext("2d");
        g.font = "10px Orbitron";
        g.fillStyle = colors.bg;
        g.fillRect(0, 0, w, h);
        g.strokeStyle = colors.grid;
        for (let i = 0; i < pattern.length; i++) {
            const x = w * i / pattern.length;
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, h);
            g.stroke();
        }
        for (let i = 0; i < 80; i++) {
            const y = h - (i * vScale);
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(w, y);
            g.stroke();
        }
        for (let i = 0; i < pattern.length; i++) {
            const s = pattern[i];
            if (s.note === "-") {
            }
            else {
                const n = textNoteToNumber(s.note) - 24;
                const x = w * i / pattern.length;
                const y = h - (n * vScale);
                const bw = w / pattern.length;
                const bh = 5;
                g.fillStyle = s.glide ? colors.glide : (s.accent ? colors.accent : colors.note);
                g.fillRect(x, y, bw, bh);
                g.fillStyle = colors.text;
                const xt = (x + bw / 2) - g.measureText(s.note).width / 2;
                g.fillText(s.note, xt, y);
            }
        }
        g.fillStyle = colors.highlight;
        g.fillRect(w * stepParam.value / pattern.length, 0, w / pattern.length, h);
    }
    patternParam.subscribe(repaint);
    stepParam.subscribe(repaint);
    return canvas;
}
function DrumDisplay(pattern, mutes, stepParam, colors = defaultColors) {
    const canvas = document.createElement("canvas");
    canvas.classList.add("pattern");
    function repaint() {
        const w = canvas.width = canvas.clientWidth;
        const h = canvas.height = 100;
        const g = canvas.getContext("2d");
        g.fillStyle = colors.bg;
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 16; i++) {
            const x = w * i / 16;
            for (let p = 0; p < pattern.value.length; p++) {
                const y = (p / pattern.value.length) * h;
                if (pattern.value[p][i]) {
                    if (mutes[p].value) {
                        g.fillStyle = "rgba(128,0,0,0.4)";
                    }
                    else {
                        g.fillStyle = "rgba(136,170,204," + pattern.value[p][i] + ")";
                    }
                    g.fillRect(x, y, w / 16, h / pattern.value.length);
                }
            }
        }
        g.fillStyle = colors.highlight;
        g.fillRect(w * stepParam.value / 16, 0, w / 16, h);
    }
    pattern.subscribe(repaint);
    stepParam.subscribe(repaint);
    return canvas;
}
function NoteGen(noteGenerator) {
    const currentNotes = document.createElement("div");
    currentNotes.classList.add("parameter-controlled", "notegen-note-display");
    noteGenerator.noteSet.subscribe(notes => {
        currentNotes.innerText = notes.join(", ");
    });
    return controlGroup(label("Notegen"), group(triggerButton(noteGenerator.newNotes), currentNotes), "notegen-box");
}
function Mutes(params) {
    const container = document.createElement("div");
    container.classList.add("mutes");
    container.append(...params.map(p => toggleButton(p)));
    return container;
}
function DelayControls(delayUnit) {
    const controls = DialSet([delayUnit.dryWet, delayUnit.feedback]);
    controls.classList.add("horizontal");
    return controlGroup(label("Delay"), controls);
}
function AutopilotControls(autoPilot) {
    return controlGroup(label("Autopilot"), group(...autoPilot.switches.map(p => toggleButton(p, "autopilot-button"))));
}
function AudioMeter(analyser) {
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    let w = canvas.width = 200;
    const h = canvas.height = 100;
    const g = canvas.getContext("2d");
    const output = new Uint8Array(analyser.fftSize);
    function draw() {
        //w = canvas.width = canvas.clientWidth;
        analyser.getByteTimeDomainData(output);
        g.clearRect(0, 0, w, h);
        g.strokeStyle = "white";
        g.beginPath();
        g.moveTo(0, h / 2);
        for (let i = 0; i < output.length; i++) {
            const v = (output[i] / 128) - 1;
            g.lineTo(w * i / output.length, h / 2 + (1.5 * v * h / 2));
        }
        g.stroke();
        window.requestAnimationFrame(draw);
    }
    window.requestAnimationFrame(draw);
    return canvas;
}
export function UI(state, autoPilot, analyser) {
    const ui = document.createElement("div");
    ui.id = "ui";
    const otherControls = controls(AutopilotControls(autoPilot), NoteGen(state.gen), DelayControls(state.delay), controlGroup(label("Clock"), DialSet([state.clock.bpm], "horizontal")), controlGroup(label("Meter"), group(AudioMeter(analyser)), "meter"));
    const machineContainer = document.createElement("div");
    machineContainer.classList.add("machines");
    const noteMachines = state.notes.map((n, i) => machine(label("303-0" + (i + 1)), group(triggerButton(n.newPattern), PatternDisplay(n.pattern, state.clock.currentStep), DialSet(n.parameters))));
    const drumMachine = machine(label("909-XX"), group(triggerButton(state.drums.newPattern), DrumDisplay(state.drums.pattern, state.drums.mutes, state.clock.currentStep), Mutes(state.drums.mutes)));
    machineContainer.append(...noteMachines, drumMachine);
    ui.append(machineContainer, otherControls);
    return ui;
}
//# sourceMappingURL=ui.js.map
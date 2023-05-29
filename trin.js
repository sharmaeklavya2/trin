// Copyright (C) 2023 Eklavya Sharma. Licensed under MIT.

'use strict';

const blockSize = 0x80;

export class Script {
    constructor(shortName, name, startPos) {
        this.shortName = shortName;
        this.name = name;
        this.startPos = startPos;
    }

    toString() {
        return `Script(${this.name}, ${this.startPos})`;
    }
}

const devStartPoint = 0x0900;
const devCommonCodePoints = new Set([0x0964, 0x0965, 0x0970]);
// some devanagari characters, like danda (U+0964), are not treated like devanagari characters here.

export const SCRIPTS_LIST = [
    new Script('dev', 'devanagari', devStartPoint),
    new Script('ben', 'bengali', 0x0980),
    new Script('gur', 'gurmukhi', 0x0A00),
    new Script('guj', 'gujarati', 0x0A80),
    new Script('ori', 'oriya', 0x0B00),
    new Script('tam', 'tamil', 0x0B80),
    new Script('tel', 'telugu', 0x0C00),
    new Script('kan', 'kannada', 0x0C80),
    new Script('mal', 'malayalam', 0x0D00),
];

export const SCRIPTS = {}
const startToScript = new Map();

export function getScriptAndOffset(codePoint) {
    const blockOffset = codePoint & (blockSize - 1);
    const blockStartPoint = codePoint & (-blockSize);
    if(blockStartPoint === devStartPoint && devCommonCodePoints.has(codePoint)) {
        return [null, blockOffset];
    }
    else {
        const script = startToScript.get(blockStartPoint);
        return (script === undefined) ? [null, blockOffset] : [script, blockOffset];
    }
}

class WordTransformer {
    constructor(name, description) {
        this.name = name;
        this.description = description;
    }
}

const TRNS_LIST = [
    new WordTransformer('kan2devAddA',
        'If source word is in Kannada and ends with a consonant, and target script is Devanagari, append an आ.'),
    new WordTransformer('dev2kanAddVir',
        'If source word is in Devanagari and ends with a consonant, and target script is Kannada, append a virama.'),
];

const TRNS = [];

export function trinWord(text, srcScript, targetScript, enhanced=true, trnsSet=null) {
    // assumes all characters in text are in srcScript. Converts to targetScript.
    if(srcScript === null || srcScript === targetScript) {
        return text;
    }
    const newCodePoints = new Array(text.length);
    const n = text.length;
    for(let i=0; i<n; ++i) {
        const oldCodePoint = text.codePointAt(i);
        newCodePoints[i] = oldCodePoint - srcScript.startPos + targetScript.startPos;
    }
    if(enhanced) {
        const lastOffset = newCodePoints[n-1] - targetScript.startPos;
        const isConsonant = lastOffset >= 0x0015 && lastOffset <= 0x0039;
        if(srcScript === SCRIPTS.kannada && targetScript === SCRIPTS.devanagari) {
            if(isConsonant) {
                newCodePoints.push(targetScript.startPos + 0x003e);
                if(trnsSet !== null) {
                    trnsSet.add(TRNS.kan2devAddA);
                }
            }
        }
        else if(srcScript === SCRIPTS.devanagari && targetScript === SCRIPTS.kannada) {
            if(isConsonant) {
                newCodePoints.push(targetScript.startPos + 0x004d);
                if(trnsSet !== null) {
                    trnsSet.add(TRNS.dev2kanAddVir);
                }
            }
        }
    }
    return String.fromCodePoint(...newCodePoints);
}

export function forEachWord(text, f) {
    // breaks text at word and script boundaries and calls f(word, script) for each word.
    if(text.length == 0) {
        return;
    }
    let [prevScript] = getScriptAndOffset(text[0].codePointAt(0));
    let prevI = 0;
    for(let i=1; i < text.length; ++i) {
        let [script] = getScriptAndOffset(text[i].codePointAt(0));
        if(prevScript !== script) {
            const fragment = text.slice(prevI, i);
            f(fragment, prevScript);
            prevI = i;
            prevScript = script;
        }
    }
    f(text.slice(prevI), prevScript);
}

export function trin(text, targetScript, enhanced=true, trnsSet=null) {
    const frags = [];
    function f(word, srcScript) {
        const newWord = trinWord(word, srcScript, targetScript, enhanced, trnsSet);
        frags.push(newWord);
    }
    forEachWord(text, f);
    return frags.join('');
}

export function detectScripts(text) {
    let scripts = new Set();
    function f(word, script) {
        if(script !== null) {
            scripts.add(script);
        }
    }
    forEachWord(text, f);
    return scripts;
}

export function buildScaffolding(elem) {
    let count = 0;
    if(!(elem.classList.contains('trin-scaff-elem') || elem.classList.contains('no-trin-scaff'))) {
        const children = Array.from(elem.childNodes);
        for(const child of children) {
            if(child.nodeType === 3) { // text node
                const wns = [];  // words n' scripts
                forEachWord(child.nodeValue, (word, script) => {wns.push([word, script]);});
                if(wns.length >= 2 || (wns.length === 1 && wns[0][1] !== null)) {
                    for(const [word, script] of wns) {
                        let newChild = null;
                        if(script !== null) {
                            newChild = document.createElement('span');
                            newChild.innerText = word;
                            newChild.classList.add('trin-scaff-elem');
                            newChild.setAttribute('data-orig-text', word);
                            newChild.setAttribute('tabindex', '0');
                            count += 1;
                        }
                        else {
                            newChild = document.createTextNode(word);
                        }
                        elem.insertBefore(newChild, child);
                    }
                    elem.removeChild(child);
                }
            }
            else if(child.nodeType === 1) {
                count += buildScaffolding(child);
            }
        }
    }
    return count;
}

export function trinElem(elem, docScript=null, hovScript=null, enhanced=true) {
    const origWord = elem.dataset.origText;
    const [origScript] = getScriptAndOffset(origWord.codePointAt(0));
    if(docScript === null) {
        docScript = origScript;
    }
    if(hovScript === null) {
        hovScript = origScript;
    }
    const docWord = trinWord(origWord, origScript, docScript, enhanced);
    elem.innerText = docWord;
    if(hovScript !== docScript) {
        const hovWord = trinWord(origWord, origScript, hovScript, enhanced);
        const hovElem = document.createElement('span');
        hovElem.classList.add('trin-hover');
        hovElem.innerText = hovWord;
        elem.appendChild(hovElem);
    }
}

export function trinAllElems(docScript=null, hovScript=null, enhanced=true) {
    const trinScaffElems = document.getElementsByClassName('trin-scaff-elem');
    for(const elem of trinScaffElems) {
        trinElem(elem, docScript, hovScript, enhanced);
    }
}

function init() {
    for(const script of SCRIPTS_LIST) {
        SCRIPTS[script.name] = script;
        startToScript.set(script.startPos, script);
    }
    for(const trn of TRNS_LIST) {
        TRNS[trn.name] = trn;
    }
    console.log(`trin loaded.`);
}

init();

//=[ UI ]=======================================================================

let trinRoot = null;

const trinRootContents = `
<div class="trin-gas"></div>
<div id="trin-overlay"></div>
<form id="trin-form">
    <header>
        <div class="trin-heading">Trin</div>
        <div class="trin-close-btn" id="trin-form-close-btn"></div>
    </header>
    <div class="trin-form-body">
        <div class="trin-input-pair">
            <label for="trin-doc-input">Target script</label>
            <select id="trin-doc-input" name="trinDocScript"></select>
        </div>
        <div class="trin-input-pair">
            <label for="trin-hov-input">Hover script</label>
            <select id="trin-hov-input" name="trinHovScript"></select>
        </div>
        <div class="trin-input-pair">
            <label for="trin-basic-input">Basic mode</label>
            <input type="checkbox" id="trin-basic-input" name="trinBasicMode"/>
        </div>
    </div>
    <button type="submit" id="trin-submit">Transliterate (<kbd>Alt</kbd>+<kbd>t</kbd>)</button>
</form>
<div class="trin-gas"></div>
`;

function addOptionElem(selectElem, value, label) {
    const elem = document.createElement('option');
    elem.setAttribute('value', value);
    elem.innerText = label;
    selectElem.appendChild(elem);
}

export function initUI() {
    trinRoot = document.createElement('div');
    trinRoot.setAttribute('id', 'trin-root');
    trinRoot.classList.add('disabled');
    trinRoot.innerHTML = trinRootContents;
    document.body.appendChild(trinRoot);

    function toggleTrinRoot(ev) {
        trinRoot.classList.toggle('disabled');
    }
    function hideTrinRoot(ev) {
        trinRoot.classList.add('disabled');
    }

    const trinButton = document.createElement('div');
    trinButton.setAttribute('id', 'trin-main-button');
    trinButton.classList.add('no-trin-scaff');
    trinButton.innerText = '\u091f\u094d\u0930';
    document.body.appendChild(trinButton);
    trinButton.addEventListener('click', toggleTrinRoot);
    document.getElementById('trin-form-close-btn').addEventListener('click', toggleTrinRoot);
    document.getElementById('trin-overlay').addEventListener('click', toggleTrinRoot);

    for(const scriptType of ['doc', 'hov']) {
        const selectElem = document.getElementById(`trin-${scriptType}-input`);
        addOptionElem(selectElem, 'preserve', 'Preserve original');
        for(const script of SCRIPTS_LIST) {
            addOptionElem(selectElem, script.name, script.name);
        }
    }

    const trinForm = document.getElementById('trin-form');
    function trinSubmitEventHandler(ev) {
        ev.preventDefault();
        const formData = new FormData(trinForm);
        const docScriptName = formData.get('trinDocScript');
        const docScript = (docScriptName === 'preserve') ? null : SCRIPTS[docScriptName];
        const hovScriptName = formData.get('trinHovScript');
        const hovScript = (hovScriptName === 'preserve') ? null : SCRIPTS[hovScriptName];
        const basicMode = formData.has('trinBasicMode');
        buildScaffolding(document.body);
        trinAllElems(docScript, hovScript, !basicMode);
        hideTrinRoot();
    }
    trinForm.addEventListener('submit', trinSubmitEventHandler);
    window.addEventListener('keydown', function(ev) {
        if(!ev.defaultPrevented && ev.altKey && ev.code === 'KeyT') {
            trinSubmitEventHandler(ev);
        }
    });
}

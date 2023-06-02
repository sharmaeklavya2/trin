// Copyright (C) 2023 Eklavya Sharma. Licensed under MIT.

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

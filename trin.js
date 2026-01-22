// Copyright (C) 2023 Eklavya Sharma. Licensed under MIT.

const blockSize = 0x80;

export class Script {
    constructor(shortName, name, langCode, startPos) {
        this.shortName = shortName;
        this.name = name;
        this.langCode = langCode;
        // see https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
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
    new Script('dev', 'devanagari', 'hi', devStartPoint),
    new Script('ben', 'bengali', 'bn', 0x0980),
    new Script('gur', 'gurmukhi', 'pa', 0x0A00),
    new Script('guj', 'gujarati', 'gu', 0x0A80),
    new Script('ori', 'oriya', 'or', 0x0B00),
    new Script('tam', 'tamil', 'ta', 0x0B80),
    new Script('tel', 'telugu', 'te', 0x0C00),
    new Script('kan', 'kannada', 'kn', 0x0C80),
    new Script('mal', 'malayalam', 'ml', 0x0D00),
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
    new WordTransformer('addA',
        'If source word is in Kannada or Telugu and ends with a consonant, and target script is Devanagari, append an आ.'),
    new WordTransformer('addVir',
        'If source word is in Devanagari and ends with a consonant, and target script is Kannada or Telugu, append a virama.'),
    new WordTransformer('addak',
        'If the source word is in Gurmukhi and the word contains an addak, double the next consonant.'),
    new WordTransformer('tippi',
        'If the source word is in Gurmukhi, replace every tippi with anusvara.'),
];

const TRNS = [];

export function trinWord(text, srcScript, targetScript, enhanced=true, trnsSet=null) {
    // assumes all characters in text are in srcScript. Converts to targetScript.
    if(srcScript === null || srcScript === targetScript) {
        return text;
    }
    let newCodePoints = new Array(text.length);
    const n = text.length;
    for(let i=0; i<n; ++i) {
        const oldCodePoint = text.codePointAt(i);
        newCodePoints[i] = oldCodePoint - srcScript.startPos + targetScript.startPos;
    }
    if(enhanced) {
        const lastOffset = newCodePoints[n-1] - targetScript.startPos;
        const isLastConsonant = lastOffset >= 0x0015 && lastOffset <= 0x0039;
        if((srcScript === SCRIPTS.kannada || srcScript === SCRIPTS.telugu) && targetScript === SCRIPTS.devanagari) {
            if(isLastConsonant) {
                newCodePoints.push(targetScript.startPos + 0x003e);
                if(trnsSet !== null) {
                    trnsSet.add(TRNS.addA);
                }
            }
        }
        else if(srcScript === SCRIPTS.devanagari && (targetScript === SCRIPTS.kannada || targetScript === SCRIPTS.telugu)) {
            if(isLastConsonant) {
                newCodePoints.push(targetScript.startPos + 0x004d);
                if(trnsSet !== null) {
                    trnsSet.add(TRNS.addVir);
                }
            }
        }
        else if(srcScript === SCRIPTS.gurmukhi) {
            const modCodePoints = [];
            for(let i=0; i<n; ++i) {
                const cp = newCodePoints[i];
                const offset = cp - targetScript.startPos;
                if(offset === 0x0070) {
                    // tippi detected
                    modCodePoints.push(targetScript.startPos + 0x0002);
                    if(trnsSet !== null) {
                        trnsSet.add(TRNS.tippi);
                    }
                    continue;
                }
                else if(offset === 0x0071) {
                    // addak detected
                    if(i+1 < n) {
                        const cpNext = newCodePoints[i+1];
                        const offsetNext = cpNext - targetScript.startPos;
                        const isNextConsonant = offsetNext >= 0x0015 && offsetNext <= 0x0039;
                        if(isNextConsonant) {
                            modCodePoints.push(cpNext, targetScript.startPos + 0x004d);
                            if(trnsSet !== null) {
                                trnsSet.add(TRNS.addak);
                            }
                            continue;
                        }
                    }
                }
                modCodePoints.push(cp);
            }
            newCodePoints = modCodePoints;
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

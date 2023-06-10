// Copyright (C) 2023 Eklavya Sharma. Licensed under MIT.

import {trinWord, SCRIPTS, SCRIPTS_LIST, forEachWord, getScriptAndOffset} from './trin.js';

export * as trin from './trin.js';

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

//=[ Menu and button ]==========================================================

let trinRoot = null;
export let lastRawTrinOptions = null;

const trinRootContents = `
<div id="trin-overlay"></div>
<form id="trin-form">
    <header>
        <div class="trin-heading">Trin</div>
        <div class="trin-close-btn" id="trin-form-close-btn"></div>
    </header>
    <div class="trin-form-body">
        <div class="trin-input-pair space-between">
            <label for="trin-doc-input">Target script</label>
            <select id="trin-doc-input" name="trinDocScript"></select>
        </div>
        <div class="trin-input-pair space-between">
            <label for="trin-hov-input">Hover script</label>
            <select id="trin-hov-input" name="trinHovScript"></select>
        </div>
        <div class="trin-input-pair">
            <label for="trin-basic-input" title="Basic mode disables word-level heuristics. It uses character-level replacement only.">Basic mode</label>
            <input type="checkbox" id="trin-basic-input" name="trinBasicMode"/>
        </div>
    </div>
    <button type="submit" id="trin-submit">Transliterate (<kbd>Alt</kbd>+<kbd>t</kbd>)</button>
</form>
`;

function addOptionElem(selectElem, value, label) {
    const elem = document.createElement('option');
    elem.setAttribute('value', value);
    elem.innerText = label;
    selectElem.appendChild(elem);
}

function processOptions(d) {
    const docScript = (d.docScript === 'preserve') ? null : SCRIPTS[d.docScript];
    const hovScript = (d.hovScript === 'preserve') ? null : SCRIPTS[d.hovScript];
    return {'docScript': docScript, 'hovScript': hovScript, 'enhanced': !d.basicMode};
}

function storeUIOptions(storage, storageType) {
    if(storageType === null) {}
    else if(storageType === 'web') {
        storage.setItem('trinUIOptions', JSON.stringify(lastRawTrinOptions));
    }
    else if(storageType === 'extension') {
        storage.set({'trinUIOptions': JSON.stringify(lastRawTrinOptions)});
    }
    else {
        throw new Error(`writing to storageType '${storageType}' is not supported.`);
    }
}

function materializeUIOptions(d) {
    for(const scriptType of ['doc', 'hov']) {
        const scriptSelectElem = document.getElementById(`trin-${scriptType}-input`);
        scriptSelectElem.value = d[scriptType + 'Script'];
    }
    const basicElem = document.getElementById('trin-basic-input');
    basicElem.checked = d.basicMode;
}

function loadUIOptions(storage, storageType) {
    if(lastRawTrinOptions === null) {
        if(storageType === null) {}
        else if(storageType === 'web') {
            const storageOutput = storage.getItem('trinUIOptions');
            if(storageOutput !== null) {
                const uiOptions = JSON.parse(storageOutput);
                materializeUIOptions(uiOptions);
            }
        }
        else if(storageType === 'extension') {
            storage.get('trinUIOptions').then((storageOutput) => {
                const uiOptionsStr = storageOutput.trinUIOptions;
                if(lastRawTrinOptions === null && uiOptionsStr) {
                    const uiOptions = JSON.parse(uiOptionsStr);
                    materializeUIOptions(uiOptions);
                }
            });
        }
        else {
            throw new Error(`reading from storageType '${storageType}' is not supported.`);
        }
    }
}

export function loadUI(storage=null, storageType=null) {
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
    trinRoot.appendChild(trinButton);
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
        const hovScriptName = formData.get('trinHovScript');
        const basicMode = formData.has('trinBasicMode');
        lastRawTrinOptions = {'docScript': docScriptName, 'hovScript': hovScriptName, 'basicMode': basicMode};
        const trinOptions = processOptions(lastRawTrinOptions);
        buildScaffolding(document.body);
        trinAllElems(trinOptions.docScript, trinOptions.hovScript, trinOptions.enhanced);
        hideTrinRoot();
        storeUIOptions(storage, storageType);
    }

    trinForm.addEventListener('submit', trinSubmitEventHandler);
    window.addEventListener('keydown', function(ev) {
        if(!ev.defaultPrevented && ev.altKey && ev.code === 'KeyT') {
            trinSubmitEventHandler(ev);
        }
    });

    loadUIOptions(storage, storageType);
}

function isTrueString(s) {
    return s === '1' || s === 'true';
}

function initUI() {
    if(typeof window !== 'undefined' && window && import.meta && import.meta.url) {
        const qparams = new URL(import.meta.url).searchParams;
        const initParam = qparams.get('init');
        const addCssParam = qparams.get('addCss') || qparams.get('addCSS');
        if(isTrueString(addCssParam) && import.meta.resolve) {
            const head = document.getElementsByTagName('head')[0];
            const cssPath = import.meta.resolve('./trin.css');
            const linkElem = document.createElement('link');
            linkElem.href = cssPath;
            linkElem.rel = 'stylesheet';
            head.appendChild(linkElem);
        }
        if(isTrueString(initParam)) {
            if(document.readyState !== 'loading') {
                loadUI(window.localStorage, 'web');
            }
            else {
                window.addEventListener('DOMContentLoaded', () => {loadUI(window.localStorabe, 'web');});
            }
        }
    }
}

initUI();

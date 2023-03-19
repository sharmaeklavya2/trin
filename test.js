'use strict';
import {SCRIPTS_LIST, trin, detectScripts} from './trin.js';

var innerErrorsElem = null;

function getErrorsElem() {
    if(innerErrorsElem === null) {
        const outerErrorsElem = document.getElementById('errors');
        const head = document.createElement('h2');
        head.innerHTML = 'Errors';
        outerErrorsElem.appendChild(head);
        innerErrorsElem = document.createElement('ol');
        outerErrorsElem.appendChild(innerErrorsElem);
    }
    return innerErrorsElem;
}

function displayError(text) {
    const errorsElem = getErrorsElem();
    const errorElem = document.createElement('li');
    errorElem.innerHTML = text;
    errorsElem.appendChild(errorElem);
}

function displayTestResult(fromText, toText, trinOut, testsElem) {
    const liElem = document.createElement('li');
    const fromElem = document.createElement('span');
    fromElem.classList.add('indScript');
    fromElem.innerHTML = fromText;
    liElem.appendChild(fromElem);
    const arrowElem = document.createElement('span');
    arrowElem.innerHTML = '\u2192';
    liElem.appendChild(arrowElem);
    const outElem = document.createElement('span');
    outElem.innerHTML = trinOut;
    outElem.classList.add('indScript');
    liElem.appendChild(outElem);
    if(trinOut === toText) {
        outElem.classList.add('correct');
    }
    else {
        outElem.classList.add('wrong');
        const expectElem = document.createElement('span');
        expectElem.appendChild(document.createTextNode(' (expected\u00a0'));
        const toElem = document.createElement('span');
        toElem.innerHTML = toText;
        toElem.classList.add('indScript');
        expectElem.appendChild(toElem);
        expectElem.appendChild(document.createTextNode(')'));
        liElem.appendChild(expectElem);
    }
    testsElem.appendChild(liElem);
}

export function addTests(rows, enhanced=true) {
    const testsElem = document.getElementById('tests');
    testsElem.innerHTML = '';
    for(let i=0; i<rows.length; ++i) {
        const row = rows[i];
        if(row.length < 2) {
            displayError(`Row ${i} has less than 2 entries.`);
        }
        const fromText = row[0], toText = row[1];
        const toScripts = detectScripts(toText);
        if(toScripts.length !== 1) {
            displayError(`Answer ${i} has ${toScripts.length} scripts.`);
        }
        const trinOut = trin(fromText, toScripts[0], enhanced);
        displayTestResult(fromText, toText, trinOut, testsElem);
    }
}

let callbacksReceived = 0;
let csvRows = null;

export function getCsvRows() {
    return csvRows;
}

Papa.parse("tests.csv", {
    "download": true,
    "error": function errHandle(error) {
        displayError('CSV parse error: ' + error);
    },
    "complete": function f(response) {
        if(response.errors.length > 0) {
            for(const error in response.errors) {
                displayError('CSV parse error: ' + error.message);
            }
        }
        else {
            callbacksReceived += 1;
            csvRows = response.data;
            if(callbacksReceived === 2) {
                addTests(csvRows);
            }
        }
    }
});

window.addEventListener('DOMContentLoaded', function() {
    callbacksReceived += 1;
    if(callbacksReceived === 2) {
        addTests(csvRows);
    }
});
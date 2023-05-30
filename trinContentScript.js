function isAlreadyLoaded() {
    if(window.hasOwnProperty('trin')) {
        return true;
    }
    const jscripts = document.getElementsByTagName('script');
    for(const jscript of jscripts) {
        if(jscript.id === 'trinScript' || jscript.src.includes('trin.js')) {
            return true;
        }
    }
    return false;
}

function importAndInitUI() {
    const trinPath = chrome.runtime.getURL("trin.js");
    import(trinPath).then((trin) => {
        window.trin = trin;
        const foundScripts = trin.detectScripts(document.body.innerText);
        if(foundScripts.size > 0) {
            console.log('trin detected', Array.from(foundScripts).map((script) => script.name).join(', '));
        }
        else {
            console.log("trin didn't find any Indian scripts.");
        }
        trin.loadUI(chrome.storage.local, 'extension');
    });
}

if(isAlreadyLoaded()) {
    console.log('trin already loaded.');
}
else {
    importAndInitUI();
}

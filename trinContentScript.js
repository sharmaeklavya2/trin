function isAlreadyLoaded() {
    if(window.hasOwnProperty('trinUI')) {
        return true;
    }
    const jscripts = document.getElementsByTagName('script');
    for(const jscript of jscripts) {
        if(jscript.id === 'trinScript' || jscript.src.includes('trinUI.js')) {
            return true;
        }
    }
    return false;
}

function importAndInitUI() {
    const trinPath = chrome.runtime.getURL("trinUI.js");
    import(trinPath).then((trinUI) => {
        window.trinUI = trinUI;
        window.trin = trinUI.trin;
        const foundScripts = trinUI.trin.detectScripts(document.body.innerText);
        if(foundScripts.size > 0) {
            console.log('trin detected', Array.from(foundScripts).map((script) => script.name).join(', '));
        }
        else {
            console.log("trin didn't find any Indian scripts.");
        }
        trinUI.loadUI(chrome.storage.local, 'extension');
    });
}

if(isAlreadyLoaded()) {
    console.log('trin already loaded.');
}
else {
    importAndInitUI();
}

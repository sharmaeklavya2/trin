const trinPath = chrome.runtime.getURL("trin.js");
import(trinPath).then((trin) => {
    window.trin = trin;
    const foundScripts = trin.detectScripts(document.body.innerText);
    if(foundScripts.size > 0) {
        console.log('trin found:', Array.from(foundScripts).map((script) => script.name).join(', '));
        trin.initUI();
    }
    else {
        console.log("trin didn't find any Indian scripts.");
    }
});

.PHONY: extension
extension:
	mkdir -p extensionFiles
	cp manifest.json trin.js trin.css trinContentScript.js extensionFiles
	cp -r icons extensionFiles

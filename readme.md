# trin

`trin` is a JavaScript module to transliterate among some Indian scripts.
`trin` can help you read and write (but not necessarily understand)
text written in an Indian script if you can understand some other Indian script.

## How to use trin

1.  As a web application:
    Serve [`index.html`](https://sharmaeklavya2.github.io/trin/) from an HTTP server.

2.  As a browser extension to transliterate pages on the web:
    The extension adds the trin button (labeled 'ट्र') to the bottom-right corner of the web page.
    On clicking the button, a dialog box allows you to pick which language to transliterate to.
    You can try the extension (without installing it)
    at [example.html](https://sharmaeklavya2.github.io/trin/example.html).

    Extension for Firefox: <https://addons.mozilla.org/addon/trin/>.
    To install the extension in Chrome, first run `make build` to create a zip file.
    Then visit <chrome://extensions/>, enable developer mode,
    and then drag-and-drop the zip file on that page.
    Alternatively, you can follow the instructions at
    <https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked>.

3.  On your own web pages:
    To add the trin button to the bottom-right corner of your web pages,
    add these tags to your page's `<head>`:

    ```html
    <link rel="stylesheet" href="https://sharmaeklavya2.github.io/trin/trin.css" />
    <script type="module" src="https://sharmaeklavya2.github.io/trin/trinUI.js?init=true"></script>
    ```

4.  As a JavaScript library:

    ```js
    import('https://sharmaeklavya2.github.io/trin/trin.js')
        .then((trin) => console.log(trin.trin('ಹೆಸರು', trin.SCRIPTS.devanagari)));
    ```

## How it works

`trin` uses the fact that most Indian scripts have a similar phonetic spelling system,
and are arranged similarly in their Unicode code blocks.
Hence, switching script mostly just requires adding an offset to each character's code point.

## Freedom to Use

&copy; 2023 Eklavya Sharma

All code is licensed under the [MIT license](https://choosealicense.com/licenses/mit/).
This roughly means that you are free to use, modify, and distribute this code.

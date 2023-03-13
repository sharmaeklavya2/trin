# Trin

`trin` is a library to transliterate among some Indian scripts.
`trin` can, to some extent, help you read and write (but not necessarily understand)
text written in an Indian script if you can understand some other Indian script.

`frontend.html` offers a simple transliteration UI.

I plan to make a chrome extension that modifies text on pages and shows original text for each word
when the user hovers on it.

## How it works

`trin` uses the fact that most Indian scripts have a similar phonetic spelling system,
and are arranged similarly in their Unicode code blocks.
Hence, switching script mostly just requires adding an offset to each character's code point.

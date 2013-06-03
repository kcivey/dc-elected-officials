dc-elected-officials
====================

Unfortunately the information on the DC Board of Elections site is incomplete
(not updated recently) and includes some errors, but it should provide a
starting point for a database of elected officials.

Requires node.js and (for ANCs and eventually Board of Education) pdftotext.
After installing node and npm, run `npm install` in the directory to get the
required modules.

Then to get the data for council, mayor, delegate, and shadows, run

    node scrape.js

To get ANC data (which lacks all commissioners who were elected in special
elections), run

    ./get-ancs

#!/usr/bin/env bash
wget -O cache/historical-anc-list.pdf http://www.dcboee.org/pdf_files/nr_849.pdf
pdftotext -layout cache/historical-anc-list.pdf
./parse-historical-ancs.js cache/historical-anc-list.txt

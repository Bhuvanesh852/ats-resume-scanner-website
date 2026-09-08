# Bhuvanesh — ATS Resume Scanner

A complete, runnable browser-based ATS résumé scanner for Bhuvanesh, a CSE graduate.
It supports résumé upload (.pdf/.docx/.txt), ATS-style scoring out of 100,
job-description keyword matching, role-based suggestions, and a chat assistant — all
running locally in the browser. No backend, no API key, and no data leaves your machine.

## Run it locally in VS Code

1. Open the project folder in VS Code.
2. Open the terminal with `` Ctrl+` ``.
3. Run:
   ```bash
   python -m http.server 5500
   ```
   If `python` does not work on your machine, try:
   ```bash
   python3 -m http.server 5500
   ```
4. Open this in your browser:
   ```text
   http://localhost:5500
   ```
5. To stop the server later, press `Ctrl+C` in the terminal.

**No Python?** You can also install the Live Server extension in VS Code and open `index.html` with it.

## Project files
- `index.html` — page structure
- `style.css` — styling
- `roles-data.js` — role keyword/project library + sample résumé data
- `app.js` — file parsing, scoring engine, keyword matching, and chat assistant

## License
This project is licensed under the MIT License.

Copyright (c) 2026 Bhuvanesh  
Email: sbhuvanesh713@gmail.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Notes
- Scores are computed by a fixed, deterministic rubric (not random and not fabricated).
- This is an ATS-style estimate for guidance only; it cannot guarantee interviews or offers.

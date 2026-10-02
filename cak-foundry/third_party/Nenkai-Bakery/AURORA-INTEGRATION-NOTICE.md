**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Nenkai Bakery integration notice

Aurora CAK Foundry's WWE 2K25 FDIR 9.3 compatibility layer includes the MIT-licensed CakeTool source from Nenkai's Bakery project, upstream commit `f704d37`.

Aurora's integration adds a machine-readable catalog command so the Foundry interface can browse the already-decoded names and metadata. The upstream copyright and MIT license are preserved in `LICENSE.txt`, and the original project documentation is preserved in `UPSTREAM-README.md`.

Aurora CAK Foundry does not bundle Oodle or WWE game files. At runtime, extraction and baking use the Oodle library from the user's own selected game installation.

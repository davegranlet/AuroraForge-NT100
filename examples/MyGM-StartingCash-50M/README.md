# MyGM 50M starting-budget example

These three recovered scripts are a bounded example for inspecting and modifying the WWE 2K26 MyGM `Params.jsfb` budget vector. They are not part of the animation conversion pipeline.

- `tools/inspect_flatbuffer.py` reads a root FlatBuffers table without its schema and prints field bytes and candidate offsets.
- `tools/make_50m_params.py` accepts only the pinned source hash and expected five-value budget vector, then changes only those five values to 50,000,000. It writes a separate output and optional JSON report.
- `tools/extract_named_cak_entry.js` searches CAK archives for one resolved path and extracts matching entries through Aurora's CAK reader/helper. It requires explicit Aurora tool-root, game-root, member path, and output-root arguments.

The budget writer is intentionally tied to one exact input SHA-256, schema field ID, and expected budget list. It will reject other files. These example tools were recovered from the historical archive and have not been exercised against a live game install during this review.

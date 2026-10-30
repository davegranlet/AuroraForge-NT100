# NativeAOT and CAK reverse-analysis helpers

This folder contains recovered, version-specific Ghidra scripts from the August archive. The Java files analyze NativeAOT/CakeView/Bakery-related programs and export decompilation or targeted strings, references, functions, and memory constants. The Python `capture_bakery_v99.py` uses Frida to instrument a specific Bakery CLI build and crypto offsets.

These are research aids, not Aurora production readers/writers. Several scripts embed fixed addresses or method names from a particular binary version. Review and update the target build, addresses, and output paths before running. `capture_bakery_v99.py` still embeds old `D:\AuroraForge-Aug26` paths and requires Frida; it is preserved for provenance only and has not been run here. Decompilation output and third-party Ghidra/Gradle installations remain outside this source folder.

Recovered scripts and their specific purposes:

- `scripts/DumpFunctionNeighborhood.java`: decompile a fixed target and its direct callees.
- `scripts/DumpNamedBakeryCryptoFunctions.java`: decompile functions matching known v9.9 Bakery crypto names.
- `scripts/DumpV99HashConstants.java`: dump three fixed memory regions containing v9.9 hash constants.
- `scripts/FindBakeryCryptoMethods.java`: locate known Bakery crypto method-name strings and code references.
- `scripts/FindRuntimeStringCallers.java`: locate UTF-16 runtime strings and callers.
- `scripts/RunNativeAotAnalyzer.java`: invoke Ghidra's NativeAOT analyzer on the current program.
- `ghidra_scripts/AuditReport.java`: emit a keyword-driven function/reference audit.
- `ghidra_scripts/BakerAudit.java`: find FDIR/baker strings and their function/reference neighborhood.
- `ghidra_scripts/ExportAllDecompiled.java`: export decompilation for all eligible program functions.
- `ghidra_scripts/FocusedDecompile.java`: export selected functions with signatures and callers.
- `ghidra_scripts/TargetAudit.java`: inspect target functions and callees up to a bounded depth.
- `capture_bakery_v99.py`: Frida instrumentation experiment for fixed Bakery v9.9 crypto call sites; stale paths/build-specific offsets make it non-runnable without revision.

Source was byte-preserved from `C:\AuroraForge-Aug26` except where a later documented adaptation is explicitly called out. No recovered Ghidra script was executed as part of consolidation review.

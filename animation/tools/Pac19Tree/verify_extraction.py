#!/usr/bin/env python3
"""Independently verify a Pac19Tree output and its extraction journal."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import struct
import sys
import zlib
from collections import Counter
from pathlib import Path, PurePosixPath

COMPRESSED = {"BPE", "ZLIB", "OODL"}
CONTAINERS = {"HSPC", "SHDC", "EPAC", "EPK8", "PACH"}
PROTECTED = "hidectrldata"


def normalized_relative(value: str) -> str:
    path = PurePosixPath(value.replace("\\", "/"))
    if path.is_absolute() or any(part == ".." for part in path.parts):
        raise ValueError(f"unsafe relative path: {value!r}")
    return path.as_posix().casefold()


def protected_relative(value: str) -> bool:
    return any(PROTECTED in part.casefold() for part in value.replace("\\", "/").split("/"))


def output_path(root: Path, relative: str) -> Path:
    path = PurePosixPath(relative.replace("\\", "/"))
    if path.is_absolute() or any(part == ".." for part in path.parts):
        raise ValueError(f"unsafe output path: {relative!r}")
    return root.joinpath(*path.parts)


def hash_file(path: Path) -> tuple[int, str]:
    digest = hashlib.sha256()
    length = 0
    with path.open("rb") as stream:
        while True:
            block = stream.read(4 * 1024 * 1024)
            if not block:
                break
            length += len(block)
            digest.update(block)
    return length, digest.hexdigest().upper()


def expected_source_files(game: Path, single_source: str | None) -> tuple[set[str], int]:
    selected: list[Path] = []
    if single_source:
        relative = single_source.replace("\\", "/")
        normalized_relative(relative)
        if protected_relative(relative):
            raise ValueError("protected HideCtrlData files cannot be verified")
        source = game.joinpath(*PurePosixPath(relative).parts)
        if game not in source.parents:
            raise ValueError("single source file must be inside the game installation")
        if not source.is_file():
            raise FileNotFoundError(f"single source file not found: {source}")
        selected.append(source)
    else:
        for folder in ("pac", "gameresource", "movies", "sound"):
            base = game / folder
            if not base.is_dir():
                continue
            for current, directories, files in os.walk(base):
                directories[:] = [name for name in directories if PROTECTED not in name.casefold()]
                current_path = Path(current)
                for name in files:
                    relative = (current_path / name).relative_to(game).as_posix()
                    if protected_relative(relative):
                        continue
                    selected.append(current_path / name)
        for source in game.glob("Chunk*"):
            if source.is_file() and not protected_relative(source.relative_to(game).as_posix()):
                selected.append(source)

    keys: set[str] = set()
    total_bytes = 0
    for source in selected:
        relative = source.relative_to(game).as_posix()
        if protected_relative(relative):
            continue
        keys.add(normalized_relative(relative))
        total_bytes += source.stat().st_size
    return keys, total_bytes


def verify_independent_codecs(
    root: Path,
    compressed_formats: dict[str, str],
    path_spellings: dict[str, str],
    expanded_by_source: dict[str, dict[str, object]],
) -> dict[str, object]:
    tools = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(tools))
    from extract_2k19_pac import decompress_yukes_bpe  # pylint: disable=import-outside-toplevel

    checked = Counter()
    failures: list[dict[str, str]] = []
    for source_key, format_name in compressed_formats.items():
        if format_name not in {"BPE", "ZLIB"}:
            continue
        expanded = expanded_by_source.get(source_key)
        if not expanded:
            failures.append({"source": path_spellings[source_key], "error": "no decoded sibling"})
            continue
        packed_path = output_path(root, path_spellings[source_key])
        decoded_path = output_path(root, str(expanded["path"]))
        try:
            packed = packed_path.read_bytes()
            if format_name == "BPE":
                decoded = decompress_yukes_bpe(packed)
            else:
                if len(packed) < 16 or packed[:4] != b"ZLIB":
                    raise ValueError("invalid ZLIB header")
                compressed_size, expanded_size = struct.unpack_from("<II", packed, 8)
                if compressed_size > len(packed) - 16:
                    raise ValueError("ZLIB payload exceeds stored entry")
                decoded = zlib.decompress(packed[16 : 16 + compressed_size])
                if len(decoded) != expanded_size:
                    raise ValueError("ZLIB expanded size does not match header")
            digest = hashlib.sha256(decoded).hexdigest().upper()
            if len(decoded) != int(expanded["bytes"]) or digest != str(expanded["sha256"]):
                raise ValueError("independent decode differs from Pac19Tree output")
            checked[format_name] += 1
        except Exception as error:  # Include the exact native entry path in the report.
            failures.append({"source": path_spellings[source_key], "error": str(error)})

    return {"checked": dict(checked), "failures": failures, "verified": not failures}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--game", required=True, type=Path)
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--evidence", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--source", help="verify one source-relative file rather than the full asset set")
    parser.add_argument("--independent-codecs", action="store_true")
    parser.add_argument("--known-output-path", help="Root-relative path to compare with --known-file")
    parser.add_argument("--known-file", type=Path, help="reference file to compare byte-for-byte with --known-output-path")
    args = parser.parse_args()

    game = args.game.resolve(strict=True)
    root = args.root.resolve(strict=True)
    evidence = args.evidence.resolve(strict=True)
    report_path = args.report.resolve()
    if args.known_output_path and not args.known_file:
        parser.error("--known-output-path requires --known-file")
    if args.known_file and not args.known_output_path:
        parser.error("--known-file requires --known-output-path")

    result_path = evidence / "tree-result.json"
    journal_path = evidence / "tree-files.jsonl"
    errors_path = evidence / "tree-errors.jsonl"
    result = json.loads(result_path.read_text(encoding="utf-8"))
    if not journal_path.is_file() or not errors_path.is_file():
        raise FileNotFoundError("tree-files.jsonl and tree-errors.jsonl are required")

    expected_sources, expected_source_bytes = expected_source_files(game, args.source)
    logged_paths: set[str] = set()
    source_rows: set[str] = set()
    compressed_formats: dict[str, str] = {}
    path_spellings: dict[str, str] = {}
    expanded_by_source: dict[str, dict[str, object]] = {}
    format_counts: Counter[str] = Counter()
    role_counts: Counter[str] = Counter()
    unknown_pac: list[str] = []
    unknown_pac_count = 0
    duplicate_rows = 0
    hash_checked = 0
    hash_failures: list[str] = []
    missing_logged_files: list[str] = []
    invalid_records: list[str] = []
    row_count = 0
    journal_bytes = 0

    with journal_path.open("r", encoding="utf-8") as journal:
        for line in journal:
            if not line.strip():
                continue
            row_count += 1
            row = json.loads(line)
            try:
                relative = str(row["path"])
                key = normalized_relative(relative)
                if protected_relative(relative):
                    raise ValueError("journal contains protected HideCtrlData path")
                if key in logged_paths:
                    duplicate_rows += 1
                    continue
                logged_paths.add(key)
                path_spellings[key] = relative
                role = str(row.get("role", ""))
                format_name = str(row.get("format", ""))
                role_counts[role] += 1
                format_counts[format_name] += 1
                journal_bytes += int(row["bytes"])

                target = output_path(root, relative)
                if not target.is_file():
                    missing_logged_files.append(relative)
                else:
                    length, digest = hash_file(target)
                    hash_checked += 1
                    if length != int(row["bytes"]) or digest != str(row["sha256"]).upper():
                        hash_failures.append(relative)

                if role == "source-file":
                    source_rows.add(key)
                    if relative.lower().endswith(".pac") and format_name not in CONTAINERS | COMPRESSED:
                        unknown_pac_count += 1
                        if len(unknown_pac) < 100:
                            unknown_pac.append(relative)
                if format_name in COMPRESSED:
                    compressed_formats[key] = format_name
                if role == "decompressed" and row.get("compression"):
                    decoded_from = normalized_relative(str(row["decodedFrom"]))
                    expanded_by_source[decoded_from] = {
                        "path": relative,
                        "bytes": int(row["bytes"]),
                        "sha256": str(row["sha256"]).upper(),
                        "compression": str(row["compression"]),
                    }
            except Exception as error:
                invalid_records.append(str(error))

    actual_paths: set[str] = set()
    protected_output_files = 0
    for current, directories, files in os.walk(root):
        protected_output_files += sum(1 for name in directories if PROTECTED in name.casefold())
        directories[:] = [name for name in directories if PROTECTED not in name.casefold()]
        current_path = Path(current)
        for name in files:
            relative = (current_path / name).relative_to(root).as_posix()
            if protected_relative(relative):
                protected_output_files += 1
                continue
            actual_paths.add(normalized_relative(relative))

    unresolved_compressed = []
    for key, format_name in compressed_formats.items():
        expanded = expanded_by_source.get(key)
        if not expanded:
            unresolved_compressed.append({"path": path_spellings[key], "format": format_name})
        elif expanded["compression"] != format_name:
            unresolved_compressed.append({"path": path_spellings[key], "format": format_name,
                                          "decodedAs": expanded["compression"]})

    orphan_expansions = [
        path_spellings.get(key, key)
        for key in expanded_by_source
        if key not in compressed_formats
    ]
    missing_sources = sorted(expected_sources - source_rows)
    unexpected_sources = sorted(source_rows - expected_sources)
    missing_outputs = sorted(logged_paths - actual_paths)
    unexpected_outputs = sorted(actual_paths - logged_paths)
    container_paths = sum(format_counts[name] for name in CONTAINERS)
    compressed_counts = Counter(compressed_formats.values())

    independent: dict[str, object] = {"ran": False, "checked": {}, "failures": [], "verified": None}
    if args.independent_codecs:
        independent = verify_independent_codecs(root, compressed_formats, path_spellings, expanded_by_source)
        independent["ran"] = True

    known_match: dict[str, object] | None = None
    if args.known_file and args.known_output_path:
        if protected_relative(str(args.known_file)):
            raise ValueError("protected HideCtrlData files cannot be used as reference inputs")
        expected_length, expected_hash = hash_file(args.known_file.resolve(strict=True))
        known_path = output_path(root, args.known_output_path)
        actual_length, actual_hash = hash_file(known_path)
        known_match = {
            "outputPath": args.known_output_path,
            "reference": str(args.known_file),
            "bytes": actual_length,
            "sha256": actual_hash,
            "referenceBytes": expected_length,
            "referenceSha256": expected_hash,
            "match": actual_length == expected_length and actual_hash == expected_hash,
        }

    errors: list[str] = []
    error_count = 0
    with errors_path.open("r", encoding="utf-8") as error_stream:
        for line in error_stream:
            if line.strip():
                error_count += 1
                if len(errors) < 50:
                    errors.append(line.rstrip())
    physical_file_count = len(actual_paths) + protected_output_files
    compressed_total = sum(compressed_counts.values())
    expected_bpe_zlib_oodle = {
        "BPE": int(result.get("bpePayloads", 0)),
        "ZLIB": int(result.get("zlibPayloads", 0)),
        "OODL": int(result.get("oodlePayloads", 0)),
    }
    observed_compressed = {name: compressed_counts.get(name, 0) for name in sorted(COMPRESSED)}
    expected_container_paths = sum(format_counts.get(name, 0) for name in CONTAINERS)

    checks = {
        "extractorDone": bool(result.get("done")),
        "extractorVerified": bool(result.get("verified")),
        "extractorErrorsEmpty": error_count == 0 and int(result.get("failed", 0)) == 0,
        "sourceInventoryMatches": not missing_sources and not unexpected_sources,
        "sourceBytesMatch": int(result.get("sourceBytes", -1)) == expected_source_bytes,
        "allJournalFilesExist": not missing_logged_files,
        "allJournalHashesMatch": not hash_failures,
        "journalMatchesPhysicalTree": not missing_outputs and not unexpected_outputs,
        "noDuplicateOutputRows": duplicate_rows == 0,
        "sourceCopyCountMatches": len(source_rows) == int(result.get("sourceFilesCopied", -1)),
        "journalRowCountMatches": row_count == int(result.get("written", -1)),
        "journalByteCountMatches": journal_bytes == int(result.get("bytesWritten", -1)),
        "archiveEntryCountMatches": role_counts.get("archive-entry", 0) == int(result.get("archiveEntries", -1)),
        "containerCountMatches": expected_container_paths == int(result.get("archiveContainers", -1)),
        "codecCountsMatch": observed_compressed == expected_bpe_zlib_oodle,
        "allCompressedPayloadsExpanded": not unresolved_compressed and not orphan_expansions
            and int(result.get("unexpandedCompressedPayloads", -1)) == 0
            and int(result.get("expanded", -1)) == compressed_total,
        "noUnknownSourcePacFiles": not unknown_pac,
        "noProtectedOutputFiles": protected_output_files == 0
            and int(result.get("protectedOutputFiles", -1)) == 0,
        "independentCodecChecksPass": not args.independent_codecs or bool(independent["verified"]),
        "knownOutputMatchesReference": known_match is None or bool(known_match["match"]),
        "noInvalidJournalRows": not invalid_records,
        "reportedPhysicalCountMatches": int(result.get("outputFiles", -1)) == physical_file_count,
    }
    report = {
        "schema": "aurora-forge-pac19tree-verification/v1",
        "verified": all(checks.values()),
        "game": str(game),
        "root": str(root),
        "evidence": str(evidence),
        "scope": "single-source-file" if args.source else "full-asset-set",
        "singleSource": args.source,
        "checks": checks,
        "extractorResult": result,
        "sourceInventory": {
            "expectedFiles": len(expected_sources),
            "loggedFiles": len(source_rows),
            "expectedBytes": expected_source_bytes,
            "missingCount": len(missing_sources),
            "missingExamples": missing_sources[:20],
            "unexpectedCount": len(unexpected_sources),
            "unexpectedExamples": unexpected_sources[:20],
        },
        "output": {
            "journalRows": row_count,
            "uniqueLoggedFiles": len(logged_paths),
            "physicalFiles": physical_file_count,
            "hashesChecked": hash_checked,
            "journalBytes": journal_bytes,
            "formatCounts": dict(sorted(format_counts.items())),
            "roleCounts": dict(sorted(role_counts.items())),
            "duplicateRows": duplicate_rows,
            "hashFailureCount": len(hash_failures),
            "hashFailureExamples": hash_failures[:20],
            "missingCount": len(missing_outputs),
            "missingExamples": missing_outputs[:20],
            "unexpectedCount": len(unexpected_outputs),
            "unexpectedExamples": unexpected_outputs[:20],
        },
        "compression": {
            "storedPayloads": observed_compressed,
            "expandedPayloads": int(result.get("expanded", 0)),
            "unresolvedCount": len(unresolved_compressed),
            "unresolvedExamples": unresolved_compressed[:20],
            "orphanExpansionCount": len(orphan_expansions),
            "orphanExpansionExamples": orphan_expansions[:20],
            "independent": independent,
        },
        "archives": {
            "containerFiles": expected_container_paths,
            "unknownSourcePacCount": unknown_pac_count,
            "unknownSourcePacExamples": unknown_pac,
            "archiveEntries": role_counts.get("archive-entry", 0),
            "errorCount": error_count,
            "errors": errors[:50],
        },
        "protected": {
            "excludedFromSourceSelection": int(result.get("protectedFilesExcluded", 0)),
            "excludedArchiveEntries": int(result.get("protectedEntriesExcluded", 0)),
            "outputFilesFound": protected_output_files,
        },
        "knownOutputReference": known_match,
        "invalidJournalRecords": invalid_records[:50],
        "report": str(report_path),
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"verified": report["verified"], "checks": checks, "report": str(report_path)}, indent=2))
    return 0 if report["verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

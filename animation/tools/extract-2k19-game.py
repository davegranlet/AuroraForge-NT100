"""Export 2K19 assets preserving the game's native paths under output/Root.

2K19's native asset filesystem includes PAC containers. Their filenames and
bytes are preserved. Optional archive diagnostics are a separate layout, never
represented as the game's resolved asset filesystem.
"""
import argparse
import concurrent.futures
import hashlib
import json
import re
import shutil
import subprocess
import threading
import time
from pathlib import Path
from extract_2k19_pac import decompress_yukes_bpe

CONTAINERS = {b'HSPC', b'SHDC', b'EPAC', b'EPK8', b'PACH'}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--game', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--evidence', type=Path, required=True)
    p.add_argument('--workers', type=int, default=4)
    p.add_argument('--archive-diagnostics', action='store_true',
                   help='Legacy archive-entry debug layout, not native game paths')
    a = p.parse_args()
    repo = Path(__file__).resolve().parents[2]
    if not a.archive_diagnostics:
        return export_native_layout(a)
    helper = repo / 'umbrella-app/app/tools/pac19-helper/AuroraPac19Helper.exe'
    oodle = a.game / 'oo2core_6_win64.dll'
    if not helper.is_file() or not oodle.is_file():
        raise RuntimeError('Missing existing PAC helper or game Oodle DLL')
    if a.output.resolve() == a.game.resolve():
        raise RuntimeError('Output must differ from source')
    a.output.mkdir(parents=True, exist_ok=True)
    a.evidence.mkdir(parents=True, exist_ok=True)
    lock = threading.Lock()
    counts = dict(total=0, completed=0, archives=0, copied=0, failed=0, extracted_files=0)
    started = time.time()
    def call(request):
        tid = threading.get_ident()
        req = a.evidence / f'request-{tid}.json'
        req.write_text(json.dumps(dict(request, oodlePath=str(oodle))), encoding='utf-8')
        r = subprocess.run([str(helper), str(req)], capture_output=True, text=True,
                           timeout=300, creationflags=subprocess.CREATE_NO_WINDOW)
        if r.returncode:
            raise RuntimeError(r.stderr.strip() or r.stdout[-1000:])
        return json.loads(r.stdout)
    def unpack(src, out, depth=0):
        if depth > 16:
            raise RuntimeError('Nested archive depth exceeded')
        with src.open('rb') as f:
            magic = f.read(4)
        if magic == b'BPE ':
            data = decompress_yukes_bpe(src.read_bytes())
            decoded = src.with_name(src.name + '.decoded.bin')
            if decoded.exists():
                raise RuntimeError(f'Refusing to overwrite {decoded}')
            decoded.write_bytes(data)
            return 1 + unpack(decoded, out, depth+1)
        if magic not in CONTAINERS:
            return 0
        entries = call(dict(action='inspect', archivePath=str(src)))['Entries']
        # Flatten lists both containers and descendants; extract leaves once.
        leaves = [e['Id'] for e in entries if e['Type'].encode() not in CONTAINERS]
        if not leaves:
            return 0
        out.mkdir(parents=True, exist_ok=True)
        result = call(dict(action='extract', archivePath=str(src), outputRoot=str(out),
                           entryIds=leaves, overwrite=False))
        n = 0
        for entry in result['Results']:
            child = out / entry['File']
            if hashlib.sha256(child.read_bytes()).hexdigest().upper() != entry['Sha256']:
                raise RuntimeError(f'Extracted hash mismatch: {child}')
            n += 1 + unpack(child, child.with_name(child.name + '.extracted'), depth+1)
        return n
    sources = []
    for folder in ['pac', 'gameresource', 'movies', 'sound']:
        root = a.game / folder
        if root.is_dir():
            sources.extend(x for x in root.rglob('*') if x.is_file() and
                           'hide' not in [part.lower() for part in x.parts] and
                           'hidectrldata' not in x.name.lower())
    sources.extend(x for x in a.game.glob('Chunk*') if x.is_file())
    counts['total'] = len(sources)
    # Completed records allow interruption/resume without overwriting output.
    journal = a.evidence / 'files.jsonl'
    done = set()
    if journal.exists():
        for line in journal.read_text(encoding='utf-8').splitlines():
            row = json.loads(line)
            if row['status'] == 'ok':
                done.add(row['source'])
    def process(src):
        relative = src.relative_to(a.game)
        row = dict(source=str(relative), status='ok')
        try:
            if str(relative) in done:
                row['resumed'] = True
                return row
            dst = a.output / relative
            if dst.exists():
                raise RuntimeError(f'Destination already exists: {dst}')
            dst.parent.mkdir(parents=True, exist_ok=True)
            with src.open('rb') as f:
                magic = f.read(4)
            row['bytes'] = src.stat().st_size
            row['magic'] = magic.hex()
            if magic in CONTAINERS:
                row['kind'] = 'archive'
                row['extracted_files'] = unpack(src, dst.with_name(dst.name+'.extracted'))
            else:
                row['kind'] = 'loose-copy'
                shutil.copy2(src, dst)
                def digest(file):
                    with file.open('rb') as stream:
                        return hashlib.file_digest(stream, 'sha256').hexdigest()
                row['sha256'] = digest(src)
                if digest(dst) != row['sha256']:
                    raise RuntimeError('Copied file hash mismatch')
        except Exception as e:
            row.update(status='error', error=str(e))
        return row
    def progress():
        summary = dict(counts, elapsed_seconds=round(time.time()-started),
                       source=str(a.game), output=str(a.output))
        temp = a.evidence / 'progress.part.json'
        temp.write_text(json.dumps(summary, indent=2), encoding='utf-8')
        temp.replace(a.evidence / 'progress.json')
        return summary
    with journal.open('a', encoding='utf-8') as log, concurrent.futures.ThreadPoolExecutor(max_workers=a.workers) as pool:
        for row in pool.map(process, sources):
            log.write(json.dumps(row)+'\n')
            log.flush()
            counts['completed'] += 1
            if row['status'] != 'ok': counts['failed'] += 1
            elif row.get('kind') == 'archive': counts['archives'] += 1
            elif row.get('kind') == 'loose-copy': counts['copied'] += 1
            counts['extracted_files'] += row.get('extracted_files', 0)
            if counts['completed'] % 100 == 0:
                print(json.dumps(progress()), flush=True)
    summary = progress()
    (a.evidence / 'result.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    print(json.dumps(summary), flush=True)
    return 1 if counts['failed'] else 0

def export_native_layout(a):
    source = a.game.resolve(strict=True)
    root = (a.output / 'Root').resolve()
    if root == source or source in root.parents:
        raise RuntimeError('Output must be outside game installation')
    root.mkdir(parents=True, exist_ok=True)
    a.evidence.mkdir(parents=True, exist_ok=True)
    files = []
    for folder in ('pac', 'gameresource', 'movies', 'sound'):
        base = source / folder
        if base.is_dir():
            files.extend(f for f in base.rglob('*') if f.is_file()
                         and 'hide' not in [part.lower() for part in f.relative_to(source).parts]
                         and 'hidectrldata' not in f.name.lower())
    files.extend(f for f in source.glob('Chunk*') if f.is_file())
    files.sort(key=lambda f: str(f.relative_to(source)).lower())
    def digest(file):
        with file.open('rb') as stream:
            return hashlib.file_digest(stream, 'sha256').hexdigest().upper()
    def copy(src):
        relative = src.relative_to(source)
        dest = root / relative
        row = dict(path=relative.as_posix(), bytes=src.stat().st_size)
        try:
            source_hash = digest(src)
            if dest.exists():
                if digest(dest) != source_hash:
                    raise RuntimeError('Existing output differs; refusing overwrite')
            else:
                dest.parent.mkdir(parents=True, exist_ok=True)
                part = dest.with_name(dest.name + '.aurora-part')
                with src.open('rb') as inp, part.open('xb') as out:
                    shutil.copyfileobj(inp, out, 4*1024*1024)
                if digest(part) != source_hash:
                    raise RuntimeError('Copied output hash mismatch')
                shutil.copystat(src, part)
                part.replace(dest)
            row.update(status='ok', sha256=source_hash)
        except Exception as error:
            row.update(status='error', error=str(error))
        return row
    start = time.time()
    summary = dict(layout='native-2k19-game-paths', source=str(source), root=str(root),
                   total=len(files), completed=0, failed=0, bytes=0,
                   note='Native PAC files remain PAC files; this is not a decoded virtual filesystem or a format conversion.')
    progress_file = a.evidence / 'native-progress.json'
    def save():
        summary['elapsed_seconds'] = round(time.time()-start)
        part = progress_file.with_suffix('.part.json')
        part.write_text(json.dumps(summary, indent=2), encoding='utf-8')
        part.replace(progress_file)
    save()
    with (a.evidence / 'native-files.jsonl').open('w', encoding='utf-8') as log:
        with concurrent.futures.ThreadPoolExecutor(max_workers=a.workers) as pool:
            for row in pool.map(copy, files):
                log.write(json.dumps(row)+'\n')
                log.flush()
                summary['completed'] += 1
                summary['failed'] += row['status'] != 'ok'
                summary['bytes'] += row['bytes'] if row['status'] == 'ok' else 0
                if summary['completed'] % 500 == 0:
                    save()
                    print(json.dumps(summary), flush=True)
    actual = {f.relative_to(root).as_posix() for f in root.rglob('*') if f.is_file()}
    expected = {f.relative_to(source).as_posix() for f in files}
    summary['missing_paths'] = sorted(expected-actual)
    summary['unexpected_paths'] = sorted(actual-expected)
    summary['verified'] = not summary['failed'] and actual == expected
    save()
    (a.evidence / 'native-result.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    print(json.dumps(summary), flush=True)
    return 0 if summary['verified'] else 1

if __name__ == '__main__':
    raise SystemExit(main())

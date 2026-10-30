using System.Buffers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace AuroraForge.Pac19Helper;

internal static class TreeProgram
{
    private const int CopyBufferSize = 4 * 1024 * 1024;
    private static string root = "";
    private static StreamWriter journal = null!;
    private static StreamWriter errors = null!;
    private static readonly object gate = new();

    private static long written;
    private static long expanded;
    private static long completed;
    private static long failed;
    private static long bytesWritten;
    private static long sourceFilesCopied;
    private static long archiveContainers;
    private static long archiveEntries;
    private static long bpePayloads;
    private static long zlibPayloads;
    private static long oodlePayloads;
    private static long protectedFilesExcluded;
    private static long protectedEntriesExcluded;
    private static int maximumDepth;

    private static string Hash(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes));

    private static string HashFile(string path)
    {
        using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read,
            CopyBufferSize, FileOptions.SequentialScan);
        using var sha = SHA256.Create();
        return Convert.ToHexString(sha.ComputeHash(stream));
    }

    private static bool IsWithin(string parent, string candidate)
    {
        var relative = Path.GetRelativePath(parent, candidate);
        return relative != "." && relative != ".."
            && !relative.StartsWith(".." + Path.DirectorySeparatorChar, StringComparison.Ordinal)
            && !Path.IsPathRooted(relative);
    }

    private static string DetectType(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length >= 4 && bytes[0] == (byte)'0' && bytes[1] == (byte)'F'
            && bytes[2] == (byte)'O' && bytes[3] == (byte)'P') return "0FOP";
        return PacFormat.Detect(bytes);
    }

    private static string ReadType(string path)
    {
        Span<byte> prefix = stackalloc byte[4];
        using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read,
            4096, FileOptions.SequentialScan);
        var count = stream.Read(prefix);
        return DetectType(prefix[..count]);
    }

    private static bool IsCompressed(string type) => type is "BPE" or "ZLIB" or "OODL";

    private static string Extension(string type) => type switch
    {
        "HSPC" or "SHDC" or "EPAC" or "EPK8" or "PACH" => ".pac",
        "BPE" => ".bpe",
        "ZLIB" => ".zlib",
        "OODL" => ".oodle",
        "0FOP" => ".0fop",
        "YANM" => ".yanm",
        "JBOY" or "YOBJ" => ".yobj",
        "DDS" => ".dds",
        "TEX!" => ".tex",
        "MDL!" => ".mdl",
        "MTLs" => ".mtls",
        "DUMY" => ".dumy",
        _ => ".bin"
    };

    private static string Extension(byte[] bytes) => Extension(DetectType(bytes));

    private static string Safe(string name)
    {
        var safe = string.Concat(name.Select(c => Path.GetInvalidFileNameChars().Contains(c) ? '_' : c))
            .TrimEnd('.', ' ');
        return safe.Length == 0 ? "0000" : safe;
    }

    private static string RelativeToRoot(string path) => Path.GetRelativePath(root, path);

    private static void EnsureOutputPath(string path)
    {
        var target = Path.GetFullPath(path);
        if (!IsWithin(root, target)) throw new IOException("Output escaped Root: " + target);
    }

    private static void Record(string target, string source, long length, string sha256, string format,
        string role, string? nativeName = null, string? compression = null, string? decodedFrom = null,
        int? nativeIndex = null)
    {
        var row = new
        {
            path = RelativeToRoot(target),
            source,
            bytes = length,
            sha256,
            format,
            role,
            nativeName,
            nativeIndex,
            compression,
            decodedFrom
        };
        lock (gate)
        {
            journal.WriteLine(JsonSerializer.Serialize(row));
            written++;
            bytesWritten += length;
            if (role == "source-file") sourceFilesCopied++;
        }
    }

    private static void Write(string file, byte[] data, string source, string role,
        string? nativeName = null, string? compression = null, string? decodedFrom = null,
        int? nativeIndex = null)
    {
        var target = Path.GetFullPath(file);
        EnsureOutputPath(target);
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);

        var hash = Hash(data);
        if (File.Exists(target))
        {
            if (!StringComparer.Ordinal.Equals(HashFile(target), hash))
                throw new IOException("Existing output differs; refusing overwrite: " + target);
        }
        else
        {
            var temporary = target + ".aurora-part-" + Guid.NewGuid().ToString("N");
            try
            {
                using (var output = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write,
                    FileShare.None, CopyBufferSize, FileOptions.SequentialScan))
                {
                    output.Write(data, 0, data.Length);
                    output.Flush(true);
                }
                if (!StringComparer.Ordinal.Equals(HashFile(temporary), hash))
                    throw new IOException("Temporary output hash mismatch: " + target);
                try
                {
                    File.Move(temporary, target);
                }
                catch (IOException) when (File.Exists(target))
                {
                    if (!StringComparer.Ordinal.Equals(HashFile(target), hash))
                        throw new IOException("Concurrent output differs; refusing overwrite: " + target);
                }
            }
            finally
            {
                if (File.Exists(temporary)) File.Delete(temporary);
            }
        }
        Record(target, source, data.LongLength, hash, DetectType(data), role,
            nativeName, compression, decodedFrom, nativeIndex);
    }

    private static string CopyAndHash(string source, string temporary)
    {
        using var input = new FileStream(source, FileMode.Open, FileAccess.Read, FileShare.Read,
            CopyBufferSize, FileOptions.SequentialScan);
        using var output = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write,
            FileShare.None, CopyBufferSize, FileOptions.SequentialScan);
        using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        var buffer = ArrayPool<byte>.Shared.Rent(CopyBufferSize);
        try
        {
            while (true)
            {
                var count = input.Read(buffer, 0, buffer.Length);
                if (count == 0) break;
                output.Write(buffer, 0, count);
                hash.AppendData(buffer, 0, count);
            }
            output.Flush(true);
            return Convert.ToHexString(hash.GetHashAndReset());
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
        }
    }

    private static void CopySource(string source, string file, string relative, string format)
    {
        var target = Path.GetFullPath(file);
        EnsureOutputPath(target);
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        var length = new FileInfo(source).Length;
        string hash;

        if (File.Exists(target))
        {
            hash = HashFile(source);
            if (!StringComparer.Ordinal.Equals(HashFile(target), hash))
                throw new IOException("Existing output differs; refusing overwrite: " + target);
        }
        else
        {
            var temporary = target + ".aurora-part-" + Guid.NewGuid().ToString("N");
            try
            {
                hash = CopyAndHash(source, temporary);
                if (new FileInfo(temporary).Length != length
                    || !StringComparer.Ordinal.Equals(HashFile(temporary), hash))
                    throw new IOException("Streamed copy verification failed: " + target);
                try
                {
                    File.Move(temporary, target);
                }
                catch (IOException) when (File.Exists(target))
                {
                    if (!StringComparer.Ordinal.Equals(HashFile(target), hash))
                        throw new IOException("Concurrent output differs; refusing overwrite: " + target);
                }
            }
            finally
            {
                if (File.Exists(temporary)) File.Delete(temporary);
            }
        }

        Record(target, relative, length, hash, format, "source-file");
    }

    private static byte[] Bpe(byte[] blob)
    {
        if (blob.Length < 16 || DetectType(blob) != "BPE")
            throw new InvalidDataException("The BPE entry header is invalid.");
        var size = checked((int)BitConverter.ToUInt32(blob, 8));
        var expected = checked((int)BitConverter.ToUInt32(blob, 12));
        if (size > blob.Length - 16 || expected > 1024 * 1024 * 1024)
            throw new InvalidDataException("Invalid BPE sizes.");

        var dictionary = new byte[512];
        var output = new byte[expected];
        var cursor = 16;
        var end = 16 + size;
        var position = 0;
        var stack = new Stack<int>();

        int Read()
        {
            if (cursor >= end) throw new EndOfStreamException("Truncated BPE payload.");
            return blob[cursor++];
        }

        while (position < expected)
        {
            var index = 0;
            while (index < 256)
            {
                var control = Read();
                if (control > 127)
                {
                    control -= 127;
                    while (control > 0 && index < 256)
                    {
                        dictionary[index * 2] = (byte)index;
                        index++;
                        control--;
                    }
                }
                control++;
                while (control > 0 && index < 256)
                {
                    var first = Read();
                    dictionary[index * 2] = (byte)first;
                    if (index != first) dictionary[index * 2 + 1] = (byte)Read();
                    index++;
                    control--;
                }
            }

            var block = Read() | (Read() << 8);
            while (block > 0 || stack.Count > 0)
            {
                int symbol;
                if (stack.Count > 0) symbol = stack.Pop();
                else
                {
                    symbol = Read();
                    block--;
                }

                var first = dictionary[symbol * 2];
                if (symbol == first)
                {
                    output[position++] = (byte)symbol;
                    if (position == expected) break;
                }
                else
                {
                    if (stack.Count > 65536) throw new InvalidDataException("Invalid BPE expansion stack.");
                    stack.Push(dictionary[symbol * 2 + 1]);
                    stack.Push(first);
                }
            }
        }
        return output;
    }

    private static bool IsProtectedPath(string path, string game)
    {
        var relative = Path.GetRelativePath(game, path);
        return relative.Split(new[] { Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar },
                StringSplitOptions.RemoveEmptyEntries)
            .Any(part => part.Contains("HideCtrlData", StringComparison.OrdinalIgnoreCase));
    }

    private static bool IsProtectedNativeName(string name)
    {
        if (name.Contains("HideCtrlData", StringComparison.OrdinalIgnoreCase)) return true;
        if (name.Length == 0 || name.Length % 2 != 0 || !name.All(Uri.IsHexDigit)) return false;
        try
        {
            return Encoding.ASCII.GetString(Convert.FromHexString(name))
                .Contains("HideCtrlData", StringComparison.OrdinalIgnoreCase);
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static void CountCompressed(string type)
    {
        switch (type)
        {
            case "BPE": Interlocked.Increment(ref bpePayloads); break;
            case "ZLIB": Interlocked.Increment(ref zlibPayloads); break;
            case "OODL": Interlocked.Increment(ref oodlePayloads); break;
        }
    }

    private static void UpdateDepth(int depth)
    {
        lock (gate)
        {
            if (depth > maximumDepth) maximumDepth = depth;
        }
    }

    private static void Unpack(byte[] data, string file, string origin, OodleCodec codec, int depth = 0)
    {
        if (depth > 24) throw new InvalidDataException("Archive recursion limit exceeded.");
        UpdateDepth(depth);
        var type = DetectType(data);
        if (IsCompressed(type))
        {
            CountCompressed(type);
            var raw = type switch
            {
                "BPE" => Bpe(data),
                "ZLIB" => CompressionCodec.DecompressZlib(data),
                "OODL" => codec.Decompress(data),
                _ => throw new InvalidDataException("Unsupported compression type: " + type)
            };
            var decoded = Path.Combine(Path.GetDirectoryName(file)!,
                Path.GetFileNameWithoutExtension(file) + Extension(raw));
            if (decoded.Equals(file, StringComparison.OrdinalIgnoreCase)) decoded = file + ".decoded";
            Write(decoded, raw, origin, "decompressed", compression: type, decodedFrom: RelativeToRoot(file));
            Interlocked.Increment(ref expanded);
            Unpack(raw, decoded, origin, codec, depth + 1);
            return;
        }

        if (!PacFormat.IsContainer(type)) return;
        Interlocked.Increment(ref archiveContainers);
        var outputDirectory = Path.Combine(Path.GetDirectoryName(file)!, "@" + Path.GetFileName(file));
        var children = PacFormat.DirectChildren(data, type);
        var safeNames = children.Select(child => Safe(child.Name)).ToArray();
        var safeNameCounts = safeNames
            .GroupBy(name => name, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.Count(), StringComparer.OrdinalIgnoreCase);
        for (var childIndex = 0; childIndex < children.Count; childIndex++)
        {
            var child = children[childIndex];
            if (IsProtectedNativeName(child.Name))
            {
                Interlocked.Increment(ref protectedEntriesExcluded);
                continue;
            }

            Interlocked.Increment(ref archiveEntries);
            var name = safeNames[childIndex];
            if (name.Length < 4) name = name.PadLeft(4, '0');
            if (safeNameCounts[safeNames[childIndex]] > 1)
                name += "~" + childIndex.ToString("D4");
            var target = Path.Combine(outputDirectory, name);
            try
            {
                var raw = data.AsSpan(child.Offset, child.Length).ToArray();
                target = Path.Combine(outputDirectory, name + Extension(raw));
                Write(target, raw, origin, "archive-entry", nativeName: child.Name, nativeIndex: childIndex);
                Unpack(raw, target, origin, codec, depth + 1);
            }
            catch (Exception error)
            {
                Error(origin, RelativeToRoot(target), error);
            }
        }
    }

    private static void Error(string source, string path, Exception error)
    {
        lock (gate)
        {
            failed++;
            errors.WriteLine(JsonSerializer.Serialize(new { source, path, error = error.Message }));
            errors.Flush();
        }
    }

    private static IEnumerable<string> EnumerateSourceFiles(string game)
    {
        foreach (var folder in new[] { "pac", "gameresource", "movies", "sound" })
        {
            var path = Path.Combine(game, folder);
            if (Directory.Exists(path))
                foreach (var file in Directory.EnumerateFiles(path, "*", SearchOption.AllDirectories))
                    yield return file;
        }

        foreach (var file in Directory.EnumerateFiles(game, "Chunk*")) yield return file;
    }

    private static int Main(string[] args)
    {
        if (args.Length is < 3 or > 4)
            throw new ArgumentException("Usage: Pac19Tree <game> <output/Root> <evidence> [single-source-file]");

        var game = Path.GetFullPath(args[0]);
        root = Path.GetFullPath(args[1]).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        var evidence = Path.GetFullPath(args[2]);
        if (!Directory.Exists(game)) throw new DirectoryNotFoundException("Game installation not found: " + game);
        if (root.Equals(game, StringComparison.OrdinalIgnoreCase) || IsWithin(game, root))
            throw new InvalidOperationException("Output Root must be outside the source installation.");
        if (evidence.Equals(root, StringComparison.OrdinalIgnoreCase)
            || IsWithin(root, evidence) || IsWithin(evidence, root)
            || evidence.Equals(game, StringComparison.OrdinalIgnoreCase)
            || IsWithin(game, evidence))
            throw new InvalidOperationException("Evidence must be outside both the output Root and source installation.");

        Directory.CreateDirectory(root);
        Directory.CreateDirectory(evidence);
        using var journalStream = new StreamWriter(Path.Combine(evidence, "tree-files.jsonl"), false);
        using var errorStream = new StreamWriter(Path.Combine(evidence, "tree-errors.jsonl"), false);
        journal = journalStream;
        errors = errorStream;

        var files = new List<string>();
        if (args.Length == 4)
        {
            var sample = Path.GetFullPath(args[3]);
            if (!IsWithin(game, sample) || !File.Exists(sample))
                throw new InvalidOperationException("Single source file must be inside the game installation.");
            if (IsProtectedPath(sample, game))
                throw new InvalidOperationException("Protected HideCtrlData files cannot be selected.");
            files.Add(sample);
        }
        else
        {
            foreach (var source in EnumerateSourceFiles(game))
            {
                if (IsProtectedPath(source, game))
                {
                    protectedFilesExcluded++;
                    continue;
                }
                files.Add(source);
            }
        }

        files = files.Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(file => Path.GetRelativePath(game, file), StringComparer.OrdinalIgnoreCase)
            .ToList();
        var sourceBytes = files.Sum(file => new FileInfo(file).Length);
        var started = DateTime.UtcNow;

        object Status(bool done) => new
        {
            done,
            total = files.Count,
            completed,
            sourceFilesCopied,
            written,
            archiveContainers,
            archiveEntries,
            bpePayloads,
            zlibPayloads,
            oodlePayloads,
            expanded,
            unexpandedCompressedPayloads = bpePayloads + zlibPayloads + oodlePayloads - expanded,
            failed,
            protectedFilesExcluded,
            protectedEntriesExcluded,
            maximumDepth,
            sourceBytes,
            bytesWritten,
            root,
            elapsedSeconds = (int)(DateTime.UtcNow - started).TotalSeconds
        };

        void Progress(bool done)
        {
            lock (gate)
            {
                journal.Flush();
                var summary = JsonSerializer.Serialize(Status(done));
                File.WriteAllText(Path.Combine(evidence, "tree-progress.json"), summary);
                Console.WriteLine(summary);
            }
        }

        Progress(false);
        Parallel.ForEach(files, new ParallelOptions { MaxDegreeOfParallelism = 4 },
            () => new OodleCodec(Path.Combine(game, "oo2core_6_win64.dll")),
            (source, state, codec) =>
            {
                var relative = Path.GetRelativePath(game, source);
                var target = Path.Combine(root, relative);
                try
                {
                    var type = ReadType(source);
                    if (PacFormat.IsContainer(type) || IsCompressed(type))
                    {
                        var data = File.ReadAllBytes(source);
                        Write(target, data, relative, "source-file");
                        Unpack(data, target, relative, codec);
                    }
                    else
                    {
                        CopySource(source, target, relative, type);
                    }
                }
                catch (Exception error)
                {
                    Error(relative, relative, error);
                }

                var current = Interlocked.Increment(ref completed);
                if (current % 500 == 0) Progress(false);
                return codec;
            }, codec => codec.Dispose());

        journal.Flush();
        var physicalFiles = Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories).ToList();
        var protectedOutputFiles = physicalFiles.Count(file => IsProtectedPath(file, root));
        var missingSourceCopies = files.Count(file =>
            !File.Exists(Path.Combine(root, Path.GetRelativePath(game, file))));
        var compressedTotal = bpePayloads + zlibPayloads + oodlePayloads;
        var final = new
        {
            done = true,
            verified = failed == 0 && completed == files.Count && sourceFilesCopied == files.Count
                && missingSourceCopies == 0 && protectedOutputFiles == 0 && expanded == compressedTotal,
            total = files.Count,
            completed,
            sourceFilesCopied,
            missingSourceCopies,
            written,
            outputFiles = physicalFiles.Count,
            archiveContainers,
            archiveEntries,
            bpePayloads,
            zlibPayloads,
            oodlePayloads,
            expanded,
            unexpandedCompressedPayloads = compressedTotal - expanded,
            failed,
            protectedFilesExcluded,
            protectedEntriesExcluded,
            protectedOutputFiles,
            maximumDepth,
            sourceBytes,
            bytesWritten,
            root,
            elapsedSeconds = (int)(DateTime.UtcNow - started).TotalSeconds
        };
        var result = JsonSerializer.Serialize(final);
        File.WriteAllText(Path.Combine(evidence, "tree-result.json"), result);
        Console.WriteLine(result);
        return final.verified ? 0 : 1;
    }
}

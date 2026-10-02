using System.IO.Compression;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace AuroraForge.Pac19Helper;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private static int Main(string[] args)
    {
        try
        {
            if (args.Length != 1) throw new InvalidOperationException("Pass exactly one Aurora Forge PAC request JSON file.");
            var request = JsonSerializer.Deserialize<PacRequest>(File.ReadAllText(args[0]), JsonOptions)
                ?? throw new InvalidOperationException("The PAC request is empty.");
            object response = (request.Action ?? "").ToLowerInvariant() switch
            {
                "inspect" => Inspect(request),
                "extract" => Extract(request),
                "replace" => Replace(request),
                "selftest" => SelfTest(),
                _ => throw new InvalidOperationException("The PAC request action is not supported.")
            };
            Console.WriteLine(JsonSerializer.Serialize(response));
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine(error.Message);
            return 1;
        }
    }

    private static InspectResponse Inspect(PacRequest request)
    {
        var archivePath = ExistingFile(request.ArchivePath, "PAC archive");
        var bytes = File.ReadAllBytes(archivePath);
        var rootType = PacFormat.Detect(bytes);
        if (!PacFormat.IsContainer(rootType)) throw new InvalidDataException($"{Path.GetFileName(archivePath)} is {rootType}, not a supported PAC container.");
        var entries = FriendlyEntries(archivePath, bytes);
        return new InspectResponse(Path.GetFileName(archivePath), archivePath, rootType, bytes.LongLength, entries, entries.Count(x => x.Replaceable));
    }

    private static ExtractResponse Extract(PacRequest request)
    {
        var archivePath = ExistingFile(request.ArchivePath, "PAC archive");
        var outputRoot = ExistingFolder(request.OutputRoot, "Output folder");
        var requested = request.EntryIds?.Distinct(StringComparer.Ordinal).ToArray() ?? Array.Empty<string>();
        if (requested.Length == 0) throw new InvalidOperationException("Select at least one PAC entry to extract.");
        var source = File.ReadAllBytes(archivePath);
        var allEntries = PacFormat.Flatten(source).ToDictionary(x => x.Id, StringComparer.Ordinal);
        using var oodle = NeedsOodle(requested, allEntries) ? new OodleCodec(ExistingFile(request.OodlePath, "WWE 2K19 Oodle library")) : null;
        var results = new List<ExtractedEntry>();
        foreach (var id in requested)
        {
            if (!allEntries.TryGetValue(id, out var listed)) throw new InvalidDataException($"PAC entry {id} no longer exists.");
            var located = PacFormat.Locate(source, id);
            byte[] payload;
            string outputType;
            if (located.Type == "OODL")
            {
                payload = oodle!.Decompress(located.Bytes);
                outputType = PacFormat.Detect(payload);
            }
            else if (located.Type == "ZLIB")
            {
                payload = CompressionCodec.DecompressZlib(located.Bytes);
                outputType = PacFormat.Detect(payload);
            }
            else if (located.Type == "BPE")
            {
                payload = located.Bytes;
                outputType = "BPE";
            }
            else
            {
                payload = located.Bytes;
                outputType = located.Type;
            }
            var extension = PacFormat.Extension(outputType, located.Type is "OODL" or "ZLIB");
            var displayName = FriendlyEntryName(archivePath, listed);
            var relative = SafeName($"{id.Replace('/', '-')}_{displayName}") + extension;
            var target = Path.Combine(outputRoot, relative);
            if (!request.Overwrite && File.Exists(target)) throw new IOException($"{relative} already exists in the output folder.");
            File.WriteAllBytes(target, payload);
            results.Add(new ExtractedEntry(id, relative, payload.LongLength, Convert.ToHexString(SHA256.HashData(payload)), located.Type == "BPE" ? "BPE remains compressed in this release." : ""));
        }
        var manifestPath = Path.Combine(outputRoot, $"{SafeName(Path.GetFileNameWithoutExtension(archivePath))}-aurora-pac-manifest.json");
        File.WriteAllText(manifestPath, JsonSerializer.Serialize(new ExtractionManifest(archivePath, DateTimeOffset.UtcNow, results), new JsonSerializerOptions { WriteIndented = true }));
        return new ExtractResponse(results.Count, manifestPath, results);
    }

    private static ReplaceResponse Replace(PacRequest request)
    {
        var archivePath = ExistingFile(request.ArchivePath, "PAC archive");
        var replacementPath = ExistingFile(request.ReplacementPath, "Replacement file");
        var outputPath = RequiredPath(request.OutputPath, "Output PAC");
        if (Path.GetFullPath(outputPath).Equals(Path.GetFullPath(archivePath), StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Choose a new output filename. Aurora Forge will not overwrite the original PAC.");
        if (string.IsNullOrWhiteSpace(request.EntryId)) throw new InvalidOperationException("Choose one PAC entry to replace.");
        var source = File.ReadAllBytes(archivePath);
        var listed = PacFormat.Flatten(source).FirstOrDefault(x => x.Id == request.EntryId)
            ?? throw new InvalidDataException("The selected PAC entry no longer exists.");
        if (!listed.Replaceable) throw new InvalidOperationException(listed.ReplaceReason);
        var located = PacFormat.Locate(source, request.EntryId);
        var rawReplacement = File.ReadAllBytes(replacementPath);
        byte[] storedReplacement;
        using (var oodle = located.Type == "OODL" ? new OodleCodec(ExistingFile(request.OodlePath, "WWE 2K19 Oodle library")) : null)
        {
            storedReplacement = located.Type switch
            {
                "OODL" => oodle!.Compress(rawReplacement),
                "ZLIB" => CompressionCodec.CompressZlib(rawReplacement),
                _ => ValidateRawReplacement(located.Type, rawReplacement)
            };
        }
        var rebuilt = PacFormat.Replace(source, request.EntryId, storedReplacement);
        Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);
        var temporary = outputPath + ".aurora-part";
        try
        {
            File.WriteAllBytes(temporary, rebuilt);
            var check = PacFormat.Flatten(rebuilt).FirstOrDefault(x => x.Id == request.EntryId)
                ?? throw new InvalidDataException("The rebuilt PAC did not contain the replaced entry.");
            File.Move(temporary, outputPath, true);
            return new ReplaceResponse(outputPath, rebuilt.LongLength, request.EntryId, check.StoredSize, Convert.ToHexString(SHA256.HashData(rebuilt)), "The original PAC was not changed.");
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }

    private static byte[] ValidateRawReplacement(string expectedType, byte[] replacement)
    {
        var actual = PacFormat.Detect(replacement);
        if (expectedType != "BIN" && actual != expectedType)
            throw new InvalidDataException($"The selected entry is {expectedType}, but the replacement appears to be {actual}.");
        return replacement;
    }

    private static bool NeedsOodle(IEnumerable<string> ids, IReadOnlyDictionary<string, PacEntry> entries) =>
        ids.Any(id => entries.TryGetValue(id, out var entry) && entry.Type == "OODL");

    private static List<PacEntry> FriendlyEntries(string archivePath, byte[] bytes) =>
        PacFormat.Flatten(bytes).Select(entry => entry with { Name = FriendlyEntryName(archivePath, entry) }).ToList();

    private static string FriendlyEntryName(string archivePath, PacEntry entry)
    {
        if (!LooksLikeRawIdentifier(entry.Name)) return entry.Name;
        var archiveName = SafeName(Path.GetFileNameWithoutExtension(archivePath)).Replace('_', ' ');
        var entryId = entry.Id.Replace('/', '.');
        return $"{archiveName} entry {entryId} ({entry.Type})";
    }

    private static bool LooksLikeRawIdentifier(string? value)
    {
        var clean = (value ?? "").Trim();
        if (clean.Length == 0) return true;
        if (clean.StartsWith("entry-", StringComparison.OrdinalIgnoreCase)) return true;
        return clean.Length >= 4 && clean.All(Uri.IsHexDigit);
    }

    private static SelfTestResponse SelfTest()
    {
        var original = Encoding.ASCII.GetBytes("Aurora Forge PAC self-test");
        var replacement = Encoding.ASCII.GetBytes("Aurora Forge replacement passed");
        var zlib = CompressionCodec.CompressZlib(original);
        var shdc = PacFixtures.BuildShdc(zlib);
        var hspc = PacFixtures.BuildHspc(shdc);
        var entries = PacFormat.Flatten(hspc);
        if (entries.Count != 2 || entries[^1].Type != "ZLIB") throw new InvalidDataException("The PAC parser self-test failed.");
        var rebuilt = PacFormat.Replace(hspc, "0/0", CompressionCodec.CompressZlib(replacement));
        var recovered = CompressionCodec.DecompressZlib(PacFormat.Locate(rebuilt, "0/0").Bytes);
        if (!recovered.SequenceEqual(replacement)) throw new InvalidDataException("The PAC rebuild self-test failed.");
        return new SelfTestResponse(true, entries.Count, "HSPC, SHDC, ZLIB extraction, replacement, and header updates passed.");
    }

    private static string ExistingFile(string? value, string label)
    {
        var path = RequiredPath(value, label);
        if (!File.Exists(path)) throw new FileNotFoundException(label + " was not found.", path);
        return path;
    }

    private static string ExistingFolder(string? value, string label)
    {
        var path = RequiredPath(value, label);
        if (!Directory.Exists(path)) throw new DirectoryNotFoundException(label + " was not found.");
        return path;
    }

    private static string RequiredPath(string? value, string label) => string.IsNullOrWhiteSpace(value) ? throw new InvalidOperationException(label + " is required.") : Path.GetFullPath(value);
    private static string SafeName(string value) => string.Concat(value.Select(c => Path.GetInvalidFileNameChars().Contains(c) || char.IsWhiteSpace(c) ? '_' : c)).Trim('_').TrimEnd('.');
}

internal static class PacFormat
{
    internal static string Detect(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 4) return "BIN";
        var magic = Encoding.ASCII.GetString(bytes[..4]);
        if (magic.StartsWith("BPE", StringComparison.Ordinal)) return "BPE";
        return magic switch
        {
            "HSPC" or "SHDC" or "EPAC" or "EPK8" or "PACH" or "OODL" or "ZLIB" or "JBOY" or "YOBJ" or "DDS " or "TEX!" or "MDL!" or "MTLs" or "DUMY" or "YANM" => magic.TrimEnd(),
            _ when bytes[0] == 0x44 && bytes[1] == 0x44 && bytes[2] == 0x53 => "DDS",
            _ => "BIN"
        };
    }

    internal static bool IsContainer(string type) => type is "HSPC" or "SHDC" or "EPAC" or "EPK8" or "PACH";

    internal static List<PacEntry> Flatten(byte[] root)
    {
        var output = new List<PacEntry>();
        Walk(root, "", 0, true, output);
        return output;
    }

    private static void Walk(byte[] bytes, string prefix, int depth, bool writablePath, List<PacEntry> output)
    {
        var type = Detect(bytes);
        var children = ParseChildren(bytes, type);
        for (var index = 0; index < children.Count; index++)
        {
            var child = children[index];
            var id = string.IsNullOrEmpty(prefix) ? index.ToString() : $"{prefix}/{index}";
            var childBytes = Slice(bytes, child.Offset, child.Length);
            var childType = Detect(childBytes);
            var expanded = childType switch
            {
                "OODL" when childBytes.Length >= 24 => ReadU32(childBytes, 0x10),
                "ZLIB" when childBytes.Length >= 16 => ReadU32(childBytes, 0x0c),
                _ => childBytes.LongLength
            };
            var pathWritable = writablePath && type is "HSPC" or "SHDC";
            var replaceable = pathWritable && !IsContainer(childType) && childType != "BPE";
            var reason = replaceable ? "" : childType == "BPE"
                ? "BPE rebuilding is not enabled because this release has no independently validated BPE compressor."
                : !pathWritable ? $"Replacement through a {type} parent is not enabled in this release." : "Choose a file inside this container rather than replacing the container itself.";
            output.Add(new PacEntry(id, child.Name, childType, depth, child.Offset, childBytes.LongLength, expanded, childType is "OODL" or "ZLIB" or "BPE" ? childType : "None", true, replaceable, reason));
            if (IsContainer(childType) && depth < 8) Walk(childBytes, id, depth + 1, pathWritable, output);
        }
    }

    internal static LocatedEntry Locate(byte[] root, string id)
    {
        var indices = ParseId(id);
        var current = root;
        ChildInfo child = default;
        for (var level = 0; level < indices.Length; level++)
        {
            var type = Detect(current);
            var children = ParseChildren(current, type);
            if (indices[level] < 0 || indices[level] >= children.Count) throw new InvalidDataException("The PAC entry path is outside the archive.");
            child = children[indices[level]];
            current = Slice(current, child.Offset, child.Length);
        }
        return new LocatedEntry(id, child.Name, Detect(current), current);
    }

    internal static byte[] Replace(byte[] root, string id, byte[] replacement)
    {
        var indices = ParseId(id);
        return ReplaceLevel(root, indices, 0, replacement);
    }

    private static byte[] ReplaceLevel(byte[] container, int[] indices, int level, byte[] replacement)
    {
        var type = Detect(container);
        if (type is not ("HSPC" or "SHDC")) throw new InvalidOperationException($"Replacement through {type} is not enabled.");
        var children = ParseChildren(container, type);
        var selectedIndex = indices[level];
        if (selectedIndex < 0 || selectedIndex >= children.Count) throw new InvalidDataException("The PAC entry path is outside the archive.");
        var child = children[selectedIndex];
        var newChild = level == indices.Length - 1
            ? replacement
            : ReplaceLevel(Slice(container, child.Offset, child.Length), indices, level + 1, replacement);
        return type == "HSPC" ? ReplaceHspcChild(container, children, selectedIndex, newChild) : ReplaceShdcChild(container, children, selectedIndex, newChild);
    }

    private static byte[] ReplaceHspcChild(byte[] source, IReadOnlyList<ChildInfo> children, int selectedIndex, byte[] replacement)
    {
        var child = children[selectedIndex];
        var footerOffset = source.Length >= 0x40 ? checked((int)ReadU32(source, 0x3c) + 0x2000) : source.Length;
        var physicalEnd = selectedIndex + 1 < children.Count
            ? children[selectedIndex + 1].Offset
            : footerOffset >= child.Offset + child.Length && footerOffset <= source.Length ? footerOffset : source.Length;
        var oldSpan = physicalEnd - child.Offset;
        var newSpan = Align(replacement.Length, 0x800);
        var delta = newSpan - oldSpan;
        var output = new byte[checked(source.Length + delta)];
        Buffer.BlockCopy(source, 0, output, 0, child.Offset);
        Buffer.BlockCopy(replacement, 0, output, child.Offset, replacement.Length);
        Buffer.BlockCopy(source, physicalEnd, output, child.Offset + newSpan, source.Length - physicalEnd);
        WriteU32(output, child.TableOffset + 4, checked((uint)(Align(replacement.Length, 0x100) / 0x100)));
        for (var i = selectedIndex + 1; i < children.Count; i++)
        {
            var shifted = checked(children[i].Offset + delta);
            WriteU32(output, children[i].TableOffset, checked((uint)(shifted / 0x800)));
        }
        WriteU32(output, 0x3c, checked((uint)Math.Max(0, output.Length - 0x2800)));
        return output;
    }

    private static byte[] ReplaceShdcChild(byte[] source, IReadOnlyList<ChildInfo> children, int selectedIndex, byte[] replacement)
    {
        var child = children[selectedIndex];
        var delta = replacement.Length - child.Length;
        var output = new byte[checked(source.Length + delta)];
        Buffer.BlockCopy(source, 0, output, 0, child.Offset);
        Buffer.BlockCopy(replacement, 0, output, child.Offset, replacement.Length);
        Buffer.BlockCopy(source, child.Offset + child.Length, output, child.Offset + replacement.Length, source.Length - child.Offset - child.Length);
        WriteU64(output, child.TableOffset + 8, checked((ulong)replacement.LongLength));
        for (var i = selectedIndex + 1; i < children.Count; i++) WriteU32(output, children[i].TableOffset + 4, checked((uint)(children[i].Offset + delta)));
        return output;
    }

    private static List<ChildInfo> ParseChildren(byte[] bytes, string type) => type switch
    {
        "HSPC" => ParseHspc(bytes),
        "SHDC" => ParseShdc(bytes),
        "EPAC" => ParseEpac(bytes, false),
        "EPK8" => ParseEpac(bytes, true),
        "PACH" => ParsePach(bytes),
        _ => new List<ChildInfo>()
    };

    private static List<ChildInfo> ParseHspc(byte[] bytes)
    {
        Require(bytes, 0x40, "HSPC header");
        var count = CheckedCount(ReadU32(bytes, 0x38), "HSPC");
        var nameLength = checked((int)ReadU32(bytes, 0x18));
        var table = checked(nameLength - nameLength % 0x800 + 0x1000);
        Require(bytes, table + count * 12, "HSPC entry table");
        var result = new List<ChildInfo>(count);
        for (var i = 0; i < count; i++)
        {
            Require(bytes, 0x800 + i * 0x14 + 8, "HSPC names");
            var name = Convert.ToHexString(bytes.AsSpan(0x800 + i * 0x14, 8));
            var row = table + i * 12;
            var offset = checked((int)ReadU32(bytes, row) * 0x800);
            var length = checked((int)ReadU32(bytes, row + 4) * 0x100);
            ValidateRange(bytes, offset, length, "HSPC entry");
            result.Add(new ChildInfo(name, offset, length, row));
        }
        return result;
    }

    private static List<ChildInfo> ParseShdc(byte[] bytes)
    {
        Require(bytes, 0x40, "SHDC header");
        var headerType = ReadU32(bytes, 0x0c);
        var infoLength = checked((int)ReadU32(bytes, 0x20));
        int table;
        if (headerType == 1) table = checked((int)ReadU32(bytes, 0x1c));
        else if (headerType == 0x10)
        {
            var metadata = checked((int)ReadU32(bytes, 0x18));
            table = Align(metadata, 0x10) + 0x50;
        }
        else if (headerType == 0x800) table = checked((int)ReadU32(bytes, 0x1c) * 0x800);
        else throw new InvalidDataException($"Unsupported SHDC header type 0x{headerType:X}.");
        var count = CheckedCount((uint)(infoLength / 0x10), "SHDC");
        Require(bytes, table + count * 0x10, "SHDC entry table");
        var result = new List<ChildInfo>(count);
        for (var i = 0; i < count; i++)
        {
            var row = table + i * 0x10;
            var nameValue = ReadU32(bytes, row);
            if (nameValue == uint.MaxValue) continue;
            var offset = checked((int)ReadU32(bytes, row + 4));
            var length = checked((int)ReadU64(bytes, row + 8));
            ValidateRange(bytes, offset, length, "SHDC entry");
            result.Add(new ChildInfo(nameValue.ToString("X8"), offset, length, row));
        }
        return result;
    }

    private static List<ChildInfo> ParseEpac(byte[] bytes, bool eightCharacterNames)
    {
        Require(bytes, 0x4000, eightCharacterNames ? "EPK8 header" : "EPAC header");
        var headerLength = checked((int)ReadU32(bytes, 4));
        var cursor = 0;
        var result = new List<ChildInfo>();
        while (cursor < headerLength - 1)
        {
            Require(bytes, 0x800 + cursor + 12, "EPAC directory");
            var units = ReadU16(bytes, 0x800 + cursor + 4);
            var count = units / (eightCharacterNames ? 4 : 3);
            cursor += 12;
            for (var i = 0; i < count; i++)
            {
                var row = 0x800 + cursor;
                var nameLength = eightCharacterNames ? 8 : 4;
                Require(bytes, row + (eightCharacterNames ? 16 : 12), "EPAC entry");
                var name = Encoding.ASCII.GetString(bytes, row, nameLength).TrimEnd('\0', ' ');
                var offsetField = row + nameLength;
                var lengthField = offsetField + 4;
                var offset = checked((int)ReadU32(bytes, offsetField) * 0x800 + 0x4000);
                var length = checked((int)ReadU32(bytes, lengthField) * 0x100);
                ValidateRange(bytes, offset, length, "EPAC entry");
                result.Add(new ChildInfo(string.IsNullOrWhiteSpace(name) ? $"entry-{result.Count}" : name, offset, length, row));
                cursor += eightCharacterNames ? 16 : 12;
            }
        }
        return result;
    }

    private static List<ChildInfo> ParsePach(byte[] bytes)
    {
        Require(bytes, 8, "PACH header");
        var count = CheckedCount(ReadU32(bytes, 4), "PACH");
        Require(bytes, 8 + count * 12, "PACH entry table");
        var dataStart = 8 + count * 12;
        var result = new List<ChildInfo>(count);
        for (var i = 0; i < count; i++)
        {
            var row = 8 + i * 12;
            var name = ReadU32(bytes, row).ToString("X8");
            var offset = checked((int)ReadU32(bytes, row + 4) + dataStart);
            var length = checked((int)ReadU32(bytes, row + 8));
            ValidateRange(bytes, offset, length, "PACH entry");
            result.Add(new ChildInfo(name, offset, length, row));
        }
        return result;
    }

    internal static string Extension(string type, bool decompressed) => type switch
    {
        "JBOY" or "YOBJ" => ".yobj",
        "DDS" => ".dds",
        "TEX!" => ".tex",
        "MDL!" => ".mdl",
        "MTLs" => ".mtls",
        "SHDC" or "HSPC" or "EPAC" or "EPK8" or "PACH" => ".pac",
        "BPE" => ".bpe",
        "ZLIB" when !decompressed => ".zlib",
        "OODL" when !decompressed => ".oodl",
        _ => ".bin"
    };

    private static int[] ParseId(string id)
    {
        try { return id.Split('/', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToArray(); }
        catch { throw new InvalidDataException("The PAC entry identifier is invalid."); }
    }

    private static byte[] Slice(byte[] source, int offset, int length)
    {
        ValidateRange(source, offset, length, "PAC entry");
        return source.AsSpan(offset, length).ToArray();
    }

    private static int CheckedCount(uint value, string label) => value > 100000 ? throw new InvalidDataException($"{label} entry count is unreasonable.") : checked((int)value);
    private static void Require(byte[] bytes, int length, string label) { if (length < 0 || bytes.Length < length) throw new InvalidDataException(label + " extends beyond the file."); }
    private static void ValidateRange(byte[] bytes, int offset, int length, string label) { if (offset < 0 || length < 0 || offset > bytes.Length || length > bytes.Length - offset) throw new InvalidDataException(label + " extends beyond the file."); }
    private static int Align(int value, int alignment) => checked((value + alignment - 1) / alignment * alignment);
    private static ushort ReadU16(byte[] bytes, int offset) { Require(bytes, offset + 2, "16-bit value"); return BitConverter.ToUInt16(bytes, offset); }
    private static uint ReadU32(byte[] bytes, int offset) { Require(bytes, offset + 4, "32-bit value"); return BitConverter.ToUInt32(bytes, offset); }
    private static ulong ReadU64(byte[] bytes, int offset) { Require(bytes, offset + 8, "64-bit value"); return BitConverter.ToUInt64(bytes, offset); }
    private static void WriteU32(byte[] bytes, int offset, uint value) => BitConverter.GetBytes(value).CopyTo(bytes, offset);
    private static void WriteU64(byte[] bytes, int offset, ulong value) => BitConverter.GetBytes(value).CopyTo(bytes, offset);
}

internal static class CompressionCodec
{
    internal static byte[] DecompressZlib(byte[] stored)
    {
        if (stored.Length < 16 || PacFormat.Detect(stored) != "ZLIB") throw new InvalidDataException("The ZLIB entry header is invalid.");
        var compressedLength = checked((int)BitConverter.ToUInt32(stored, 8));
        var expandedLength = checked((int)BitConverter.ToUInt32(stored, 12));
        if (compressedLength < 0 || compressedLength > stored.Length - 16) throw new InvalidDataException("The ZLIB compressed size is invalid.");
        using var input = new MemoryStream(stored, 16, compressedLength, false);
        using var zlib = new ZLibStream(input, CompressionMode.Decompress);
        using var output = new MemoryStream(expandedLength);
        zlib.CopyTo(output);
        var recovered = output.ToArray();
        if (recovered.Length != expandedLength) throw new InvalidDataException("The ZLIB expanded size does not match its header.");
        return recovered;
    }

    internal static byte[] CompressZlib(byte[] raw)
    {
        using var compressed = new MemoryStream();
        using (var zlib = new ZLibStream(compressed, CompressionLevel.SmallestSize, true)) zlib.Write(raw);
        var payload = compressed.ToArray();
        var output = new byte[16 + payload.Length];
        Encoding.ASCII.GetBytes("ZLIB").CopyTo(output, 0);
        output[4] = 0x30; output[5] = 0x12;
        BitConverter.GetBytes((uint)payload.Length).CopyTo(output, 8);
        BitConverter.GetBytes((uint)raw.Length).CopyTo(output, 12);
        payload.CopyTo(output, 16);
        return output;
    }
}

internal sealed class OodleCodec : IDisposable
{
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate long DecompressDelegate(IntPtr input, long inputSize, IntPtr output, long outputSize, int fuzzSafe, int checkCrc, int verbosity, IntPtr decodeBuffer, long decodeBufferSize, IntPtr callback, IntPtr callbackUserData, IntPtr decoderMemory, long decoderMemorySize, int threadPhase);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate long CompressDelegate(int compressor, IntPtr input, long inputSize, IntPtr output, int level, IntPtr options, IntPtr dictionaryBase, IntPtr lrm, IntPtr scratch, long scratchSize);

    private readonly IntPtr _library;
    private readonly DecompressDelegate _decompress;
    private readonly CompressDelegate _compress;

    internal OodleCodec(string path)
    {
        _library = NativeLibrary.Load(path);
        _decompress = Marshal.GetDelegateForFunctionPointer<DecompressDelegate>(NativeLibrary.GetExport(_library, "OodleLZ_Decompress"));
        _compress = Marshal.GetDelegateForFunctionPointer<CompressDelegate>(NativeLibrary.GetExport(_library, "OodleLZ_Compress"));
    }

    internal byte[] Decompress(byte[] stored)
    {
        if (stored.Length < 24 || PacFormat.Detect(stored) != "OODL") throw new InvalidDataException("The OODL entry header is invalid.");
        var rawLength = checked((int)BitConverter.ToUInt32(stored, 0x10));
        var compressedLength = checked((int)BitConverter.ToUInt32(stored, 0x14));
        if (compressedLength < 0 || compressedLength > stored.Length - 24) throw new InvalidDataException("The OODL compressed size is invalid.");
        var input = stored.AsSpan(24, compressedLength).ToArray();
        var output = new byte[rawLength];
        WithPinned(input, output, (source, target) =>
        {
            var count = _decompress(source, input.Length, target, output.Length, 1, 0, 0, IntPtr.Zero, 0, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, 0, 3);
            if (count != output.Length) throw new InvalidDataException($"Oodle returned {count} bytes; {output.Length} were expected.");
        });
        return output;
    }

    internal byte[] Compress(byte[] raw)
    {
        var capacity = checked(raw.Length + raw.Length / 16 + 65536);
        var buffer = new byte[capacity];
        long compressedLength = 0;
        WithPinned(raw, buffer, (source, target) => compressedLength = _compress(8, source, raw.Length, target, 6, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, 0));
        if (compressedLength <= 0 || compressedLength > buffer.Length) throw new InvalidDataException("Oodle could not compress the replacement file.");
        var output = new byte[checked(24 + (int)compressedLength)];
        Encoding.ASCII.GetBytes("OODL").CopyTo(output, 0);
        new byte[] { 0x30, 0x00, 0x06, 0x2e, 0x4b, 0x52, 0x4b, 0x4e }.CopyTo(output, 8);
        BitConverter.GetBytes((uint)raw.Length).CopyTo(output, 0x10);
        BitConverter.GetBytes((uint)compressedLength).CopyTo(output, 0x14);
        Buffer.BlockCopy(buffer, 0, output, 24, (int)compressedLength);
        return output;
    }

    private static void WithPinned(byte[] source, byte[] target, Action<IntPtr, IntPtr> action)
    {
        var sourceHandle = GCHandle.Alloc(source, GCHandleType.Pinned);
        var targetHandle = GCHandle.Alloc(target, GCHandleType.Pinned);
        try { action(sourceHandle.AddrOfPinnedObject(), targetHandle.AddrOfPinnedObject()); }
        finally { targetHandle.Free(); sourceHandle.Free(); }
    }

    public void Dispose() { if (_library != IntPtr.Zero) NativeLibrary.Free(_library); }
}

internal static class PacFixtures
{
    internal static byte[] BuildShdc(byte[] child)
    {
        var table = 0x60;
        var data = 0x80;
        var output = new byte[data + child.Length];
        Encoding.ASCII.GetBytes("SHDC").CopyTo(output, 0);
        BitConverter.GetBytes(1u).CopyTo(output, 0x0c);
        BitConverter.GetBytes((uint)table).CopyTo(output, 0x1c);
        BitConverter.GetBytes(0x10u).CopyTo(output, 0x20);
        BitConverter.GetBytes(1u).CopyTo(output, 0x38);
        BitConverter.GetBytes(1u).CopyTo(output, table);
        BitConverter.GetBytes((uint)data).CopyTo(output, table + 4);
        BitConverter.GetBytes((ulong)child.Length).CopyTo(output, table + 8);
        child.CopyTo(output, data);
        return output;
    }

    internal static byte[] BuildHspc(byte[] child)
    {
        var table = 0x1000;
        var data = 0x1800;
        var size = ((data + child.Length + 0x7ff) / 0x800) * 0x800;
        var output = new byte[size];
        Encoding.ASCII.GetBytes("HSPC").CopyTo(output, 0);
        BitConverter.GetBytes(0x40u).CopyTo(output, 8);
        BitConverter.GetBytes(0x800u).CopyTo(output, 0x0c);
        BitConverter.GetBytes(0u).CopyTo(output, 0x18);
        BitConverter.GetBytes(1u).CopyTo(output, 0x38);
        BitConverter.GetBytes((uint)Math.Max(0, size - 0x2800)).CopyTo(output, 0x3c);
        Encoding.ASCII.GetBytes("TEST0001").CopyTo(output, 0x800);
        BitConverter.GetBytes((uint)(data / 0x800)).CopyTo(output, table);
        BitConverter.GetBytes((uint)((child.Length + 0xff) / 0x100)).CopyTo(output, table + 4);
        child.CopyTo(output, data);
        return output;
    }
}

internal readonly record struct ChildInfo(string Name, int Offset, int Length, int TableOffset);
internal sealed record LocatedEntry(string Id, string Name, string Type, byte[] Bytes);
internal sealed record PacRequest(string? Action, string? ArchivePath, string? OodlePath, string? OutputRoot, List<string>? EntryIds, bool Overwrite, string? EntryId, string? ReplacementPath, string? OutputPath);
internal sealed record PacEntry(string Id, string Name, string Type, int Depth, long Offset, long StoredSize, long ExpandedSize, string Compression, bool Extractable, bool Replaceable, string ReplaceReason);
internal sealed record InspectResponse(string ArchiveName, string ArchivePath, string ContainerType, long ArchiveSize, List<PacEntry> Entries, int ReplaceableCount);
internal sealed record ExtractedEntry(string Id, string File, long Bytes, string Sha256, string Note);
internal sealed record ExtractionManifest(string SourceArchive, DateTimeOffset CreatedUtc, List<ExtractedEntry> Entries);
internal sealed record ExtractResponse(int Extracted, string ManifestPath, List<ExtractedEntry> Results);
internal sealed record ReplaceResponse(string OutputPath, long Bytes, string EntryId, long StoredSize, string Sha256, string Note);
internal sealed record SelfTestResponse(bool Ok, int Entries, string Message);

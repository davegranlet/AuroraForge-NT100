using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace AuroraForge.CakHelper;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private static int Main(string[] args)
    {
        try
        {
            if (args.Length != 1) throw new InvalidOperationException("Pass exactly one Aurora Forge request JSON file.");
            using var document = JsonDocument.Parse(File.ReadAllText(args[0]));
            if (document.RootElement.TryGetProperty("action", out var action) && string.Equals(action.GetString(), "compress", StringComparison.OrdinalIgnoreCase))
            {
                var compressionRequest = document.RootElement.Deserialize<CompressionRequest>(JsonOptions)
                    ?? throw new InvalidOperationException("The compression request is empty.");
                var compressionResult = Compress(compressionRequest);
                Console.WriteLine(JsonSerializer.Serialize(compressionResult));
                return compressionResult.Ok ? 0 : 2;
            }
            var request = JsonSerializer.Deserialize<ExtractionRequest>(File.ReadAllText(args[0]), JsonOptions)
                ?? throw new InvalidOperationException("The extraction request is empty.");
            var results = Extract(request);
            Console.WriteLine(JsonSerializer.Serialize(new ExtractionResponse(results)));
            return results.All(result => result.Ok) ? 0 : 2;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine(error.Message);
            return 1;
        }
    }

    private static CompressionResponse Compress(CompressionRequest request)
    {
        var inputPath = Path.GetFullPath(Required(request.InputPath, "Compression input path"));
        var outputPath = Path.GetFullPath(Required(request.OutputPath, "Compression output path"));
        var oodlePath = Path.GetFullPath(Required(request.OodlePath, "Game compressor path"));
        if (!File.Exists(inputPath)) throw new FileNotFoundException("The compression input was not found.", inputPath);
        var original = File.ReadAllBytes(inputPath);
        using var codec = new GameCodec(oodlePath);
        var compressor = request.Compressor ?? 8;
        var level = request.Level ?? 6;
        if (compressor is < 0 or > 13) throw new InvalidDataException("Oodle compressor must be between 0 and 13.");
        if (level is < -4 or > 9) throw new InvalidDataException("Oodle compression level must be between -4 and 9.");
        var compressed = codec.Compress(original, compressor, level);
        var recovered = codec.Decompress(compressed, original.Length);
        if (!recovered.AsSpan().SequenceEqual(original)) throw new InvalidDataException("Oodle compression did not survive an immediate byte-for-byte round trip.");
        Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);
        File.WriteAllBytes(outputPath, compressed);
        return new CompressionResponse(true, outputPath, original.Length, compressed.Length, true);
    }

    private static List<ExtractionResult> Extract(ExtractionRequest request)
    {
        var archivePath = Path.GetFullPath(Required(request.ArchivePath, "Archive path"));
        var outputRoot = Path.GetFullPath(Required(request.OutputRoot, "Output folder"));
        if (!File.Exists(archivePath)) throw new FileNotFoundException("The selected CAK archive was not found.", archivePath);
        if (!Directory.Exists(outputRoot)) throw new DirectoryNotFoundException("The selected output folder was not found.");
        if (request.Entries is null || request.Entries.Count == 0) throw new InvalidOperationException("The extraction request contains no files.");

        using var archive = new FileStream(archivePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        using var decompressor = request.Entries.Any(entry => entry.Compressed)
            ? new GameDecompressor(Path.GetFullPath(Required(request.OodlePath, "Game decompressor path")))
            : null;
        var results = new List<ExtractionResult>(request.Entries.Count);
        foreach (var entry in request.Entries)
        {
            try
            {
                var target = SafeTarget(outputRoot, entry.RelativePath);
                if (!request.Overwrite && File.Exists(target)) throw new IOException("The output file already exists.");
                ValidateEntry(entry, archive.Length);
                var stored = ReadAt(archive, entry.Offset, entry.StoredSize);
                if (entry.Protected) RecoverPayload(stored, DerivePayloadKey(request.ArchiveKey, checked((uint)entry.StoredSize), checked((ulong)entry.Offset)));
                var recovered = entry.Compressed ? decompressor!.Decompress(stored, checked((int)entry.ExpandedSize)) : stored;
                if (recovered.LongLength != entry.ExpandedSize) throw new InvalidDataException("The recovered file size did not match the archive catalog.");

                Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                var temporary = target + ".aurora-part";
                try
                {
                    File.WriteAllBytes(temporary, recovered);
                    File.Move(temporary, target, request.Overwrite);
                }
                finally { if (File.Exists(temporary)) File.Delete(temporary); }
                results.Add(new ExtractionResult(true, entry.Id, target, recovered.LongLength, ""));
            }
            catch (Exception error)
            {
                results.Add(new ExtractionResult(false, entry.Id, "", 0, error.Message));
            }
        }
        return results;
    }

    private static void ValidateEntry(ExtractionEntry entry, long archiveLength)
    {
        if (entry.Offset < 0 || entry.StoredSize < 0 || entry.ExpandedSize < 0) throw new InvalidDataException("An archive entry contains a negative size or offset.");
        if (entry.StoredSize > int.MaxValue || entry.ExpandedSize > int.MaxValue) throw new InvalidDataException("This individual file is too large for the extraction helper.");
        if (entry.Offset > archiveLength || entry.StoredSize > archiveLength - entry.Offset) throw new InvalidDataException("An archive entry extends beyond the selected CAK.");
        if (!entry.Compressed && entry.StoredSize != entry.ExpandedSize) throw new InvalidDataException("An uncompressed file has inconsistent sizes.");
    }

    private static byte[] ReadAt(FileStream stream, long offset, long size)
    {
        var output = new byte[checked((int)size)];
        stream.Position = offset;
        var read = 0;
        while (read < output.Length)
        {
            var count = stream.Read(output, read, output.Length - read);
            if (count == 0) throw new EndOfStreamException("The archive ended before the selected file was read.");
            read += count;
        }
        return output;
    }

    private static string SafeTarget(string outputRoot, string? relativePath)
    {
        var value = Required(relativePath, "Relative output path").Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
        if (Path.IsPathRooted(value)) throw new InvalidDataException("An output path cannot be absolute.");
        var target = Path.GetFullPath(Path.Combine(outputRoot, value));
        var prefix = outputRoot.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        if (!target.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("An output path escapes the selected folder.");
        return target;
    }

    private static string Required(string? value, string label) =>
        string.IsNullOrWhiteSpace(value) ? throw new InvalidOperationException(label + " is required.") : value;

    private static uint Crc32cWord(uint seed, uint value)
    {
        var crc = seed;
        for (var byteIndex = 0; byteIndex < 4; byteIndex++)
        {
            crc ^= (byte)(value >> (byteIndex * 8));
            for (var bit = 0; bit < 8; bit++)
            {
                crc = (crc >> 1) ^ ((crc & 1) != 0 ? 0x82f63b78u : 0u);
            }
        }
        return crc;
    }

    private static ulong FnvByte(ulong hash, byte value) => unchecked((hash ^ (ulong)(long)(sbyte)value) * 0x100000001b3UL);
    private static byte Byte32(uint value, int index) => (byte)(value >> (index * 8));
    private static byte Byte64(ulong value, int index) => (byte)(value >> (index * 8));

    private static uint DerivePayloadKey(uint archiveKey, uint storedSize, ulong offset)
    {
        var mixedOffset = ~(~(ulong)archiveKey ^ offset);
        var hash = 0xcbf29ce484222325UL;
        for (var index = 0; index < 4; index++) hash = FnvByte(hash, Byte32(archiveKey, index));
        var invertedSize = ~storedSize;
        for (var index = 0; index < 4; index++) hash = FnvByte(hash, Byte32(invertedSize, index));
        for (var index = 0; index < 4; index++) hash = FnvByte(hash, Byte64(mixedOffset, index));
        var second = unchecked((ulong)((long)mixedOffset >> 32)) ^ hash;
        for (var index = 0; index < 4; index++) second = FnvByte(second, 0);
        var signedSize = unchecked((ulong)(long)(int)invertedSize);
        for (var index = 0; index < 4; index++) second = FnvByte(second, Byte64(signedSize, index));
        var signedKey = unchecked((ulong)(long)(int)archiveKey);
        for (var index = 0; index < 4; index++) second = FnvByte(second, Byte64(signedKey, index));
        var firstCrc = unchecked((ulong)(long)(int)Crc32cWord(invertedSize, archiveKey));
        for (var index = 0; index < 4; index++) second = FnvByte(second, Byte64(firstCrc, index));
        var secondCrc = unchecked((ulong)(long)(int)Crc32cWord((uint)mixedOffset, (uint)((long)mixedOffset >> 32)));
        for (var index = 0; index < 4; index++) second = FnvByte(second, Byte64(secondCrc, index));
        var bytes = BitConverter.GetBytes(second);
        var folded = (bytes[1] + (bytes[0] << 4)) << 4;
        folded = (folded + bytes[2]) << 4;
        folded = (folded + bytes[3]) << 4;
        folded = (folded + bytes[4]) << 4;
        folded += bytes[5];
        var high = ((uint)folded >> 24) & 0xf0u;
        var next = (((uint)folded ^ high) << 4) + bytes[6];
        high = (next >> 24) & 0xf0u;
        var final = ((next ^ high) << 4) + bytes[7];
        var finalHigh = (final >> 24) & 0xf0u;
        var low = (~(finalHigh << 24) & (final ^ finalHigh)) ^ (uint)second;
        return unchecked((uint)~(second >> 32)) ^ low;
    }

    private static byte RotateLeft8(byte value, int count) { count &= 7; return (byte)((value << count) | (value >> ((8 - count) & 7))); }
    private static byte RotateRight8(byte value, int count) { count &= 7; return (byte)((value >> count) | (value << ((8 - count) & 7))); }

    private static void RecoverPayload(byte[] data, uint key)
    {
        var inverted = ~key;
        for (var index = 0; index < Math.Min(256, data.Length); index++)
        {
            var rotated = RotateRight8(data[index], ~(index + 1));
            var mask = (byte)(Byte32(inverted, (index - 1) & 3) + 1 + index);
            data[index] = RotateLeft8((byte)(mask ^ rotated), (index - 1) & 7);
        }
    }
}

internal class GameDecompressor : IDisposable
{
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate long DecompressDelegate(IntPtr input, long inputSize, IntPtr output, long outputSize, int fuzzSafe, int checkCrc, int verbosity, IntPtr decodeBuffer, long decodeBufferSize, IntPtr callback, IntPtr callbackUserData, IntPtr decoderMemory, long decoderMemorySize, int threadPhase);

    protected readonly IntPtr Library;
    private readonly DecompressDelegate _decompress;

    internal GameDecompressor(string path)
    {
        if (!File.Exists(path)) throw new FileNotFoundException("The game decompressor was not found.", path);
        Library = NativeLibrary.Load(path);
        _decompress = Marshal.GetDelegateForFunctionPointer<DecompressDelegate>(NativeLibrary.GetExport(Library, "OodleLZ_Decompress"));
    }

    internal byte[] Decompress(ReadOnlySpan<byte> input, int outputSize)
    {
        var source = input.ToArray();
        var output = new byte[outputSize];
        var sourceHandle = GCHandle.Alloc(source, GCHandleType.Pinned);
        var outputHandle = GCHandle.Alloc(output, GCHandleType.Pinned);
        try
        {
            var recovered = _decompress(sourceHandle.AddrOfPinnedObject(), source.Length, outputHandle.AddrOfPinnedObject(), output.Length, 1, 0, 0, IntPtr.Zero, 0, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, 0, 3);
            if (recovered != output.Length) throw new InvalidDataException($"The game decompressor returned {recovered} bytes; {output.Length} were expected.");
            return output;
        }
        finally { outputHandle.Free(); sourceHandle.Free(); }
    }

    public void Dispose() { if (Library != IntPtr.Zero) NativeLibrary.Free(Library); }
}

internal sealed class GameCodec : GameDecompressor
{
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate long CompressDelegate(int compressor, IntPtr input, long inputSize, IntPtr output, int level, IntPtr options, IntPtr dictionaryBase, IntPtr lrm, IntPtr scratchMemory, long scratchSize);
    private readonly CompressDelegate _compress;

    internal GameCodec(string path) : base(path)
    {
        _compress = Marshal.GetDelegateForFunctionPointer<CompressDelegate>(NativeLibrary.GetExport(Library, "OodleLZ_Compress"));
    }

    internal byte[] Compress(ReadOnlySpan<byte> input, int compressor = 8, int level = 6)
    {
        var source = input.ToArray();
        var output = new byte[checked(source.Length + source.Length / 16 + 256)];
        var sourceHandle = GCHandle.Alloc(source, GCHandleType.Pinned);
        var outputHandle = GCHandle.Alloc(output, GCHandleType.Pinned);
        try
        {
            var compressedSize = _compress(compressor, sourceHandle.AddrOfPinnedObject(), source.Length, outputHandle.AddrOfPinnedObject(), level, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, 0);
            if (compressedSize <= 0 || compressedSize > output.Length) throw new InvalidDataException($"The game compressor returned invalid size {compressedSize}.");
            return output.AsSpan(0, checked((int)compressedSize)).ToArray();
        }
        finally { outputHandle.Free(); sourceHandle.Free(); }
    }
}

internal sealed record ExtractionRequest(string? ArchivePath, string? OodlePath, string? OutputRoot, uint ArchiveKey, bool Overwrite, List<ExtractionEntry>? Entries);
internal sealed record ExtractionEntry(int Id, long Offset, long StoredSize, long ExpandedSize, bool Compressed, bool Protected, string? RelativePath);
internal sealed record ExtractionResult(bool Ok, int Id, string Path, long Bytes, string Error);
internal sealed record ExtractionResponse([property: JsonPropertyName("results")] List<ExtractionResult> Results);
internal sealed record CompressionRequest(string? Action, string? InputPath, string? OutputPath, string? OodlePath, int? Compressor, int? Level);
internal sealed record CompressionResponse(bool Ok, string Path, long OriginalBytes, long StoredBytes, bool RoundTripVerified);

// Read-only Aurora Ghidra helper. Locate instructions inside analyzed functions
// that contain one of the supplied immediate/displacement values. Useful for
// tracing repeated object-field offsets without scanning unrelated data bytes.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.mem.MemoryBlock;
import ghidra.program.model.address.Address;
import java.util.HashSet;
import java.util.Set;

public class FindImmediateInFunctions extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length == 0) throw new IllegalArgumentException("Usage: <hex-value> [hex-value ...]");
        Set<Long> wanted = new HashSet<>();
        for (String arg : args) wanted.add(Long.parseUnsignedLong(arg.replaceFirst("^(0x|0X)", ""), 16));
        long bytesScanned = 0;
        long hits = 0;
        byte[] buffer = new byte[1024 * 1024];
        for (MemoryBlock block : currentProgram.getMemory().getBlocks()) {
            if (!block.isExecute() || !block.isInitialized()) continue;
            long offset = 0;
            while (offset < block.getSize() && !monitor.isCancelled()) {
                int count = (int)Math.min(buffer.length, block.getSize() - offset);
                Address start = block.getStart().add(offset);
                currentProgram.getMemory().getBytes(start, buffer, 0, count);
                for (int i = 0; i + 3 < count; i++) {
                    long value = ((long)buffer[i] & 0xff) | (((long)buffer[i + 1] & 0xff) << 8) |
                        (((long)buffer[i + 2] & 0xff) << 16) | (((long)buffer[i + 3] & 0xff) << 24);
                    if (wanted.contains(value)) {
                        hits++;
                        println(String.format("value=0x%X address=%s block=%s", value,
                            start.add(i), block.getName()));
                    }
                }
                bytesScanned += count;
                long nextOffset = offset + count;
                if (nextOffset < block.getSize()) nextOffset -= 3;
                if (nextOffset <= offset) nextOffset = offset + count;
                offset = nextOffset;
            }
        }
        println("executableBytesScanned=" + bytesScanned + " rawByteMatches=" + hits);
    }
}

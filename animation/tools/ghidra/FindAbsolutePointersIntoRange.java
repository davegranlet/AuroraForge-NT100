// Aurora read-only Ghidra helper. Finds little-endian absolute pointers in
// initialized memory blocks whose values fall within a target address range.
// It complements reference analysis for linker/table-driven registries and
// scans naturally aligned qword slots, including initialized executable blocks.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.mem.MemoryBlock;
import ghidra.program.model.address.Address;

public class FindAbsolutePointersIntoRange extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 2) throw new IllegalArgumentException("Usage: <target-start-hex> <target-end-exclusive-hex>");
        Address targetStart = toAddr(args[0]);
        Address targetEnd = toAddr(args[1]);
        if (targetEnd.compareTo(targetStart) <= 0) throw new IllegalArgumentException("Invalid target range");
        MemoryBlock[] blocks = currentProgram.getMemory().getBlocks();
        byte[] buffer = new byte[1024 * 1024 + 7];
        long bytesScanned = 0, slotsScanned = 0, hits = 0;
        for (MemoryBlock block : blocks) {
            if (!block.isInitialized()) continue;
            long blockSize = block.getSize();
            long baseOffset = 0;
            while (baseOffset < blockSize && !monitor.isCancelled()) {
                int length = (int)Math.min(buffer.length, blockSize - baseOffset);
                if (length < 8) break;
                Address at = block.getStart().add(baseOffset);
                currentProgram.getMemory().getBytes(at, buffer, 0, length);
                int scanLength = length - 7;
                int alignment = (int)((8 - ((baseOffset + block.getStart().getOffset()) & 7)) & 7);
                for (int i = alignment; i < scanLength; i += 8) {
                    long value = 0;
                    for (int j = 7; j >= 0; j--) value = (value << 8) | (buffer[i + j] & 0xffL);
                    slotsScanned++;
                    if (value < 0 || value > 0x7fffffffffffffffL) continue;
                    Address pointer;
                    try { pointer = toAddr(value); } catch (Exception ignored) { continue; }
                    if (pointer.compareTo(targetStart) >= 0 && pointer.compareTo(targetEnd) < 0) {
                        hits++;
                        println(String.format("slot=%s value=%s block=%s", at.add(i), pointer, block.getName()));
                    }
                }
                bytesScanned += scanLength;
                baseOffset += scanLength;
            }
        }
        println(String.format("initializedBytesScanned=%d alignedQwordSlots=%d absolutePointerHits=%d",
            bytesScanned, slotsScanned, hits));
    }
}

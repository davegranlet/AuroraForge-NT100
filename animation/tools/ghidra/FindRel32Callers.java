// Read-only Aurora Ghidra helper. Scans executable bytes for x64 E8 rel32 calls to exact targets.
// Results are candidate direct-call sites; validate containing functions before assigning semantics.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.mem.MemoryBlock;
import ghidra.program.model.address.Address;
import java.util.ArrayList;
import java.util.List;

public class FindRel32Callers extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length == 0) throw new IllegalArgumentException("Usage: <target-hex> [target-hex ...]");
        List<Address> targets = new ArrayList<>();
        for (String arg : args) targets.add(toAddr(arg));
        long scanned = 0, hits = 0;
        byte[] buffer = new byte[1024 * 1024];
        for (MemoryBlock block : currentProgram.getMemory().getBlocks()) {
            if (!block.isExecute() || !block.isInitialized()) continue;
            long offset = 0;
            while (offset < block.getSize() && !monitor.isCancelled()) {
                int count = (int)Math.min(buffer.length, block.getSize() - offset);
                Address start = block.getStart().add(offset);
                currentProgram.getMemory().getBytes(start, buffer, 0, count);
                for (int i = 0; i + 4 < count; i++) {
                    if ((buffer[i] & 0xff) != 0xe8) continue;
                    int rel = (buffer[i+1] & 0xff) | ((buffer[i+2] & 0xff) << 8) |
                        ((buffer[i+3] & 0xff) << 16) | ((buffer[i+4] & 0xff) << 24);
                    Address end = start.add(i + 5L);
                    Address candidate;
                    try { candidate = end.add((long)rel); } catch (Exception ex) { continue; }
                    for (Address target : targets) if (candidate.equals(target)) {
                        hits++;
                        println(String.format("callsite=%s target=%s block=%s", start.add(i), target, block.getName()));
                    }
                }
                scanned += count;
                long next = offset + count;
                if (next < block.getSize()) next -= 4;
                if (next <= offset) next = offset + count;
                offset = next;
            }
        }
        println("executableBytesScanned=" + scanned + " candidateRel32Calls=" + hits);
    }
}
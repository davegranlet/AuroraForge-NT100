// Finds UTF-16 NativeAOT frozen strings and callers that reference their object starts.
// @category AuroraForge

import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import ghidra.program.model.mem.Memory;
import ghidra.program.model.symbol.Reference;
import java.nio.charset.StandardCharsets;

public class FindRuntimeStringCallers extends GhidraScript {
    private static final String[] TEXTS = {
        "Encrypting header based on file name",
        "Key:",
        "GenerateCryptoKeyV9_9",
        "G7MGM-k_BB-iw4Y%ftP%2Rg2;-Rrp[RK",
        "a_42W0*X{W1+@N%x"
    };

    private void printRefs(Address target, String label) {
        for (Reference ref : getReferencesTo(target)) {
            Function f = getFunctionContaining(ref.getFromAddress());
            println("  " + label + " ref " + ref.getFromAddress() + " function " +
                (f == null ? "<none>" : f.getName() + " @ " + f.getEntryPoint()));
        }
    }

    @Override
    public void run() throws Exception {
        Memory memory = currentProgram.getMemory();
        Address min = memory.getMinAddress();
        Address max = memory.getMaxAddress();
        for (String text : TEXTS) {
            byte[] needle = text.getBytes(StandardCharsets.UTF_16LE);
            Address cursor = min;
            println("=== " + text + " ===");
            while (cursor != null && cursor.compareTo(max) <= 0) {
                Address hit = memory.findBytes(cursor, max, needle, null, true, monitor);
                if (hit == null) break;
                println("utf16 " + hit);
                printRefs(hit, "chars");
                for (int delta = 8; delta <= 24; delta += 4) {
                    Address candidate = hit.subtract(delta);
                    printRefs(candidate, "object-" + delta);
                }
                cursor = hit.add(needle.length);
            }
        }
    }
}

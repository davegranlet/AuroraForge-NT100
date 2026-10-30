// Finds NativeAOT method-name strings and prints code references/functions that use them.
// @category AuroraForge

import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import ghidra.program.model.mem.Memory;
import ghidra.program.model.symbol.Reference;
import java.nio.charset.StandardCharsets;

public class FindBakeryCryptoMethods extends GhidraScript {
    private static final String[] NAMES = {
        "GenerateCryptoKeyV9_9",
        "CreateInitialKeyTableFromNameSeed",
        "ScrambleGenSeed",
        "MetroHashUnkCustomV9_1",
        "GetFileManglingKey",
        "GenerateCryptoXorKey"
    };

    @Override
    public void run() throws Exception {
        Memory memory = currentProgram.getMemory();
        Address min = memory.getMinAddress();
        Address max = memory.getMaxAddress();
        for (String name : NAMES) {
            byte[] needle = name.getBytes(StandardCharsets.US_ASCII);
            Address cursor = min;
            println("=== " + name + " ===");
            while (cursor != null && cursor.compareTo(max) <= 0) {
                Address hit = memory.findBytes(cursor, max, needle, null, true, monitor);
                if (hit == null) break;
                println("string " + hit);
                for (Reference ref : getReferencesTo(hit)) {
                    Function function = getFunctionContaining(ref.getFromAddress());
                    println("  ref " + ref.getFromAddress() + " function " +
                        (function == null ? "<none>" : function.getName() + " @ " + function.getEntryPoint()));
                }
                cursor = hit.add(needle.length);
            }
        }
    }
}

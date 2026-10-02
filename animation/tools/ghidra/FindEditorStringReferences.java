// Read-only Ghidra headless script for narrowing native editor code paths.
// It reports functions that reference selected embedded ASCII UI/implementation
// strings. It never modifies the imported executable or source asset files.

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import ghidra.program.model.mem.MemoryBlock;
import ghidra.program.model.symbol.Reference;
import ghidra.program.model.symbol.ReferenceIterator;

public class FindEditorStringReferences extends GhidraScript {
    private static List<Integer> matches(byte[] haystack, byte[] needle) {
        List<Integer> result = new ArrayList<>();
        if (needle.length == 0 || haystack.length < needle.length) return result;
        for (int offset = 0; offset <= haystack.length - needle.length; offset++) {
            int index = 0;
            while (index < needle.length && haystack[offset + index] == needle[index]) index++;
            if (index == needle.length) result.add(offset);
        }
        return result;
    }

    @Override
    protected void run() throws Exception {
        String[] needles = getScriptArgs();
        if (needles.length == 0) {
            needles = new String[] { "Open Clip Player", "AnimatedMeshWidget", "requestLoadAnimationIntoModel" };
        }
        for (String needleText : needles) {
            byte[] needle = needleText.getBytes(StandardCharsets.US_ASCII);
            Set<String> reports = new LinkedHashSet<>();
            for (MemoryBlock block : currentProgram.getMemory().getBlocks()) {
                if (!block.isInitialized() || !block.isRead() || block.getSize() > Integer.MAX_VALUE) continue;
                byte[] bytes = new byte[(int) block.getSize()];
                block.getBytes(block.getStart(), bytes);
                for (int offset : matches(bytes, needle)) {
                    Address address = block.getStart().add(offset);
                    ReferenceIterator refs = currentProgram.getReferenceManager().getReferencesTo(address);
                    boolean foundReference = false;
                    while (refs.hasNext()) {
                        foundReference = true;
                        Reference ref = refs.next();
                        Function function = currentProgram.getFunctionManager().getFunctionContaining(ref.getFromAddress());
                        reports.add(String.format("string=%s at=%s ref=%s function=%s", needleText, address, ref.getFromAddress(), function == null ? "<no containing function>" : function.getName(true)));
                    }
                    if (!foundReference) reports.add(String.format("string=%s at=%s refs=0", needleText, address));
                }
            }
            if (reports.isEmpty()) println("string=" + needleText + " not found");
            for (String report : reports) println(report);
        }
    }
}

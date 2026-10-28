// Read-only Ghidra headless script. Lists code/data references to every address
// in a supplied inclusive-exclusive virtual-address range.

import java.util.LinkedHashSet;
import java.util.Set;

import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import ghidra.program.model.symbol.Reference;
import ghidra.program.model.symbol.ReferenceIterator;

public class ReferencesToRange extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 2) throw new IllegalArgumentException("Usage: <start-address> <end-exclusive-address>");
        Address start = currentProgram.getAddressFactory().getDefaultAddressSpace().getAddress(args[0]);
        Address end = currentProgram.getAddressFactory().getDefaultAddressSpace().getAddress(args[1]);
        Set<String> lines = new LinkedHashSet<>();
        for (Address address = start; address.compareTo(end) < 0; address = address.add(1)) {
            ReferenceIterator iterator = currentProgram.getReferenceManager().getReferencesTo(address);
            while (iterator.hasNext()) {
                Reference reference = iterator.next();
                Function function = currentProgram.getFunctionManager().getFunctionContaining(reference.getFromAddress());
                lines.add(String.format("to=%s from=%s type=%s function=%s", address, reference.getFromAddress(), reference.getReferenceType(), function == null ? "<data>" : function.getName(true)));
            }
        }
        if (lines.isEmpty()) println("refs=0");
        for (String line : lines) println(line);
    }
}

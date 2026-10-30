// Read-only Ghidra headless script. Lists functions whose entry point lies in [start, end) (hex addresses
// supplied as script arguments), with size and call-reference counts. Used to find real entry points.

import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionIterator;

public class ListFunctionsInRange extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 2) throw new IllegalArgumentException("Usage: <start-hex> <end-hex-exclusive>");
        Address start = currentProgram.getAddressFactory().getDefaultAddressSpace().getAddress(args[0]);
        Address end = currentProgram.getAddressFactory().getDefaultAddressSpace().getAddress(args[1]);
        int count = 0;
        FunctionIterator it = currentProgram.getFunctionManager().getFunctions(start, true);
        while (it.hasNext()) {
            Function f = it.next();
            Address entry = f.getEntryPoint();
            if (entry.compareTo(end) >= 0) break;
            long size = f.getBody().getNumAddresses();
            int callers = f.getCallingFunctions(monitor).size();
            println(String.format("FUNC %s entry=%s size=%d callers=%d", f.getName(), entry, size, callers));
            count++;
        }
        println("FUNCTIONS=" + count);
    }
}

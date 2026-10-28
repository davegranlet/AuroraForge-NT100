// Read-only Ghidra headless script. Decompiles exact function addresses supplied
// as arguments and writes their C-like output to the script log.

import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;

public class DecompileFunctions extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] addresses = getScriptArgs();
        if (addresses.length == 0) throw new IllegalArgumentException("Supply one or more function addresses");
        DecompInterface decompiler = new DecompInterface();
        decompiler.openProgram(currentProgram);
        try {
            for (String text : addresses) {
                Address address = currentProgram.getAddressFactory().getDefaultAddressSpace().getAddress(text);
                Function function = currentProgram.getFunctionManager().getFunctionAt(address);
                if (function == null) {
                    println("address=" + text + " function=<none>");
                    continue;
                }
                DecompileResults result = decompiler.decompileFunction(function, 60, monitor);
                println("===== function=" + function.getName(true) + " address=" + function.getEntryPoint() + " completed=" + result.decompileCompleted() + " =====");
                println(result.getDecompiledFunction() == null ? "<no decompilation>" : result.getDecompiledFunction().getC());
            }
        } finally {
            decompiler.dispose();
        }
    }
}

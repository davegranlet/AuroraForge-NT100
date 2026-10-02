// Bounded research helper: create missing function analysis only at explicitly
// supplied entry points. Run with -readOnly to discard project annotations.
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;

public class DecompileEntrypoints extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length < 1 || args.length > 16) throw new IllegalArgumentException("Supply 1..16 exact entry points");
        DecompInterface decompiler = new DecompInterface();
        decompiler.openProgram(currentProgram);
        try {
            for (String text : args) {
                Address address = toAddr(text);
                Function function = getFunctionAt(address);
                if (function == null) {
                    disassemble(address);
                    function = createFunction(address, null);
                }
                if (function == null) { println("No function at " + address); continue; }
                decompiler.flushCache();
                DecompileResults result = decompiler.decompileFunction(function, 30, monitor);
                println("===== " + address + " completed=" + result.decompileCompleted() + " =====");
                println(result.getDecompiledFunction() == null ? result.getErrorMessage() : result.getDecompiledFunction().getC());
            }
        } finally { decompiler.dispose(); }
    }
}

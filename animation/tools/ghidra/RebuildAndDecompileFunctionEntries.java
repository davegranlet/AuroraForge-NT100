// Read-only Aurora Ghidra helper. Rebuilds narrowly selected function bodies
// from known entrypoints in a disposable -readOnly project, then decompiles
// them. This is for targeted work when the imported project contains symbol
// stubs but intentionally lacks broad executable analysis.
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionIterator;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;

public class RebuildAndDecompileFunctionEntries extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length < 2) throw new IllegalArgumentException("Usage: <output-file> <entry-hex> [entry-hex ...]");
        PrintWriter out = new PrintWriter(new OutputStreamWriter(new FileOutputStream(args[0]), "UTF-8"));
        DecompInterface decompiler = new DecompInterface();
        decompiler.openProgram(currentProgram);
        try {
            for (int i = 1; i < args.length; i++) {
                Address entry = toAddr(args[i]);
                Function existing = currentProgram.getFunctionManager().getFunctionAt(entry);
                if (existing == null) {
                    out.println("\n===== entry=" + entry + " status=no-symbol-entry =====");
                    continue;
                }
                FunctionIterator following = currentProgram.getFunctionManager().getFunctions(entry.add(1), true);
                Address limit = following.hasNext() ? following.next().getEntryPoint().subtract(1) : entry.add(0x20000);
                if (limit.subtract(entry) > 0x20000) throw new IllegalArgumentException("Next function is too far from " + entry);
                out.println("\n===== entry=" + entry + " oldName=" + existing.getName(true) + " clearThrough=" + limit + " =====");
                currentProgram.getFunctionManager().removeFunction(entry);
                currentProgram.getListing().clearCodeUnits(entry, limit, false);
                disassemble(entry);
                Function rebuilt = currentProgram.getFunctionManager().getFunctionAt(entry);
                if (rebuilt == null) rebuilt = createFunction(entry, null);
                if (rebuilt == null) {
                    out.println("status=disassembly-produced-no-function");
                    continue;
                }
                out.println("name=" + rebuilt.getName(true) + " bodyBytes=" + rebuilt.getBody().getNumAddresses());
                DecompileResults result = decompiler.decompileFunction(rebuilt, 90, monitor);
                out.println(result.decompileCompleted() && result.getDecompiledFunction() != null
                    ? result.getDecompiledFunction().getC() : "DECOMPILE_ERROR " + result.getErrorMessage());
            }
        } finally {
            decompiler.dispose();
            out.close();
        }
    }
}

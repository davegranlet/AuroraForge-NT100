// Read-only Ghidra helper: resolve code locations to their containing functions,
// list calls to each function, and decompile them to a chosen output file.
// Run in headless mode with -readOnly so project annotations are discarded.
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionManager;
import ghidra.program.model.listing.FunctionIterator;
import ghidra.program.model.symbol.Reference;
import ghidra.program.model.symbol.ReferenceIterator;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.util.Set;
import java.util.TreeSet;

public class DecompileContainingFunctions extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length < 2) throw new IllegalArgumentException("Usage: <output-file> [--force-entry] <code-address> [code-address ...]");
        PrintWriter out = new PrintWriter(new OutputStreamWriter(new FileOutputStream(args[0]), "UTF-8"));
        FunctionManager functions = currentProgram.getFunctionManager();
        DecompInterface decompiler = new DecompInterface();
        decompiler.openProgram(currentProgram);
        try {
            boolean forceEntry = args[1].equals("--force-entry");
            int firstAddress = forceEntry ? 2 : 1;
            for (int i = firstAddress; i < args.length; i++) {
                Address address = toAddr(args[i]);
                Function function = forceEntry ? functions.getFunctionAt(address) : functions.getFunctionContaining(address);
                if (function == null && forceEntry) {
                    disassemble(address);
                    function = createFunction(address, null);
                }
                out.println("\n===== requested=" + address + " block=" + currentProgram.getMemory().getBlock(address) + " =====");
                if (function == null) {
                    out.println("NO_CONTAINING_FUNCTION");
                    Address low = address.subtract(0x1000);
                    Address high = address.add(0x1000);
                    FunctionIterator nearby = functions.getFunctions(low, true);
                    while (nearby.hasNext()) {
                        Function item = nearby.next();
                        if (item.getEntryPoint().compareTo(high) > 0) break;
                        out.println("NEARBY_FUNCTION " + item.getName(true) + " @ " + item.getEntryPoint());
                    }
                    continue;
                }
                out.println("FUNCTION " + function.getName(true) + " @ " + function.getEntryPoint());
                out.println("SIGNATURE " + function.getSignature());
                Set<String> callers = new TreeSet<>();
                ReferenceIterator references = currentProgram.getReferenceManager().getReferencesTo(function.getEntryPoint());
                while (references.hasNext()) {
                    Reference reference = references.next();
                    Function caller = functions.getFunctionContaining(reference.getFromAddress());
                    callers.add("from=" + reference.getFromAddress() + " type=" + reference.getReferenceType() + " function=" + (caller == null ? "<data>" : caller.getName(true) + " @ " + caller.getEntryPoint()));
                }
                out.println("CALLERS");
                for (String caller : callers) out.println(caller);
                decompiler.flushCache();
                DecompileResults result = decompiler.decompileFunction(function, 90, monitor);
                out.println(result.decompileCompleted() && result.getDecompiledFunction() != null ? result.getDecompiledFunction().getC() : "DECOMPILE_ERROR " + result.getErrorMessage());
            }
        } finally {
            decompiler.dispose();
            out.close();
        }
    }
}

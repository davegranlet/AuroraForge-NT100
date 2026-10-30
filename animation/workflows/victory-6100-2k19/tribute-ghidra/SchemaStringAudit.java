// @category AuroraForge
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Data;
import ghidra.program.model.listing.DataIterator;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionManager;
import ghidra.program.model.symbol.Reference;
import ghidra.program.model.symbol.ReferenceIterator;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

public class SchemaStringAudit extends GhidraScript {
    @Override
    public void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 1) throw new IllegalArgumentException("one output-file path required");
        try (PrintWriter out = new PrintWriter(new OutputStreamWriter(
                new FileOutputStream(args[0]), StandardCharsets.UTF_8))) {
            FunctionManager functions = currentProgram.getFunctionManager();
            DecompInterface decompiler = new DecompInterface();
            decompiler.toggleCCode(true);
            decompiler.toggleSyntaxTree(true);
            decompiler.setSimplificationStyle("decompile");
            decompiler.openProgram(currentProgram);

            DataIterator data = currentProgram.getListing().getDefinedData(true);
            while (data.hasNext() && !monitor.isCancelled()) {
                Data item = data.next();
                Object value = item.getValue();
                if (value == null) continue;
                String text = value.toString();
                String lower = text.toLowerCase();
                if (!(lower.contains("csadatabase") || lower.contains("cdefdatabase")
                        || lower.contains("victorylistdata") || lower.contains("schema_"))) continue;

                out.println("\n===== DATA " + item.getAddress() + " type=" + item.getDataType()
                        + " value=" + text.replace("\n", "\\n") + " =====");
                ReferenceIterator refs = currentProgram.getReferenceManager()
                        .getReferencesTo(item.getAddress());
                Map<Address, Function> callers = new LinkedHashMap<>();
                while (refs.hasNext()) {
                    Reference ref = refs.next();
                    Function caller = functions.getFunctionContaining(ref.getFromAddress());
                    if (caller != null) callers.put(caller.getEntryPoint(), caller);
                    out.println("REF " + ref.getFromAddress() + " from="
                            + (caller == null ? "<no-function>" : caller.getName() + " @ " + caller.getEntryPoint()));
                }
                for (Function caller : callers.values()) {
                    out.println("\n----- CALLER " + caller.getName() + " @ " + caller.getEntryPoint()
                            + " signature=" + caller.getSignature() + " -----");
                    DecompileResults result = decompiler.decompileFunction(caller, 180, monitor);
                    out.println(result.decompileCompleted()
                            ? result.getDecompiledFunction().getC()
                            : "DECOMPILE_ERROR " + result.getErrorMessage());
                }
                out.flush();
            }
            decompiler.dispose();
        }
    }
}

// @category Analysis
import ghidra.app.cmd.disassemble.DisassembleCommand;
import ghidra.app.cmd.function.CreateFunctionCmd;
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionManager;
import ghidra.program.model.symbol.Reference;
import ghidra.program.model.symbol.ReferenceIterator;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.util.Set;
import java.util.TreeSet;

public class DecompileFocusedAddresses extends GhidraScript {
    @Override
    public void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length < 2) throw new IllegalArgumentException("output path and one or more addresses required");

        PrintWriter out = new PrintWriter(new OutputStreamWriter(new FileOutputStream(args[0]), "UTF-8"));
        FunctionManager fm = currentProgram.getFunctionManager();
        DecompInterface decompiler = new DecompInterface();
        decompiler.openProgram(currentProgram);

        for (int i = 1; i < args.length; i++) {
            Address address = toAddr(args[i]);
            Function function = fm.getFunctionAt(address);
            if (function == null) {
                if (!new DisassembleCommand(address, null, true).applyTo(currentProgram, monitor)) {
                    out.println("DISASSEMBLY_FAILED " + address);
                    continue;
                }
                new CreateFunctionCmd(address).applyTo(currentProgram, monitor);
                function = fm.getFunctionAt(address);
            }
            if (function == null) {
                out.println("MISSING_FUNCTION " + address);
                continue;
            }

            out.println("\n===== " + function.getName() + " @ " + function.getEntryPoint() + " =====");
            out.println("SIGNATURE " + function.getSignature());
            out.println("CALLERS");
            ReferenceIterator refs = currentProgram.getReferenceManager().getReferencesTo(function.getEntryPoint());
            Set<String> callers = new TreeSet<>();
            while (refs.hasNext()) {
                Reference ref = refs.next();
                Function caller = fm.getFunctionContaining(ref.getFromAddress());
                if (caller != null) callers.add(caller.getName() + " @ " + caller.getEntryPoint() + " via " + ref.getFromAddress());
            }
            for (String caller : callers) out.println(caller);

            DecompileResults result = decompiler.decompileFunction(function, 120, monitor);
            out.println(result.decompileCompleted() ? result.getDecompiledFunction().getC() : "DECOMPILE_ERROR " + result.getErrorMessage());
        }

        decompiler.dispose();
        out.close();
    }
}

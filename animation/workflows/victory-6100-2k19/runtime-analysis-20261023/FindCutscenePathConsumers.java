// @category Analysis
import ghidra.app.decompiler.*;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.io.*;
import java.util.*;

public class FindCutscenePathConsumers extends GhidraScript {
    public void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length < 1) throw new IllegalArgumentException("output path required");
        PrintWriter out = new PrintWriter(new OutputStreamWriter(new FileOutputStream(args[0]), "UTF-8"));
        String[] terms = {"CaeAdvanced", "CutsceneAssembly", "CsaDatabase", "CdefDatabase", "VictoryListData"};
        FunctionManager fm = currentProgram.getFunctionManager();
        DecompInterface decompiler = new DecompInterface();
        decompiler.openProgram(currentProgram);
        Set<String> decompiled = new HashSet<>();
        DataIterator data = currentProgram.getListing().getDefinedData(true);
        while (data.hasNext() && !monitor.isCancelled()) {
            Data item = data.next();
            Object value = item.getValue();
            if (value == null) continue;
            String text = value.toString();
            for (String term : terms) {
                if (!text.contains(term)) continue;
                out.println("\nSTRING " + item.getAddress() + " " + text.replace('\n', ' '));
                ReferenceIterator refs = currentProgram.getReferenceManager().getReferencesTo(item.getAddress());
                int count = 0;
                while (refs.hasNext()) {
                    Reference ref = refs.next();
                    Function function = fm.getFunctionContaining(ref.getFromAddress());
                    out.println("XREF " + ref.getFromAddress() + " " + (function == null ? "<no function>" : function.getName() + " @ " + function.getEntryPoint()));
                    if (function != null && decompiled.add(function.getEntryPoint().toString())) {
                        DecompileResults result = decompiler.decompileFunction(function, 120, monitor);
                        out.println(result.decompileCompleted() ? result.getDecompiledFunction().getC() : "DECOMPILE_ERROR " + result.getErrorMessage());
                    }
                    if (++count >= 40) { out.println("XREF_LIMIT 40"); break; }
                }
                if (count == 0) out.println("NO_DIRECT_XREF");
            }
        }
        decompiler.dispose();
        out.close();
    }
}

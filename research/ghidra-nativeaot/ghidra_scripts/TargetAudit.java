// @category Analysis
import ghidra.app.decompiler.*;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.*;
import java.io.*;
import java.util.*;

public class TargetAudit extends GhidraScript {
    public void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length < 2) throw new IllegalArgumentException("output path and target addresses required");
        PrintWriter out = new PrintWriter(new OutputStreamWriter(new FileOutputStream(args[0]), "UTF-8"));
        FunctionManager fm = currentProgram.getFunctionManager();
        LinkedHashMap<Address, Function> targets = new LinkedHashMap<>();
        ArrayDeque<Function> queue = new ArrayDeque<>();
        HashMap<Address, Integer> depths = new HashMap<>();
        for (int i = 1; i < args.length; i++) {
            Address address = currentProgram.getAddressFactory().getDefaultAddressSpace().getAddress(args[i].replace("0x", ""));
            Function function = fm.getFunctionAt(address);
            if (function == null) function = fm.getFunctionContaining(address);
            if (function != null && !targets.containsKey(function.getEntryPoint())) {
                targets.put(function.getEntryPoint(), function); queue.add(function); depths.put(function.getEntryPoint(), 0);
            }
        }
        while (!queue.isEmpty() && !monitor.isCancelled()) {
            Function function = queue.remove(); int depth = depths.get(function.getEntryPoint());
            if (depth >= 2) continue;
            for (Function callee : function.getCalledFunctions(monitor)) {
                if (callee.isExternal() || targets.containsKey(callee.getEntryPoint())) continue;
                targets.put(callee.getEntryPoint(), callee); queue.add(callee); depths.put(callee.getEntryPoint(), depth + 1);
            }
        }
        DecompInterface decompiler = new DecompInterface();
        decompiler.toggleCCode(true); decompiler.toggleSyntaxTree(true); decompiler.setSimplificationStyle("decompile"); decompiler.openProgram(currentProgram);
        for (Function function : targets.values()) {
            out.println("\n===== " + function.getName() + " @ " + function.getEntryPoint() + " depth=" + depths.get(function.getEntryPoint()) + " =====");
            DecompileResults result = decompiler.decompileFunction(function, 180, monitor);
            out.println(result.decompileCompleted() ? result.getDecompiledFunction().getC() : "ERROR " + result.getErrorMessage()); out.flush();
        }
        decompiler.dispose(); out.close();
    }
}
